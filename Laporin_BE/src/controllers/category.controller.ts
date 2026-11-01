import { Request, Response } from "express";
import connection from "../db";

export async function getCategories(_req: Request, res: Response) {
  try {
    const [rows] = await connection.execute(
      `SELECT id_category, name_category
       FROM categories
       ORDER BY id_category ASC`,
    );

    res.json({
      message: "Berhasil mengambil kategori.",
      data: rows,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    res.status(500).json({
      message: "Gagal mengambil kategori.",
    });
  }
}
