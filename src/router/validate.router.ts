import { Router } from "express";
import { validate_data } from "../controller/validate.controller";

const router: Router = Router();

router.post("/", validate_data);

export default router;
