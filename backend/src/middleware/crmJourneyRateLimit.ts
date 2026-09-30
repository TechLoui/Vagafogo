import type { NextFunction, Request, Response } from "express";

type Entry = { count: number; resetAt: number };
const entries = new Map<string, Entry>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 120;
const MAX_KEYS = 20_000;

export const limitarEventosJornada = (req: Request, res: Response, next: NextFunction) => {
  const now = Date.now();
  if (entries.size >= MAX_KEYS) {
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now) entries.delete(key);
    }
    while (entries.size >= MAX_KEYS) entries.delete(entries.keys().next().value as string);
  }
  const key = (req.ip || req.socket.remoteAddress || "unknown").trim();
  const current = entries.get(key);
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + WINDOW_MS }
    : current;
  entry.count += 1;
  entries.set(key, entry);
  res.setHeader("RateLimit-Limit", String(MAX_PER_WINDOW));
  res.setHeader("RateLimit-Remaining", String(Math.max(0, MAX_PER_WINDOW - entry.count)));
  if (entry.count > MAX_PER_WINDOW) {
    res.setHeader("Retry-After", String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));
    res.status(429).json({ success: false, error: "RATE_LIMITED" });
    return;
  }
  next();
};
