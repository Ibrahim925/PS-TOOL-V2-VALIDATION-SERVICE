import { CustomRequest, Errors } from "../types";
import { Response } from "express";
import { CSVToJSON, JSONtoCSV } from "../helpers/csv";
import validateColumns from "../helpers/validateColumns";
import validateData from "../helpers/validateData";
import { Project } from "../db/entity/Project";
import { connection } from "../db/connection";
import { Rule } from "../db/entity/Rule";
import { createNotification } from "../helpers/notificationHandler";
import { getDay } from "../helpers/getNow";
import { ObjectData } from "../db/entity/ObjectData";

interface ValidateDataBody {
	csvText: string;
	projectName: string;
	objectName: string;
}

export const validate_data = async (
	req: CustomRequest<{}, ValidateDataBody, {}>,
	res: Response
) => {
	const { csvText, projectName, objectName } = req.body;
	const { projectVersion } = await Project.findOne({
		select: ["projectVersion"],
		where: {
			projectName,
		},
	});

	console.log(csvText);

	const rules = await Rule.find({
		where: {
			ruleProject: projectName,
			ruleObject: objectName,
		},
	});

	// Check if all parent objects have been uploaded already
	for await (const rule of rules) {
		if (rule.ruleDependency) {
			const [parentObject, parentField] = rule.ruleDependency.split(".");

			const foundData = await ObjectData.findOne({
				where: {
					objectProject: projectName,
					objectName: parentObject,
				},
			});

			if (!foundData) {
				return res.json({ missingDependencies: [parentObject] });
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

		return res.json({
			payload: { errors },
			incorrectFields: true,
		});
	}

	// Validate data
	const { outputCsvJSON, errorCount, exportCsvJSON } = await validateData(
		csvJSON,
		rules,
		projectVersion
	);

	// Create CSV with errors
	if (errorCount) {
		const csvText = await JSONtoCSV(outputCsvJSON);

		const day = getDay();

		// Create notification
		await createNotification(
			`${projectName} uploaded ${objectName} with ${errorCount} error${
				errorCount > 1 ? "s" : ""
			}`,
			projectName,
			objectName
		);

		// Sends CSV data with file path. The actual file will be downloaded to the client on the frontend
		return res.json({
			payload: {
				csvText,
				path: `${rules[0].ruleObject} Output - ${day}.csv`,
			},
			errorCount,
		});
	} else {
		const csvText = await JSONtoCSV(exportCsvJSON);

		await createNotification(
			`${projectName} successfully uploaded ${objectName} with no errors!`,
			projectName,
			objectName
		);

		await ObjectData.delete({ objectName, objectProject: projectName });

		for (let i = 0, len = exportCsvJSON.length; i < len; i++) {
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

		return res.json({
			success: true,
			payload: {
				csvText,
				path: `${rules[0].ruleObject}.csv`,
			},
		});
	}
};
