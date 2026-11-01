import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import connection from "../db";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(100),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(100),
  password: z.string().min(1).max(72),
});

const jwtSecret = process.env.JWT_SECRET;

export async function register(req: Request, res: Response) {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Data register tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { name, email, password } = parsed.data;

    const [existing] = await connection.execute(
      "SELECT id_user FROM users WHERE email = ?",
      [email],
    );

    if ((existing as unknown[]).length > 0) {
      res.status(409).json({
        message: "Email sudah terdaftar.",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await connection.execute(
      `INSERT INTO users (name, email, password)
       VALUES (?, ?, ?)`,
      [name, email, hashedPassword],
    );

    res.status(201).json({
      message: "Registrasi berhasil. Silakan login.",
    });
  } catch (error) {
    console.error("Register error:", error);

    res.status(500).json({
      message: "Terjadi kesalahan pada server.",
    });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Email atau password tidak valid.",
      });
      return;
    }

    if (!jwtSecret) {
      res.status(500).json({
        message: "Konfigurasi JWT belum tersedia.",
      });
      return;
    }

    const { email, password } = parsed.data;

    const [rows] = await connection.execute(
      `SELECT id_user, name, email, password, role FROM users WHERE email = ?`,
      [email],
    );

    const users = rows as {
      id_user: number;
      name: string;
      email: string;
      password: string;
      role: "admin" | "user";
    }[];

    if (users.length === 0) {
      res.status(401).json({
        message: "Email atau password salah.",
      });
      return;
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      res.status(401).json({
        message: "Email atau password salah.",
      });
      return;
    }

    const token = jwt.sign(
      {
        id_user: user.id_user,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: "1h" },
    );

    res.json({
      message: "Login berhasil.",
      token,
      user: {
        id_user: user.id_user,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Terjadi kesalahan pada server.",
    });
  }
}
