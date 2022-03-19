import Queue from "bull";
import "dotenv/config";
import { JobData } from "../types";

const queue = new Queue<JobData>("validation", process.env.REDIS_URL);

queue.process(async (job) => {
	console.log(job, "--------------------------------JFLKDJKLDSJFKLDFJKSDLF");
});
