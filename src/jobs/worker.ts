import Queue from "bull";
import "dotenv/config";
import { JobData } from "../types";

const queue = new Queue<JobData>("validation", process.env.REDIS_URL);

console.log("WORKER RUNNING");

console.log(queue, "FJLSLFDSK");

queue.process(async (job) => {
	console.log(job, "--------------------------------JFLKDJKLDSJFKLDFJKSDLF");
});
