import { Rule } from "../db/entity/Rule";
import { CustomRequest } from "../types";
import { Response } from "express";
import { CSVToJSON } from "../helpers/csv";

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

	console.log("Converting CSV to JSON");
	const csvJSON = await CSVToJSON(csvText);

	// Validate columns

	// Validate data

	res.json("--->DATA GOES HEREEEE<-----");
};
