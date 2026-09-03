// TEMPORARY Phase 1A verification function. Synthetic data only — no customer
// information. Deleted immediately after the verification run.
import { generateStructured, resolveConfig } from "../_shared/aiProvider.ts";

type Triage = { category: string; urgency: "low" | "normal" | "high" };

const validate = (parsed: unknown): Triage => {
  const p = parsed as Record<string, unknown>;
  if (typeof p?.category !== "string" || p.category.length > 60) throw new Error("category invalid");
  if (!["low", "normal", "high"].includes(String(p?.urgency))) throw new Error("urgency invalid");
  return { category: p.category, urgency: p.urgency as Triage["urgency"] };
};

Deno.serve(async () => {
  const cfg = resolveConfig("lovable");

  // 1. Happy path with synthetic text.
  const happy = await generateStructured<Triage>({
    system: 'Classify a synthetic test note. Return {"category": string, "urgency": "low"|"normal"|"high"}.',
    user: "Synthetic test: the parking lot needs sanding before tomorrow morning.",
    validate,
    config: cfg,
  });

  // 2. Malformed-output handling: validator that always rejects.
  const malformed = await generateStructured({
    system: 'Return {"category":"test","urgency":"low"}.',
    user: "Synthetic test.",
    validate: () => {
      throw new Error("simulated schema mismatch");
    },
    config: cfg,
  });

  return new Response(
    JSON.stringify({ model: cfg.model, happy, malformed }, null, 2),
    { headers: { "Content-Type": "application/json" } },
  );
});
