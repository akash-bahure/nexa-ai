
import { Router } from "express";

import healthRoutes from "./health.routes.js";
import chatRoutes from "./chat.routes.js";
import conversationRoutes from "./conversation.routes.js";
import authRoutes from "./auth.routes.js";
import documentRoutes from "./document.routes.js";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/chat", chatRoutes);
router.use("/conversations", conversationRoutes);
router.use("/documents", documentRoutes);

export default router;