import { Request, Response, NextFunction } from "express";

export function adminMiddleware(req: Request, res: Response, next: NextFunction,) {
  if (!req.user) {
    res.status(401).json({
      message: "Silakan login terlebih dahulu.",
    });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({
      message: "Akses ditolak. Khusus admin.",
    });
    return;
  }

  next();
}
