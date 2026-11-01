import { Request, Response } from "express";
import { z } from "zod";
import connection from "../db";

// GET: admin melihat seluruh pengaduan
export async function getAllReports(_req: Request, res: Response) {
  try {
    const [rows] = await connection.execute(`
      SELECT
        r.id_report,
        u.name AS nama_pelapor,
        u.email,
        c.name_category,
        r.title,
        r.description,
        r.location,
        r.image_url,
        r.status,
        r.admin_note,
        r.created_at,
        r.updated_at
      FROM reports r
      JOIN users u ON r.id_user = u.id_user
      JOIN categories c ON r.id_category = c.id_category
      ORDER BY r.created_at DESC
    `);

    res.json({
      message: "Berhasil mengambil seluruh pengaduan.",
      data: rows,
    });
  } catch (error) {
    console.error("Get all reports error:", error);
    res.status(500).json({
      message: "Gagal mengambil seluruh pengaduan.",
    });
  }
}

// PATCH: admin mengubah status dan catatan pengaduan
const updateStatusSchema = z.object({
  status: z.enum(["menunggu", "diproses", "selesai", "ditolak"]),
  admin_note: z.string().trim().max(500).optional(),
});

const idSchema = z.coerce.number().int().positive();

export async function updateReportStatus(req: Request, res: Response) {
  try {
    const idResult = idSchema.safeParse(req.params.id);

    if (!idResult.success) {
      res.status(400).json({
        message: "ID pengaduan tidak valid.",
      });
      return;
    }

    const parsed = updateStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Data status tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { status, admin_note } = parsed.data;

    const [result] = await connection.execute(
      `UPDATE reports
       SET status = ?,
           admin_note = COALESCE(?, admin_note)
       WHERE id_report = ?`,
      [status, admin_note ?? null, idResult.data],
    );

    const updateResult = result as { affectedRows: number };

    if (updateResult.affectedRows === 0) {
      res.status(404).json({
        message: "Pengaduan tidak ditemukan.",
      });
      return;
    }

    res.json({
      message: "Status pengaduan berhasil diperbarui.",
      id_report: idResult.data,
      status,
      admin_note: admin_note ?? undefined,
    });
  } catch (error) {
    console.error("Update report status error:", error);
    res.status(500).json({
      message: "Gagal memperbarui status pengaduan.",
    });
  }
}
