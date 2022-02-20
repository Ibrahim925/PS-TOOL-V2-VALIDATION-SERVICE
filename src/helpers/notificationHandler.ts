import { Notification } from "../db/entity/Notification";
import { getDay, getTime } from "./getNow";

export const createNotification = async (
	notificationText: Notification["notificationText"],
	notificationProject: Notification["notificationProject"],
	notificationObject: Notification["notificationObject"]
) => {
	// Create the date

	const notificationDate = getDay();
	const notificationTime = getTime();

	try {
		await Notification.insert({
			notificationDate,
			notificationTime,
			notificationText,
			notificationObject,
			notificationProject,
		});
	} catch (error) {
		console.error(error);
	}
};
