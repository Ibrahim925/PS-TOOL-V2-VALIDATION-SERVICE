import { Rule } from "../db/entity/Rule";

const validateColumns = async (
	csvJSON: { [key: string]: any }[],
	rules: Rule[]
) => {
	console.log("Validating columns");

	const expectedFields = rules.map((rule) => {
		return `${rule.ruleField}~${rule.ruleFieldOccurrence}`;
	});

	const expectedNumberOfFields = expectedFields.length;

	const fields = Object.keys(csvJSON[0]);

	if (fields.length !== expectedNumberOfFields) {
		return false;
	}

	for (let i = 0; i < expectedNumberOfFields; i++) {
		if (fields[i] !== expectedFields[i]) return false;
	}

	return true;
};

export default validateColumns;
