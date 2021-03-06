import Queue from "bull";
import "dotenv/config";
import { JobData } from "../types";

const queue = new Queue<JobData>("validation", process.env.REDIS_URL);

const validateNewCSV = async (data: JobData) => {
	const job = await queue.add(data);

	return job;
};

export default validateNewCSV;
