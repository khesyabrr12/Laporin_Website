import { Request, Response } from "express";
import { z } from "zod";
import connection from "../db";
import cloudinary from "../config/cloudinary";

const reportSchema = z.object({
  id_category: z.coerce.number().int().positive(),
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10),
  location: z.string().trim().min(2).max(150),
});

const idSchema = z.coerce.number().int().positive();

function getId(value: string): number | null {
  const result = idSchema.safeParse(value);
  return result.success ? result.data : null;
}

// CREATE: membuat pengaduan

export async function createReport(req: Request, res: Response) {
  try {
    const parsed = reportSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Data pengaduan tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { id_category, title, description, location } = parsed.data;
    const id_user = req.user!.id_user;

    let image_url: string | null = null;
    let image_public_id: string | null = null;

    // Upload gambar jika user mengirim foto
    if (req.file) {
      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "laporin/reports" },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        stream.end(req.file!.buffer);
      });

      image_url = result.secure_url;
      image_public_id = result.public_id;
    }

    const [result] = await connection.execute(
      `INSERT INTO reports
       (id_user, id_category, title, description, location,
        image_url, image_public_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id_user,
        id_category,
        title,
        description,
        location,
        image_url,
        image_public_id,
      ]
    );

    const insertResult = result as { insertId: number };

    res.status(201).json({
      message: "Pengaduan berhasil dibuat.",
      id_report: insertResult.insertId,
      image_url,
    });
  } catch (error) {
    console.error("Create report error:", error);
    res.status(500).json({
      message: "Gagal membuat pengaduan.",
    });
  }
}


// READ: melihat pengaduan milik user yang login
export async function getMyReports(req: Request, res: Response) {
  try {
    const [rows] = await connection.execute(
      `SELECT r.id_report, r.title, r.description, r.location,
              r.image_url, r.status, r.admin_note,
              r.id_category, c.name_category,
              r.created_at, r.updated_at
       FROM reports r
       JOIN categories c ON r.id_category = c.id_category
       WHERE r.id_user = ?
       ORDER BY r.created_at DESC`,
      [req.user!.id_user],
    );

    res.json({
      message: "Berhasil mengambil pengaduan.",
      data: rows,
    });
  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({
      message: "Gagal mengambil pengaduan.",
    });
  }
}

// READ: melihat detail pengaduan milik user yang login
export async function getReportById(req: Request, res: Response) {
  try {
    const id = getId(String(req.params.id));

    if (id === null) {
      res.status(400).json({ message: "ID pengaduan tidak valid." });
      return;
    }

    const [rows] = await connection.execute(
      `SELECT r.*, c.name_category
       FROM reports r
       JOIN categories c ON r.id_category = c.id_category
       WHERE r.id_report = ? AND r.id_user = ?`,
      [id, req.user!.id_user],
    );

    const reports = rows as Record<string, unknown>[];

    if (reports.length === 0) {
      res.status(404).json({
        message: "Pengaduan tidak ditemukan.",
      });
      return;
    }

    res.json({ data: reports[0] });
  } catch (error) {
    console.error("Get report detail error:", error);
    res.status(500).json({
      message: "Gagal mengambil detail pengaduan.",
    });
  }
}

// UPDATE: hanya pengaduan berstatus menunggu yang bisa diedit
export async function updateReport(req: Request, res: Response) {
  try {
    const id = getId(String(req.params.id));

    if (id === null) {
      res.status(400).json({ message: "ID pengaduan tidak valid." });
      return;
    }

    const parsed = reportSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Data pengaduan tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const [rows] = await connection.execute(
      `SELECT status FROM reports
       WHERE id_report = ? AND id_user = ?`,
      [id, req.user!.id_user],
    );

    const reports = rows as { status: string }[];

    if (reports.length === 0) {
      res.status(404).json({
        message: "Pengaduan tidak ditemukan.",
      });
      return;
    }

    if (reports[0].status !== "menunggu") {
      res.status(403).json({
        message: "Pengaduan hanya bisa diedit saat status menunggu.",
      });
      return;
    }

    const { id_category, title, description, location } = parsed.data;

    await connection.execute(
      `UPDATE reports
       SET id_category = ?, title = ?, description = ?, location = ?
       WHERE id_report = ? AND id_user = ?`,
      [id_category, title, description, location, id, req.user!.id_user],
    );

    res.json({ message: "Pengaduan berhasil diperbarui." });
  } catch (error) {
    console.error("Update report error:", error);
    res.status(500).json({
      message: "Gagal memperbarui pengaduan.",
    });
  }
}

// DELETE: hanya pengaduan berstatus menunggu yang bisa dihapus

export async function deleteReport(req: Request, res: Response) {
  try {
    const id = getId(String(req.params.id));

    if (!id) {
      res.status(400).json({
        message: "ID pengaduan tidak valid.",
      });
      return;
    }

    // Cari pengaduan milik user yang sedang login
    const [rows] = await connection.execute(
      `SELECT id_report, image_public_id, status
       FROM reports
       WHERE id_report = ? AND id_user = ?`,
      [id, req.user!.id_user],
    );

    const reports = rows as {
      id_report: number;
      image_public_id: string | null;
      status: string;
    }[];

    if (reports.length === 0) {
      res.status(404).json({
        message: "Pengaduan tidak ditemukan atau bukan milik mu.",
      });
      return;
    }

    const report = reports[0];

    // Pengaduan hanya bisa dihapus saat menunggu
    if (report.status !== "menunggu") {
      res.status(400).json({
        message: "Pengaduan hanya bisa dihapus saat status menunggu.",
      });
      return;
    }

    // Hapus foto dari Cloudinary jika ada
    if (report.image_public_id) {
      try {
        await cloudinary.uploader.destroy(report.image_public_id);
      } catch (cloudinaryError) {
        console.error("Gagal menghapus foto Cloudinary:", cloudinaryError);

        res.status(500).json({
          message: "Gagal menghapus foto pengaduan dari Cloudinary.",
        });
        return;
      }
    }

    // Hapus data pengaduan dari database
    await connection.execute(
      `DELETE FROM reports WHERE id_report = ? AND id_user = ?`,
      [id, req.user!.id_user],
    );

    res.json({
      message: "Pengaduan berhasil dihapus.",
    });
  } catch (error) {
    console.error("Delete report error:", error);

    res.status(500).json({
      message: "Terjadi kesalahan saat menghapus pengaduan.",
    });
  }
}

