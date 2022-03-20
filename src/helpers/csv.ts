import { Rule } from "../db/entity/Rule";

const isStringNumeric = (str: string) => {
	if (!str) return false;

	if (str === "0") return true;

	if (!Number(str) || isNaN(Number(str))) return false;

	return true;
};

const stringToBool = (str: string) => {
	if (str.toUpperCase() !== "TRUE" && str.toUpperCase() !== "FALSE")
		return "string is not valid";

	return str.toUpperCase() === "TRUE";
};

export const CSVToJSON = async (
	data: string,
	rules: Rule[],
	delimiter = ",",
	includeOccurence = true
): Promise<any> => {
	// Extracts headers from CSV string
	const titlesWithoutOccurrence = data
		.slice(0, data.indexOf("\n"))
		.split(delimiter)
		.map((title) => title.split("\r")[0]);

	const titles = [];

	const fieldOccurrenceTracker = {};

	for await (const title of titlesWithoutOccurrence) {
		if (fieldOccurrenceTracker[title] === undefined) {
			fieldOccurrenceTracker[title] = 0;
		} else {
			fieldOccurrenceTracker[title] += 1;
		}

		const [rule] = rules.filter((rule) => {
			return (
				rule.ruleField === title &&
				rule.ruleFieldOccurrence === fieldOccurrenceTracker[title]
			);
		});

		// Get object Occurrence
		if (!rule && includeOccurence) continue;
		if (includeOccurence) {
			titles.push(`${title}~${rule.ruleFieldOccurrence}`);
		} else {
			titles.push(title);
		}
	}

	return data
		.slice(data.indexOf("\n") + 1)
		.split("\n")
		.map((v) => {
			const values = v.split(delimiter).map((value) => {
				let string = value.split("\r")[0];
				const isNum = isStringNumeric(string);
				const bool = stringToBool(string);

				if (isNum) return Number(string);
				else if (typeof bool === "boolean") return bool;
				else return string;
			});
			const object = titles.reduce(
				(obj, title, index) => ((obj[title] = values[index]), obj),
				{}
			);
			return object;
		});
};

export const JSONtoCSV = async (csvJSON: any[], customFields = {}) => {
	const fieldsWithOccurrence = Object.keys(csvJSON[0]);
	const fields = fieldsWithOccurrence.map((field) => field.split("~")[0]);

	try {
		const csv = csvJSON.map((row, index) => {
			const reordered = {};

			for (const field of fieldsWithOccurrence) {
				reordered[field] = row[field];
			}

			index === 73 && console.log(reordered, "FDSFD");

			return Object.values(reordered);
		});

		if (Object.keys(customFields).length)
			for (let i = 0, len = fields.length; i < len; i++) {
				fields[i] = customFields[fields[i]];
			}

		csv.unshift(fields);

		return csv.join("\n");
	} catch (error) {
		console.error(error);
	}
};
