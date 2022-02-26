import { connection } from "../db/connection";
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
	projectName,
	objectName,
	delimiter = ","
): Promise<any> => {
	// Extracts headers from CSV string
	const titlesWithoutOccurrence = data
		.slice(0, data.indexOf("\n"))
		.split(delimiter)
		.map((title) => title.split("\r")[0]);

	const titles = [];

	const fieldOccurrenceTracker = {};

	const rules = await connection.getRepository(Rule).find({
		where: {
			ruleObject: objectName,
			ruleProject: projectName,
		},
	});

	for await (const title of titlesWithoutOccurrence) {
		if (fieldOccurrenceTracker[title] === undefined) {
			fieldOccurrenceTracker[title] = 0;
		} else {
			fieldOccurrenceTracker[title] += 1;
		}

		const [rule] = rules.filter((rule) => {
			console.log(title, fieldOccurrenceTracker[title]);
			if (rule !== undefined)
				return (
					rule.ruleField === title &&
					rule.ruleFieldOccurrence === fieldOccurrenceTracker[title]
				);
			return false;
		});

		// Get object Occurrence

		console.log(rule);

		// titles.push(`${title}~${rule.ruleFieldOccurrence}`);
	}

	return data
		.slice(data.indexOf("\n") + 1)
		.split("\n")
		.map((v) => {
			const values = v.split(delimiter).map((value) => {
				const string = value.split("\r")[0];
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

export const JSONtoCSV = async (csvJSON: any[]) => {
	const fields = Object.keys(csvJSON[0]);

	try {
		const csv = csvJSON.map((row) => Object.values(row));
		console;
		csv.unshift(fields);

		return csv.join("\n");
	} catch (error) {
		console.error(error);
	}
};
