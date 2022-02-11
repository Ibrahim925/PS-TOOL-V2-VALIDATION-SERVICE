import { Request } from "express";

// Base custom request body
export interface CustomRequest<P, B, Q> extends Request<P, {}, B, Q, {}> {
	id?: number;
}

// Errors sent to user
export interface Error {
	message: string;
	location?: string;
}

export type Errors = Error[];

// Success message
export enum SuccessMessage {
	Success = "SUCCESS",
}

// Valid versions
export enum Versions {
	V9 = "V9",
	V10 = "V10",
}

// Rules
export enum Config {
	Base = "Base",
	Business = "Business",
	Customer = "Customer",
}

export enum DataTypes {
	String = "STRING",
	Integer = "INTEGER",
	Boolean = "BOOLEAN",
	Char = "CHAR",
	DateTime = "DATETIME",
	Text = "TEXT",
}

export enum Cases {
	Upper = "UPPER",
	Lower = "LOWER",
	Camel = "CAMEL",
	Snake = "SNAKE",
	Any = "ANY",
}

export interface Rule {
	configuration: Config;
	object: string;
	field: string;
	dataType: DataTypes;
	case: Cases;
	required: boolean;
	dependency: string;
}

export type Rules = Rule[];

export interface LogiObject {
	objectName: string;
	objectConfig: Config;
}
