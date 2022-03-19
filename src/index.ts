import express from "express";
import cors from "cors";
import authenticateAccessToken from "./middlewares/authenticateAccessToken";
import validateRouter from "./router/validate.router";
import "dotenv/config";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1TB" }));

app.use(authenticateAccessToken);
app.use("/validate", validateRouter);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
