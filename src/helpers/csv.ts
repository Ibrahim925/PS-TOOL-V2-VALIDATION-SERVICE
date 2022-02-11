import { Rules } from "../types";

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
	delimiter = ","
): Promise<any> => {
	// Extracts headers from CSV string
	let titles = data
		.slice(0, data.indexOf("\n"))
		.split(delimiter)
		.map((title) => title.split("\r")[0]);

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
