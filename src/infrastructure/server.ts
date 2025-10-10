import express from "express";
import { logger } from "./logger";
import { env } from "./config/env";
import { router } from "../adapters/http/routes";
import { errorMiddleware } from "./errors/error-middleware";
import swaggerUi from "swagger-ui-express";
import * as fs from "fs";

const app = express();
app.use(express.json());

// routes
app.use("/", router);

// Swagger UI middleware
const openApiSpec = JSON.parse(fs.readFileSync(require.resolve("../adapters/http/openapi.json"), "utf-8"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

// error handler (last)
app.use(errorMiddleware);

app.listen(env.PORT, () => {
  logger.info(`Server running on http://localhost:${env.PORT}`);
});
