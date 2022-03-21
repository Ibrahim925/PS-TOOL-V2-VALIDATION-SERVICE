import { Cases, DataTypes, Errors, JobData, Versions } from "../types";
import { Rule } from "../db/entity/Rule";
import Queue from "bull";

interface Field {
	field: string;
	occurrence: number;
	fullField: string;
}
[];

const validateData = async (
	csvJSON: any[],
	rules: Rule[],
	projectVersion: Versions,
	allObjects: any,
	job: Queue.Job<JobData>
) => {
	const fields: Field[] = Object.keys(csvJSON[0]).map((fullField) => {
		const arr = fullField.split("~");
		const field = arr[0];
		const occurrence = Number(arr[1]);

		return {
			field,
			occurrence,
			fullField,
		};
	});

	const outputCSV = [];

	let errorCount = {
		dependency: 0, // 001
		existence: 0, // 002
		dataType: 0, // 003
		rows: 0,
	};

	for (let i = 0, length = csvJSON.length; i < length; i++) {
		// Clean data
		const newRow = cleanData(csvJSON[i], projectVersion, fields, rules);
		const rowNumber = i + 2;
		csvJSON[i] = newRow;
		const row = newRow;
		let rowHasErrors = false; // For counting the number of errored rows

		// Validate dependency
		const dependencyErrors = await validateDependencies(
			row,
			rules,
			fields,
			allObjects
		);

		if (dependencyErrors.errorCount) {
			for (const error of dependencyErrors.payload.errors) {
				outputCSV.push({
					...csvJSON[i],
					Error: error.message,
					"Row Number": rowNumber,
					"Error Type": "DEPENDENCY",
				});
			}

			errorCount.dependency = dependencyErrors.errorCount;
			rowHasErrors = true;
		}

		// Validate existence
		const existenceErrors = validateDataExistence(row, rules, fields);
		if (existenceErrors.errorCount) {
			for (const error of existenceErrors.payload.errors) {
				outputCSV.push({
					...csvJSON[i],
					Error: error.message,
					"Row Number": rowNumber,
					"Error Type": "MISSING DATA",
				});
			}

			errorCount.existence += existenceErrors.errorCount;
			rowHasErrors = true;
		}

		// Validate Datatype
		const dataTypeErrors = validateDataType(row, rules, fields);
		if (dataTypeErrors.errorCount) {
			for (const error of dataTypeErrors.payload.errors) {
				outputCSV.push({
					...csvJSON[i],
					Error: error.message,
					"Row Number": rowNumber,
					"Error Type": "DATA TYPE",
				});
			}

			errorCount.dataType += dataTypeErrors.errorCount;
			rowHasErrors = true;
		}

		if (rowHasErrors) errorCount.rows++;

		job.progress((i / length) * 100);
	}

	return { outputCsvJSON: outputCSV, exportCsvJSON: csvJSON, errorCount };
};

// Clean (remove whitespace, remove special characters -- ONLY FOR V9)
const cleanData = (
	row: any,
	projectVersion: Versions,
	fields: Field[],
	rules: Rule[]
) => {
	for (let i = 0, len = fields.length; i < len; i++) {
		let { field, occurrence, fullField } = fields[i];

		const [rule] = rules.filter(
			(rule) =>
				rule.ruleField === field && rule.ruleFieldOccurrence === occurrence
		);

		const dataType = typeof row[fullField];
		if (dataType === "string") {
			row[fullField] = row[fullField].trim();

			if (projectVersion === "V9") {
				let newStr = "";
				for (let j = 0, len = row[fullField].length; j < len; j++) {
					const char: string = row[fullField][j];

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

				row[fullField] = newStr;

				switch (rule.ruleCase) {
					case Cases.Camel:
						row[fullField] = row.fullField
							.split(" ")
							.map((word: string) => word[0].toUpperCase() + word.slice(1))
							.join("");
						break;
					case Cases.Lower:
						row[fullField] = row[fullField].toLowerCase();
						break;
					case Cases.Snake:
						row[fullField] = row[fullField].toLowerCase().split(" ").join("_");
						break;
					case Cases.Upper:
						row[fullField] = row[fullField].toUpperCase();
						break;
				}
			}
		}
	}

	return row;
};

// Validate dependencies
const validateDependencies = async (
	row,
	rules: Rule[],
	fields: Field[],
	allObjects: any
) => {
	const errors: Errors = [];

	for (const { field, occurrence, fullField } of fields) {
		const [rule] = rules.filter(
			(rule) =>
				rule.ruleField === field && rule.ruleFieldOccurrence === occurrence
		);

		const data = row[fullField].toString();

		if (!rule.ruleDependency) continue;

		const arr = rule.ruleDependency.split(".");
		const parentObject = arr[0];
		const parentField = arr[1];

		const parentFieldData = allObjects
			.filter((object) => object.objectName === parentObject)[0]
			.parentCsvJson.map((row) => row[parentField]);

		if (!parentFieldData.includes(data))
			errors.push({
				message: `${field}: "${data}" does not exist in the ${parentObject} object`,
			});
	}

	return { errorCount: errors.length, payload: { errors } };
};

// Validate datatype
const validateDateFormat = (date: string) => {
	const dateArray = date.split("/");

	if (dateArray.length !== 3) return false;

	return Number(date[0]) > 12 || Number(date[1]) > 31 || Number(date[2]) < 2000;
};

const validateDataType = (row, rules: Rule[], fields: Field[]) => {
	const errors: Errors = [];

	for (let { field, occurrence, fullField } of fields) {
		const [rule] = rules.filter(
			(rule) =>
				rule.ruleField === field && rule.ruleFieldOccurrence === occurrence
		);

		const ruleTypeArray = rule.ruleDataType.split("(");
		const type = ruleTypeArray[0].toUpperCase();
		let upperBound = Number.POSITIVE_INFINITY;
		let lowerBound = Number.NEGATIVE_INFINITY;

		if (
			(type === DataTypes.String ||
				type === DataTypes.Integer ||
				type === DataTypes.Nvarchar ||
				type === DataTypes.Decimal) &&
			ruleTypeArray.length > 1
		) {
			const bound = ruleTypeArray[1].split(")")[0];
			const bounds = bound.split("-");

			if (bounds.length > 1) {
				upperBound = Number(bounds[1]);
				lowerBound = Number(bounds[0]);
			} else {
				upperBound = Number(bounds[0]);
			}
		}

		const data = row[fullField];
		const dataType = (typeof data).toUpperCase();

		const commonError = `${field}: Expected ${type} but got ${dataType}`;
		const upperBoundError = `${field}: ${type} must be less than or equal to ${upperBound}`;
		const lowerBoundError = `${field}: ${type} must be greater than or equal to ${lowerBound}`;

		switch (type) {
			case DataTypes.Boolean:
				if (dataType !== "BOOLEAN") {
					errors.push({
						message: commonError,
					});
					continue;
				}
				break;
			case DataTypes.Char:
				if (dataType !== "STRING" || data.length !== 1) {
					errors.push({
						message: commonError,
					});
					continue;
				}
				break;
			case DataTypes.Decimal:
			case DataTypes.Integer:
				if (dataType !== "NUMBER") {
					errors.push({
						message: commonError,
					});
					continue;
				}
				if (data > upperBound) {
					errors.push({
						message: upperBoundError,
					});
				}
				if (data < lowerBound) {
					errors.push({
						message: lowerBoundError,
					});
				}
				break;
			case DataTypes.String:
				if (dataType !== "STRING") {
					errors.push({
						message: commonError,
					});
					continue;
				}
				if (data > upperBound) {
					errors.push({
						message: upperBoundError,
					});
				}
				if (data < lowerBound) {
					errors.push({
						message: lowerBoundError,
					});
				}
				break;
			case DataTypes.DateTime:
				const isDateFormat = validateDateFormat(data);
				if (!isDateFormat) {
					errors.push({
						message: `${field}: Please enter the date in MM/DD/YYYY format`,
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
const validateDataExistence = (row, rules: Rule[], fields: Field[]) => {
	const errors: Errors = [];

	for (const { field, occurrence, fullField } of fields) {
		const [rule] = rules.filter(
			(rule) =>
				rule.ruleField === field && rule.ruleFieldOccurrence === occurrence
		);
		const data = row[fullField];

		if (!data && rule.ruleRequired && data !== 0)
			errors.push({ message: `${field}: Expected a value in column ${field}` });
	}

	return { errorCount: errors.length, payload: { errors } };
};

// Validate dependency

export default validateData;
