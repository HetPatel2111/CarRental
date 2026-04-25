import express from "express";
import {
    getHealthStatus,
    getPerformanceSummary,
    runKeepAlive
} from "../controllers/systemController.js";

const systemRouter = express.Router();

systemRouter.get("/health", getHealthStatus);
systemRouter.get("/keep-alive", runKeepAlive);
systemRouter.get("/performance-summary", getPerformanceSummary);

export default systemRouter;
