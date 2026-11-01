import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import { authMiddleware } from "./middleware/auth.middleware";
import categoryRoutes from "./routes/category.routes";
import reportRoutes from "./routes/report.routes";
import adminRoutes from "./routes/admin.routes";


const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "API Laporin berhasil dijalankan!",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({
    message: "Token valid!",
    user: req.user,
  });
});

export default app;
