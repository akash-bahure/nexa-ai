import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";

import {
  getModels,
  sendChatMessage,
  streamChatMessage,
} from "../controllers/chat.controller.js";

const router = Router();

router.get("/models", getModels);

router.post("/", requireAuth, sendChatMessage);

router.post("/stream", requireAuth, streamChatMessage);

export default router;
