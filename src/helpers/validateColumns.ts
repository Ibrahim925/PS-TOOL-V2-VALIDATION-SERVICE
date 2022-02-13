import { connection } from "../db/connection";
import { Rule } from "../db/entity/Rule";
import { Errors, Rules } from "../types";

const validateColumns = async (
	csvJSON: { [key: string]: any }[],
	rules: Rule[]
) => {
	console.log("Validating columns");

	const expectedFields = rules.map((rule) => {
		return rule.ruleField;
	});

	const expectedNumberOfFields = expectedFields.length;

	const fields = Object.keys(csvJSON[0]);

	console.log("-------------------------------", fields);
	console.log("-------------------------------", expectedFields);

	if (fields.length !== expectedNumberOfFields) {
		return false;
	}

	for (let i = 0; i < expectedNumberOfFields; i++) {
		if (fields[i] !== expectedFields[i]) return false;
	}

	return true;
};

export default validateColumns;
