import { Request, Response } from "express";

export function healthController(_req: Request, res: Response) {
  res.json({ status: "ok" });
}
