export const getDay = () => {
	const date = new Date();
	const d = String(date.getDate()).padStart(2, "0");
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const y = date.getFullYear();
	const day = m + "-" + d + "-" + y;

	return day;
};

export const getTime = () => {
	const date = new Date();

	let hours = date.getHours();
	let minutes: string | number = date.getMinutes();
	const ampm = hours >= 12 ? "pm" : "am";

	hours %= 12;
	hours = hours || 12;
	minutes = minutes < 10 ? `0${minutes}` : minutes;

	const strTime = `${hours}:${minutes} ${ampm}`;

	return strTime;
};
