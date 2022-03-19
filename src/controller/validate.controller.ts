import { CustomRequest, JobData } from "../types";
import { Response } from "express";
import validateNewCSV from "../jobs/producer";
import Queue from "bull";
import "dotenv/config";

const queue = new Queue<JobData>("validation", process.env.REDIS_URL);

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

interface GetJobStatusParams {
	jobId: number;
}

export const get_job_status = async (
	req: CustomRequest<GetJobStatusParams, {}, {}>,
	res: Response
) => {
	const { jobId } = req.params;

	console.log(jobId, queue);

	const job = await queue.getJob(jobId);

	const isJobCompleted = await job.isCompleted();

	if (!isJobCompleted) {
		const jobProgress = await job.progress();

		res.json({ jobProgress });
	} else {
		const data = await job.finished();

		res.json(data);
	}
};
