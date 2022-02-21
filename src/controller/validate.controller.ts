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
	const [{ projectVersion }] = await connection.getRepository(Project).find({
		select: ["projectVersion"],
		take: 1,
		where: {
			projectName,
		},
	});

	console.log(csvText);

	const rules = await connection.getRepository(Rule).find({
		where: {
			ruleProject: projectName,
			ruleObject: objectName,
		},
	});

	const errors: Errors = [];

	console.log("Converting CSV to JSON");
	const csvJSON = await CSVToJSON(csvText);

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
			errorCount: 1,
			payload: { errors, incorrectFields: true },
		});
	}

	// Validate data
	const { outputCsvJSON, errorCount } = await validateData(
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
			csvText,
			path: `${rules[0].ruleObject} Output - ${day}.csv`,
			errorCount,
		});
	} else {
		await createNotification(
			`${projectName} successfully uploaded ${objectName} with no errors!`,
			projectName,
			objectName
		);
	}

	res.json("SUCCESS MESSAGE GOES HERE");
};
