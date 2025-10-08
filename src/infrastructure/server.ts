import express from "express";
import { logger } from "./logger";
import { env } from "./config/env";
import { router } from "../adapters/http/routes";
import { errorMiddleware } from "./errors/error-middleware";

const app = express();
app.use(express.json());

// routes
app.use("/", router);

// error handler (last)
app.use(errorMiddleware);

app.listen(env.PORT, () => {
  logger.info(`Server running on http://localhost:${env.PORT}`);
});
