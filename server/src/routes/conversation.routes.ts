import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";

import {
  createConversationHandler,
  listConversations,
  getConversation,
  renameConversation,
  removeConversation,
} from "../controllers/conversation.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/", createConversationHandler);
router.get("/", listConversations);
router.get("/:id", getConversation);
router.patch("/:id", renameConversation);
router.delete("/:id", removeConversation);

export default router;
