import * as express from "express";
import * as cors from "cors";
import authenticateRefreshToken from "./middlewares/validateAccessToken";
import validateRouter from "./router/validate.router";
import "dotenv/config";

const app = express();

app.use(cors());
app.use(express.json());

app.use(authenticateRefreshToken);
app.use("/validate", validateRouter);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
