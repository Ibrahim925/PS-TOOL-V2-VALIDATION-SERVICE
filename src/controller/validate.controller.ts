import { CustomRequest } from "../types";
import { Response } from "express";
import validateNewCSV from "../jobs/producer";

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

	const job = await validateNewCSV({
		csvText,
		projectName,
		objectName,
	});

	res.json(job.id);
};
