import { Router } from "express";
import {
  getAllReports,
  updateReportStatus,
} from "../controllers/admin.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { adminMiddleware } from "../middleware/admin.middleware";

const router = Router();

// Semua route di bawah wajib login sebagai admin
router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/reports", getAllReports);
router.patch("/reports/:id/status", updateReportStatus);

export default router;
