import express from "express";
import { recommendCarsWithChat } from "../controllers/chatController.js";
import { protect } from "../middleware/auth.js";

const chatRouter = express.Router();

chatRouter.post("/recommend", protect, recommendCarsWithChat);

export default chatRouter;
