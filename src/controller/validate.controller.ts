import { Rule } from "../db/entity/Rule";
import { CustomRequest, Errors } from "../types";
import { Response } from "express";
import { CSVToJSON } from "../helpers/csv";
import validateColumns from "../helpers/validateColumns";

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
	const errors: Errors = [];

	console.log("Converting CSV to JSON");
	const csvJSON = await CSVToJSON(csvText);

	// Validate columns
	const isColumnsValid = await validateColumns(
		csvJSON,
		projectName,
		objectName
	);

	if (!isColumnsValid) {
		errors.push({ message: "Please enter a sheet with the correct fields" });
		return res.json({ errorCount: 1, payload: { errors } });
	}

	// Validate data

	res.json("--->DATA GOES HEREEEE<-----");
};
