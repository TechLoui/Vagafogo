import type { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "crypto";

const safeEqual = (received: string, expected: string) => {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

export const exigirServicoAgente = (req: Request, res: Response, next: NextFunction) => {
  const expected = (process.env.AGENT_INTERNAL_API_TOKEN ?? "").trim();
  const received = String(req.get("X-Internal-Token") ?? "").trim();
  if (!expected) {
    res.status(503).json({ error: "AGENT_INTERNAL_AUTH_NOT_CONFIGURED" });
    return;
  }
  if (!received || !safeEqual(received, expected)) {
    res.status(401).json({ error: "AGENT_INTERNAL_AUTH_INVALID" });
    return;
  }
  next();
};

