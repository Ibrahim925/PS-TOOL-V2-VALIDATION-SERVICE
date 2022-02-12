import { CustomRequest, Errors } from "../types";
import { Response } from "express";
import { CSVToJSON } from "../helpers/csv";
import validateColumns from "../helpers/validateColumns";
import validateData from "../helpers/validateData";
import { Project } from "../db/entity/Project";
import { connection } from "../db/connection";
import { Rule } from "../db/entity/Rule";

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
		return res.json({ errorCount: 1, payload: { errors } });
	}

	// Validate data
	const validateDataOutput = await validateData(csvJSON, rules, projectVersion);

	res.json("--->DATA GOES HEREEEE<-----");
};
