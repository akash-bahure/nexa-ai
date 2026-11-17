import { Router } from "express";
import multer from "multer";
import path from "path";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  uploadDocument,
  listDocuments,
  getDocument,
  removeDocument,
  queryDocuments,
  queryDocumentsStream,
} from "../controllers/document.controller.js";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);

    fs.mkdir(uploadDir, { recursive: true }, (error) => {
      if (error) {
        return cb(error, uploadDir);
      }

      cb(null, uploadDir);
    });
  },

  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB hard limit
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type"));
    }
  },
});

const router = Router();
router.use(requireAuth);

router.post("/upload", upload.single("file"), uploadDocument);
router.get("/", listDocuments);
router.get("/:id", getDocument);
router.delete("/:id", removeDocument);
router.post("/query", queryDocuments);
router.post("/query/stream", queryDocumentsStream);

export default router;
