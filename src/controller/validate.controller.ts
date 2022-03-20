import { CustomRequest, JobData } from "../types";
import { Response } from "express";
import validateNewCSV from "../jobs/producer";
import Queue from "bull";
import AWS, { S3 } from "aws-sdk";
import "dotenv/config";

AWS.config.update({
	region: "us-east-2",
	credentials: {
		accessKeyId: process.env.IAM_ACCESS_KEY,
		secretAccessKey: process.env.IAM_SECRET_KEY,
	},
});

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

	const s3 = new AWS.S3();
	const params = {
		Bucket: "logisense-csv-data",
		Key: `VALIDATE/${projectName}-${objectName}.csv`,
		Body: csvText,
	};

	await s3
		.putObject(params, function (err, data) {
			if (err) {
				console.log("Error at uploadCSVFileOnS3Bucket function");
			} else {
				console.log("File uploaded Successfully");
			}
		})
		.promise();

	const job = await validateNewCSV({
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

	const job = await queue.getJob(jobId);

	if (!job) return res.json({ jobProgress: 40 });

	const isJobCompleted = await job.isCompleted();

	if (!isJobCompleted) {
		const jobProgress = await job.progress();

		res.json({ jobProgress });
	} else {
		const data = await job.finished();

		const s3 = new S3();

		job.remove();

		const params = {
			Bucket: "logisense-csv-data",
			Key: "OUTPUT/" + data.payload.path,
		};

		const csvText = await s3.getObject(params).promise();

		data.payload.csvText = csvText.Body.toString();

		await s3.deleteObject(params).promise();

		res.json(data);
	}
};
