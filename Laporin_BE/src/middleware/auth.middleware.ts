import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    res.status(401).json({
      message: "Gak ada token",
    });
    return;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({
      message: "Konfigurasi JWT belum tersedia",
    });
    return;
  }

  try {
    req.user = jwt.verify(token, secret) as {
      id_user: number;
      role: "admin" | "user";
    };

    next();
  } catch {
    res.status(401).json({
      message: "Token gak valid",
    });
  }
}
