declare global {
  namespace Express {
    interface Request {
      user?: {
        id_user: number;
        role: "admin" | "user";
      };
    }
  }
}

export {};
