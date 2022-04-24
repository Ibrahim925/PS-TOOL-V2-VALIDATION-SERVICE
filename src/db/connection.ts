import "reflect-metadata";
import { Connection, createConnection } from "typeorm";
import "dotenv/config";

export let connection: Connection;

createConnection({
	type: "mysql",
	host: process.env.dbHost,
	port: 3306,
	username: process.env.dbUserName,
	password: process.env.dbPassword,
	database: process.env.dbName,
	synchronize: true,
	entities: ["build/db/entity/**/*.js"],
	cli: {
		entitiesDir: "build/db/entity",
		migrationsDir: "build/db/migration",
		subscribersDir: "build/db/subscriber",
	},
}).then((returnedConnection: Connection) => {
	connection = returnedConnection;
});
