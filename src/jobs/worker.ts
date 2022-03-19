import Queue from "bull";
import "dotenv/config";
import { CSVToJSON, JSONtoCSV } from "../helpers/csv";
import { createNotification } from "../helpers/notificationHandler";
import validateColumns from "../helpers/validateColumns";
import { Errors, JobData } from "../types";
import { Error } from "../db/entity/Error";
import { connection } from "../db/connection";
import { getDay } from "../helpers/getNow";
import { ObjectData } from "../db/entity/ObjectData";
import { Project } from "../db/entity/Project";
import { Rule } from "../db/entity/Rule";
import validateData from "../helpers/validateData";

const queue = new Queue<JobData>("validation", process.env.REDIS_URL);

queue.process(async (job) => {
	const { csvText, objectName, projectName } = job.data;

	const { projectVersion } = await Project.findOne({
		select: ["projectVersion"],
		where: {
			projectName,
		},
	});

	const allRules = await Rule.find({
		where: {
			ruleProject: projectName,
		},
	});

	const rules = allRules.filter((rule) => rule.ruleObject === objectName);

	// Check if all parent objects have been uploaded already
	const foundData = await ObjectData.find({
		where: {
			objectProject: projectName,
		},
	});

	for await (const rule of rules) {
		if (rule.ruleDependency.length) {
			const [parentObject, parentField] = rule.ruleDependency.split(".");

			const data = foundData.filter((data) => data.objectName === parentObject);

			if (!data.length) {
				return { missingDependencies: [parentObject] };
			}
		}
	}

	const errors: Errors = [];

	console.log("Converting CSV to JSON");
	const csvJSON = await CSVToJSON(csvText, rules);
	job.progress(15);

	// Validate columns
	const isColumnsValid = await validateColumns(csvJSON, rules);

	if (!isColumnsValid) {
		errors.push({ message: "Please enter a sheet with the correct fields" });

		await createNotification(
			`${projectName} uploaded ${objectName} with incorrect fields`,
			projectName,
			objectName
		);

		return {
			payload: { errors },
			incorrectFields: true,
		};
	}

	job.progress(30);

	// Validate data
	const { outputCsvJSON, errorCount, exportCsvJSON } = await validateData(
		csvJSON,
		rules,
		projectVersion,
		foundData
	);

	job.progress(80);

	// Extract error counts
	const { dataType, dependency, existence, rows } = errorCount;

	const totalErrors = dataType + dependency + existence;

	// Insert validation record:
	// 1. Get current run number from previous run number
	let prevRun: Error | { errorRun: number } =
		await Error.getRepository().findOne({
			where: { errorProject: projectName, errorObject: objectName },
			order: { id: "DESC" },
		});

	if (!prevRun) prevRun = { errorRun: 0 }; // Handle no previous runs

	const currentRun = prevRun.errorRun + 1;

	// 2. Insert record
	const newError = new Error();

	newError.errorCount = rows;
	newError.errorDataType = dataType;
	newError.errorDependency = dependency;
	newError.errorExistence = existence;
	newError.errorFree = csvJSON.length - rows;
	newError.errorObject = objectName;
	newError.errorProject = projectName;
	newError.errorRun = currentRun;

	connection.manager.save(newError);

	// Create CSV with errors
	if (totalErrors) {
		const csvText = await JSONtoCSV(outputCsvJSON);

		const day = getDay();

		// Create notification
		await createNotification(
			`${projectName} uploaded ${objectName} with ${totalErrors} error${
				totalErrors > 1 ? "s" : ""
			}`,
			projectName,
			objectName
		);

		job.progress(99);

		// Sends CSV data with file path. The actual file will be downloaded to the client on the frontend
		return {
			payload: {
				csvText,
				path: `${rules[0].ruleObject} Output - ${day}.csv`,
			},
			errorCount: totalErrors,
		};
	} else {
		const csvText = await JSONtoCSV(exportCsvJSON);

		createNotification(
			`${projectName} successfully uploaded ${objectName} with no errors!`,
			projectName,
			objectName
		);

		await ObjectData.delete({ objectName, objectProject: projectName });

		if (
			allRules
				.map((rule) => rule.ruleDependency.split(".")[0])
				.includes(objectName)
		) {
			// for (let i = 0, len = exportCsvJSON.length; i < len; i++) {
			for (let i = 0, len = exportCsvJSON.length; i < 1; i++) {
				const row = exportCsvJSON[i];

				const fields = Object.keys(row);

				for await (const field of fields) {
					const persistData = new ObjectData();

					persistData.objectField = field.split("~")[0];
					persistData.objectName = objectName;
					persistData.objectProject = projectName;
					persistData.objectTemp = false;
					persistData.objectValue = row[field];
					persistData.objectRow = i + 2;

					await connection.manager.save(persistData);
				}
			}
		}

		job.progress(99);

		return {
			success: true,
			payload: {
				csvText,
				path: `${rules[0].ruleObject}.csv`,
			},
		};
	}
});
