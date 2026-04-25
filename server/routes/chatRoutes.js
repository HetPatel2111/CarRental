import express from "express";
import { recommendCarsWithChat } from "../controllers/chatController.js";
import { protect } from "../middleware/auth.js";
import { cacheJsonResponse } from "../middleware/responseCache.js";
import { chatLimiter } from "../middleware/security.js";

const chatRouter = express.Router();

chatRouter.post(
    "/recommend",
    chatLimiter,
    protect,
    cacheJsonResponse({
        keyPrefix: "chat:recommend",
        ttlSeconds: 45,
        getPayload: (req) => ({
            userId: req.user?._id || "guest",
            messages: req.body?.messages || []
        })
    }),
    recommendCarsWithChat
);

export default chatRouter;
