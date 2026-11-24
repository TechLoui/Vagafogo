import { Router, Request, Response } from "express";
import { exigirAfiliado, obterIdentidadeAfiliado, exigirIdentidadeFirebase, obterIdentidadeFirebase } from "../middleware/affiliateAuth";
import { AffiliateError, affiliateMe, affiliatesEnabled, createAffiliateActivation, getAffiliateProfile, listAffiliates, previewAffiliateActivation, redeemAffiliateActivation, saveAffiliate } from "../services/affiliates";
import { affiliateSummary, listAffiliateLinks, listAffiliateSales, resolveAffiliateLink } from "../services/affiliatesReferral";

const router = Router();
type Handler = (req: Request, res: Response) => Promise<unknown>;
const run = (handler: Handler) => async (req: Request, res: Response) => {
  res.set("Cache-Control", "no-store");
  try { await handler(req, res); }
  catch (error) {
    if (error instanceof AffiliateError) { res.status(error.status).json({ code: error.code, error: error.message }); return; }
    console.error("[affiliates] Falha na operacao:", error instanceof Error ? error.message : "unknown");
    res.status(503).json({ code: "AFFILIATE_SERVICE_UNAVAILABLE", error: "Nao foi possivel concluir esta operacao. Tente novamente." });
  }
};
// Bound memory, rate limit shared by public link resolution and activation previews.
const publicHits = new Map<string, { start: number; count: number }>();
router.use((req, res, next) => {
  if (!req.path.startsWith("/public/") && !req.path.startsWith("/activation/")) { next(); return; }
  const key = req.ip || "unknown";
  const now = Date.now();
  if (publicHits.size > 5_000) for (const [id, hit] of publicHits) if (now - hit.start > 60_000) publicHits.delete(id);
  if (!publicHits.has(key) && publicHits.size >= 5_000) { res.status(429).json({ code: "AFFILIATE_RATE_LIMIT" }); return; }
  const hit = publicHits.get(key);
  const nextHit = !hit || now - hit.start > 60_000 ? { start: now, count: 1 } : { ...hit, count: hit.count + 1 };
  publicHits.set(key, nextHit);
  if (nextHit.count > 60) { res.set("Retry-After", "60"); res.status(429).json({ code: "AFFILIATE_RATE_LIMIT" }); return; }
  next();
});
router.use((req, res, next) => {
  if (affiliatesEnabled() || req.path === "/me") { next(); return; }
  res.status(503).json({ code: "AFFILIATES_NOT_ENABLED", error: "O portal de afiliados ainda nao esta disponivel." });
});
router.post("/public/resolve", run(async (req, res) => res.json(await resolveAffiliateLink(req.body?.referralToken))));
router.get("/activation/:token", run(async (req, res) => res.json(await previewAffiliateActivation(req.params.token))));
router.post("/activation/:token", exigirIdentidadeFirebase, run(async (req, res) => res.json(await redeemAffiliateActivation(req.params.token, obterIdentidadeFirebase(res)))));
router.use(exigirAfiliado);
router.get("/me", run(async (_req, res) => {
  const identity = obterIdentidadeAfiliado(res);
  if (!affiliatesEnabled() && identity.role !== "admin") throw new AffiliateError("AFFILIATES_NOT_ENABLED", 503);
  res.json(await affiliateMe(identity));
}));
for (const [path, kind] of [["agencies", "agency"], ["partners", "partner"]] as const) {
  router.get(`/${path}`, run(async (req, res) => res.json(await listAffiliates(kind, obterIdentidadeAfiliado(res), req.query.limit, req.query.cursor, req.query.agencyId))));
  router.post(`/${path}`, run(async (req, res) => res.status(201).json({ item: await saveAffiliate(kind, null, req.body, obterIdentidadeAfiliado(res)) })));
  router.get(`/${path}/:id`, run(async (req, res) => res.json({ item: await getAffiliateProfile(kind, req.params.id, obterIdentidadeAfiliado(res)) })));
  router.patch(`/${path}/:id`, run(async (req, res) => res.json({ item: await saveAffiliate(kind, req.params.id, req.body, obterIdentidadeAfiliado(res)) })));
  router.delete(`/${path}/:id`, run(async (req, res) => res.json({ item: await saveAffiliate(kind, req.params.id, { status: "disabled" }, obterIdentidadeAfiliado(res)) })));
  router.post(`/${path}/:id/activation`, run(async (req, res) => res.status(201).json(await createAffiliateActivation(kind, req.params.id, obterIdentidadeAfiliado(res)))));
}
router.get("/links", run(async (req, res) => res.json(await listAffiliateLinks(obterIdentidadeAfiliado(res), req.query))));
router.get("/sales", run(async (req, res) => res.json(await listAffiliateSales(obterIdentidadeAfiliado(res), req.query))));
router.get("/summary", run(async (req, res) => res.json(await affiliateSummary(obterIdentidadeAfiliado(res), req.query))));
export default router;
