import { DataTypes, Errors, Versions } from "../types";
import { Rule } from "../db/entity/Rule";

// TODO:
// set up dependency checks
// change put each error on a different line

const validateData = async (
	csvJSON: { [key: string]: any }[],
	rules: Rule[],
	projectVersion: Versions
) => {
	const fields: string[] = Object.keys(csvJSON[0]);
	const outputCSV = [];
	let errorCount = 0;

	for (let i = 0, length = csvJSON.length; i < length; i++) {
		// Clean data
		const newRow = cleanData(csvJSON[i], projectVersion, fields);
		const rowNumber = i + 1;
		csvJSON[i] = newRow;
		const row = newRow;

		// Validate dependency

		// Validate existence
		const existenceErrors = validateDataExistence(row, rules, fields);
		if (existenceErrors.errorCount) {
			for (const error of existenceErrors.payload.errors) {
				outputCSV.push({
					...csvJSON[i],
					Error: error.message,
					"Row Number": rowNumber,
				});
			}

			errorCount += existenceErrors.errorCount;
		}

		// Validate Datatype
		const dataTypeErrors = validateDataType(row, rules, fields);
		if (dataTypeErrors.errorCount) {
			for (const error of dataTypeErrors.payload.errors) {
				outputCSV.push({
					...csvJSON[i],
					Error: error.message,
					"Row Number": rowNumber,
				});
			}

			errorCount += dataTypeErrors.errorCount;
		}
	}

	return { outputCsvJSON: outputCSV, exportCsvJSON: csvJSON, errorCount };
};

// Clean (remove whitespace, remove special characters -- ONLY FOR V9)
const cleanData = (row: any, projectVersion: Versions, fields: string[]) => {
	for (let i = 0, len = fields.length; i < len; i++) {
		const dataType = typeof row[fields[i]];
		if (dataType === "string") {
			row[fields[i]] = row[fields[i]].trim();

			if (projectVersion === "V9") {
				let newStr = "";
				for (let j = 0, len = row[fields[i]].length; j < len; j++) {
					const char: string = row[fields[i]][j];

					switch (char) {
						case "&":
							newStr += "&amp;";
							break;
						case "<":
							newStr += "&lt;";
							break;
						case ">":
							newStr += "&gt;";
							break;

						case '"':
							newStr += "&quot;";
							break;
						case "'":
							newStr += "&apos;";
							break;
						case "/":
							newStr += " ";
							break;
						default:
							newStr += char;
							break;
					}
				}

				row[fields[i]] = newStr;
			}
		}
	}

	return row;
};

// Validate datatype
const validateDateFormat = (date: string) => {
	const dateArray = date.split("/");
	if (dateArray.length !== 3) return false;

	if (Number(date[0]) > 12 || Number(date[1]) > 31 || Number(date[2]) < 2000)
		return false;

	return true;
};

const validateDataType = (row, rules: Rule[], fields: string[]) => {
	const errors: Errors = [];

	for (const field of fields) {
		const [rule] = rules.filter((rule) => rule.ruleField === field);
		const ruleTypeArray = rule.ruleDataType.split("(");
		let type = ruleTypeArray[0];
		let length;
		if (ruleTypeArray[0] === "STRING" || ruleTypeArray[0] === "NUMBER") {
			length = Number(ruleTypeArray[1].split(")")[0]);
		}
		const data = row[field];
		const dataType = typeof data;

		switch (type) {
			case DataTypes.Boolean:
				if (dataType !== "boolean") {
					errors.push({
						message: `${field}: Expected ${DataTypes.Boolean}, got ${dataType}`,
					});
					continue;
				}
				break;
			case DataTypes.Char:
				if (dataType !== "string" && dataType.length !== 1) {
					errors.push({
						message: `${field}: Expected ${DataTypes.Char}, got ${dataType}`,
					});
					continue;
				}
				break;
			case DataTypes.Integer:
				if (dataType !== "number") {
					errors.push({
						message: `${field}: Expected ${DataTypes.Integer}, got ${dataType}`,
					});
					continue;
				}
				if (data > length) {
					errors.push({
						message: `${field}: Integer must be less than or equal to ${length}`,
					});
				}
				break;
			case DataTypes.String:
				if (dataType !== "string") {
					errors.push({
						message: `${field}: Expected ${DataTypes.String}, got ${dataType}`,
					});
					continue;
				}
				if (data.length > length) {
					errors.push({
						message: `${field}: String must be less than ${
							length + 1
						} characters long`,
					});
				}
				break;
			case DataTypes.DateTime:
				const isDateFormat = validateDateFormat(data);
				if (!isDateFormat) {
					errors.push({
						message: `${field}: Please enter the date in MM/DD/YYYY format!`,
					});
				}
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
		const data = row[field];

		if (!data && rule.ruleRequired)
			errors.push({ message: `${field}: Expected a value in column ${field}` });
	}

	return { errorCount: errors.length, payload: { errors } };
};

// Validate dependency

export default validateData;
