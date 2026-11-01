import { Router } from "express";
import {
  createReport,
  getMyReports,
  getReportById,
  updateReport,
  deleteReport,
} from "../controllers/report.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { upload } from "../middleware/upload.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", upload.single("image"), createReport);
router.get("/", getMyReports);
router.get("/:id", getReportById);
router.put("/:id", updateReport);
router.delete("/:id", deleteReport);

export default router;
