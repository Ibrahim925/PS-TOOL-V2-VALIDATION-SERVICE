import { connection } from "../db/connection";
import { Rule } from "../db/entity/Rule";
import { Errors } from "../types";

const validateColumns = async (
	csvJSON: { [key: string]: any }[],
	projectName: string,
	objectName: string
) => {
	console.log("Validating columns");

	// Get rules
	const rules = await connection
		.getRepository(Rule)
		.find({ where: { ruleProject: projectName, ruleObject: objectName } });

	const expectedFields = rules.map((rule) => {
		return rule.ruleField;
	});

	const expectedNumberOfFields = expectedFields.length;

	const fields = Object.keys(csvJSON[0]);

	if (fields.length !== expectedNumberOfFields) {
		return false;
	}

	for (let i = 0; i < expectedNumberOfFields; i++) {
		return false;
	}

	return true;
};

export default validateColumns;
