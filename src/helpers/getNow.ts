export const getDay = () => {
	const date = new Date();
	const dd = String(date.getDate()).padStart(2, "0");
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	const yyyy = date.getFullYear();
	const day = mm + "-" + dd + "-" + yyyy;

	return day;
};

export const getTime = () => {
	const date = new Date();

	const time = date.toLocaleString("en-US", { hour12: false });

	return time;
};
