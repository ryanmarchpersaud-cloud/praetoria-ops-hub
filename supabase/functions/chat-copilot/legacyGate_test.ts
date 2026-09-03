import {
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  isLegacyChatCopilotEnabled,
  legacyChatCopilotDisabledResponse,
} from "./legacyGate.ts";

Deno.test("missing legacy chat gate fails closed", async () => {
  assertEquals(isLegacyChatCopilotEnabled(undefined), false);
  const response = legacyChatCopilotDisabledResponse(undefined, {});
  assertNotEquals(response, null);
  assertEquals(response?.status, 403);
  assertEquals(await response?.json(), { error: "Legacy AI Co-pilot disabled" });
});

Deno.test("false legacy chat gate fails closed", () => {
  assertEquals(isLegacyChatCopilotEnabled("false"), false);
  assertEquals(legacyChatCopilotDisabledResponse("false", {})?.status, 403);
});

Deno.test("malformed legacy chat gate values fail closed", () => {
  for (const value of [null, "", "0", "1", "yes", "on", "TRUE", "True", "true ", " true", "enabled"]) {
    assertEquals(isLegacyChatCopilotEnabled(value), false);
    assertEquals(legacyChatCopilotDisabledResponse(value, {})?.status, 403);
  }
});

Deno.test("only exact true opens the legacy continuation", () => {
  assertEquals(isLegacyChatCopilotEnabled("true"), true);
  assertEquals(legacyChatCopilotDisabledResponse("true", {}), null);
});