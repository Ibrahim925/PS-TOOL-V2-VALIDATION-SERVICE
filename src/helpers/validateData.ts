import { DataTypes, Errors, Versions } from "../types";
import { Rule } from "../db/entity/Rule";

const validateData = async (
	csvJSON: { [key: string]: any }[],
	rules: Rule[],
	projectVersion: Versions
) => {
	const fields: string[] = Object.keys(csvJSON[0]);

	const errors = {
		dataTypeErrors: [],
		existenceErrors: [],
		dependencyErrors: [],
	};

	for (let i = 0, length = csvJSON.length; i < length; i++) {
		const row = csvJSON[i];

		// Validate dependency

		// Validate existence
		const existenceErrors = validateDataExistence(row, rules, fields);
		if (existenceErrors.errorCount) {
			errors.existenceErrors.push(...existenceErrors.payload.errors);
		}

		// Validate Datatype
		const dataTypeErrors = validateDataType(row, rules, fields);
		if (dataTypeErrors.errorCount) {
			errors.dataTypeErrors.push(...dataTypeErrors.payload.errors);
		}
	}
};

// Clean (remove whitespace, remove special characters -- ONLY FOR V9)

// Validate datatype
const validateDataType = (row, rules: Rule[], fields: string[]) => {
	const errors: Errors = [];

	for (const field of fields) {
		const [rule] = rules.filter((rule) => rule.ruleField === field);
		const data = rule[field];
		const dataType = typeof data;

		switch (rule.ruleDataType) {
			case DataTypes.Boolean:
				if (dataType !== "boolean")
					errors.push({
						message: `Expected ${DataTypes.Boolean}, got ${dataType}`,
					});
				break;
			case DataTypes.Char:
				if (dataType !== "string" && dataType.length !== 1)
					errors.push({
						message: `Expected ${DataTypes.Char}, got ${dataType}`,
					});
				break;
			case DataTypes.Integer:
				if (dataType !== "number")
					errors.push({
						message: `Expected ${DataTypes.Integer}, got ${dataType}`,
					});
				break;
			case DataTypes.String:
				if (dataType !== "string")
					errors.push({
						message: `Expected ${DataTypes.String}, got ${dataType}`,
					});
				break;
			case DataTypes.DateTime:
				// TODO: IMPLEMENT DATETIME IMPLEMENTATION
				break;
			default:
				break;
		}
	}

	return { errorCount: errors.length, payload: { errors } };
};

// Validate existence
const validateDataExistence = (row, rules: Rule[], fields: string[]) => {
	const errors: Errors = [];

	for (const field of fields) {
		const [rule] = rules.filter((rule) => rule.ruleField === field);
		const data = rule[field];

		if (!data && rule.ruleRequired)
			errors.push({ message: `Expected a value in column ${field}` });
	}

	return { errorCount: errors.length, payload: { errors } };
};

// Validate dependency

export default validateData;
