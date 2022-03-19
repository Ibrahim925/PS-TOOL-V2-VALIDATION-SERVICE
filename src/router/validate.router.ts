import { Router } from "express";
import {
	get_job_status,
	validate_data,
} from "../controller/validate.controller";

const router: Router = Router();

router.post("/", validate_data);

router.get("/:jobId", get_job_status);

export default router;
