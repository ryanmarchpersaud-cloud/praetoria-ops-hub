/**
 * Phase 1D.2 legacy Co-pilot kill switch.
 * Only the exact value "true" enables the retired code path.
 */
export function isLegacyChatCopilotEnabled(raw: string | undefined | null): boolean {
  return raw === "true";
}

export function legacyChatCopilotDisabledResponse(
  raw: string | undefined | null,
  headers: Record<string, string>,
): Response | null {
  if (isLegacyChatCopilotEnabled(raw)) return null;

  return new Response(
    JSON.stringify({ error: "Legacy AI Co-pilot disabled" }),
    { status: 403, headers: { ...headers, "Content-Type": "application/json" } },
  );
}