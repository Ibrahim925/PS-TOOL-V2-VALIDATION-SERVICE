export const getDay = () => {
	const date = new Date();
	const d = String(date.getDate()).padStart(2, "0");
	const m = String(date.getMonth() + 1).padStart(2, "0");
	const y = date.getFullYear();
	const day = m + "-" + d + "-" + y;

	console.log(y);
	console.log(m);
	console.log(d);

	return day;
};

export const getTime = () => {
	const date = new Date();

	const time = date.toLocaleString("en-US", { hour12: false });

	return time;
};
