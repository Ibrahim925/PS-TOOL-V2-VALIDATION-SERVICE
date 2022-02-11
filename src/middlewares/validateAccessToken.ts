import { NextFunction, Response } from "express";
import * as jwt from "jsonwebtoken";
import "dotenv";
import { CustomRequest } from "../types";

// Authenticate refresh token before creating access token with it
const authenticateRefreshToken = (
	req: CustomRequest<{}, {}, {}>,
	res: Response,
	next: NextFunction
) => {
	const authHeader: string = req.headers["authorization"];
	if (!authHeader) return res.sendStatus(401);
	const token = authHeader.split(" ")[1];

	console.log("AUTH HEADER TOKEN: ", token);

	if (token === null) return res.sendStatus(401);

	jwt.verify(
		token,
		process.env.ACCESS_TOKEN_SECRET,
		async (error, data: { id: number }) => {
			if (error) return res.sendStatus(401);

			req.id = data.id;
			next();
		}
	);
};

export default authenticateRefreshToken;
