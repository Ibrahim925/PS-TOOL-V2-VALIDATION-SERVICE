import { connection } from "../db/connection";
import { Rule } from "../db/entity/Rule";
import { Errors } from "../types";

const validateColumns = async (
	csvJSON: { [key: string]: any }[],
	projectName: string,
	objectName: string
) => {
	console.log("Validating columns");
	console.log(projectName, objectName);
	const errors: Errors = [];
	// Get rules
	const rules = await connection
		.getRepository(Rule)
		.find({ where: { ruleProject: projectName, ruleObject: objectName } });

	const expectedFields = rules.map((rule) => {
		return rule.ruleField;
	});

	console.log(rules);
	console.log(expectedFields);

	const expectedNumberOfFields = expectedFields.length;

	const fields = Object.keys(csvJSON[0]);

	if (fields.length !== expectedNumberOfFields) {
		errors.push({ message: "Please enter a valid rules spreadsheet!" });
	}

	for (let i = 0; i < expectedNumberOfFields; i++) {
		if (fields[i] !== expectedFields[i]) {
			errors.push({
				message: "Please enter a valid rules spreadsheet!",
			});
		}
	}

	return errors.length === 0;
};

export default validateColumns;
