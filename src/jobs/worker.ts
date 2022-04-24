import Queue from "bull";
import "dotenv/config";
import { CSVToJSON, JSONtoCSV } from "../helpers/csv";
import { createNotification } from "../helpers/notificationHandler";
import validateColumns from "../helpers/validateColumns";
import { Errors, JobData } from "../types";
import { Error } from "../db/entity/Error";
import { connection } from "../db/connection";
import { getDay } from "../helpers/getNow";
import { Project } from "../db/entity/Project";
import { Rule } from "../db/entity/Rule";
import validateData from "../helpers/validateData";
import AWS from "aws-sdk";

AWS.config.update({
	region: "us-east-2",
	credentials: {
		accessKeyId: process.env.IAM_ACCESS_KEY,
		secretAccessKey: process.env.IAM_SECRET_KEY,
	},
});

const queue = new Queue<JobData>("validation", process.env.REDIS_URL);

queue.process(async (job) => {
	const { objectName, projectName } = job.data;

	const s3 = new AWS.S3();

	// Get CSV data to validate from S3 bucket
	const params = {
		Bucket: "logisense-csv-data",
		Key: `VALIDATE/${projectName}-${objectName}.csv`,
	};

	let csvText = "";

	try {
		const csv = await s3.getObject(params).promise();

		csvText = csv.Body.toString();
	} catch (err) {
		console.log("ERROR IN GET OBJECT BOB", err);
	}

	try {
		await s3.deleteObject(params).promise();
	} catch (err) {
		console.log(err, "ERROR IN PHIL");
	}

	// Extract project version
	const { projectVersion } = await Project.findOne({
		select: ["projectVersion"],
		where: {
			projectName,
		},
	});

	// Get all rules to validate that all parent objects have been uploaded
	const allRules = await Rule.find({
		where: {
			ruleProject: projectName,
		},
	});

	const rules = allRules.filter((rule) => rule.ruleObject === objectName);

	// Check if all parent objects have been uploaded already
	const data = await s3
		.listObjectsV2({ Bucket: "logisense-csv-data", Prefix: "PARENT/" })
		.promise();

	const allObjects = await Promise.all(
		data.Contents.map(({ Key }) => {
			const keyWithoutFolderName = Key.split("/")[1];
			const splitProjectAndObject = keyWithoutFolderName.split("-");
			splitProjectAndObject[1] = splitProjectAndObject[1].split(".")[0];

			return {
				objectProject: splitProjectAndObject[0],
				objectName: splitProjectAndObject[1],
			};
		})
			.filter((key) => key.objectProject === projectName)
			.map(async (object) => {
				let parentCsvText;

				const params = {
					Bucket: "logisense-csv-data",
					Key: `PARENT/${object.objectProject}-${object.objectName}.csv`,
				};

				try {
					const parentData = await s3.getObject(params).promise();

					parentCsvText = parentData.Body.toString();
				} catch (err) {
					console.log("BOBOBOBOOBOBOBOBOB", err);
				}

				const parentCsvJson = await CSVToJSON(parentCsvText, rules, ",", false);

				return { parentCsvJson, ...object };
			})
	);

	for await (const rule of rules) {
		if (rule.ruleDependency.length) {
			const [parentObject, parentField] = rule.ruleDependency.split(".");

			const objects = allObjects.filter(
				(object) => object.objectName === parentObject
			);

			if (!objects.length) {
				return { missingDependencies: [parentObject] };
			}
		}
	}

	const errors: Errors = [];

	console.log("Converting CSV to JSON");
	const csvJSON = await CSVToJSON(csvText, rules);

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

	// Validate data
	console.log("Beginning data validation");

	const { outputCsvJSON, errorCount, exportCsvJSON } = await validateData(
		csvJSON,
		rules,
		projectVersion,
		allObjects,
		job
	);

	console.log("COMPLETE VALIDATION");

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
			`${projectName} uploaded ${objectName} with ${rows} error${
				rows > 1 ? "s" : ""
			}`,
			projectName,
			objectName
		);

		// Add output to bucket
		const path = `${projectName} - ${rules[0].ruleObject} Output - ${day}.csv`;

		const params = {
			Bucket: "logisense-csv-data",
			Key: `OUTPUT/${path}`,
			Body: csvText,
		};

		await s3.putObject(params).promise();

		// Sends CSV data with file path. The actual file will be downloaded to the client on the frontend
		return {
			payload: {
				path,
			},
			errorCount: rows,
		};
	} else {
		const csvText = await JSONtoCSV(exportCsvJSON);

		createNotification(
			`${projectName} successfully uploaded ${objectName} with no errors!`,
			projectName,
			objectName
		);

		if (
			allRules
				.map((rule) => rule.ruleDependency.split(".")[0])
				.includes(objectName)
		) {
			// Persist parent data in S3 bucket
			const params = {
				Bucket: "logisense-csv-data",
				Key: `PARENT/${projectName}-${objectName}.csv`,
				Body: csvText,
			};

			await s3.putObject(params).promise();
		}

		// Add output to bucket
		const path = `${projectName} - ${rules[0].ruleObject}.csv`;

		const params = {
			Bucket: "logisense-csv-data",
			Key: `OUTPUT/${path}`,
			Body: csvText,
		};

		await s3.putObject(params).promise();

		return {
			success: true,
			payload: {
				path,
			},
		};
	}
});
