import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = "claude-opus-5-5";
// Re-run a declined request on Anthropic's recommended fallback model instead of failing.
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;
export function claude(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

type Effort = "low" | "medium" | "high";

// One structured-output call: returns the parsed object or throws.
export async function askJson<T extends z.ZodType>(opts: {
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[] | string;
  schema: T;
  effort?: Effort;
}): Promise<z.infer<T>> {
  const response = await claude().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    output_config: { effort: opts.effort ?? "low", format: betaZodOutputFormat(opts.schema) },
    system: opts.system,
    messages: [{ role: "user", content: opts.content }],
  });
  if (response.stop_reason === "refusal") throw new Error("The model declined this request.");
  if (response.parsed_output == null) throw new Error("Could not parse the model's response.");
  return response.parsed_output;
}
