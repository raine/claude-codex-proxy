export const KIMI_DEFAULT_MODEL = "kimi-for-coding"

export const ALLOWED_MODELS = new Set([KIMI_DEFAULT_MODEL])

// Every incoming model name collapses to kimi-for-coding — the only model
// Kimi Code exposes. Explicit aliases exist so `ANTHROPIC_MODEL=haiku` works
// for portability with the codex provider's aliasing.
const ALIAS_TARGETS: Record<string, string> = {
  haiku: KIMI_DEFAULT_MODEL,
  "claude-haiku-4-5": KIMI_DEFAULT_MODEL,
  "claude-haiku-4-5-20251001": KIMI_DEFAULT_MODEL,
  sonnet: KIMI_DEFAULT_MODEL,
  "claude-sonnet-4-6": KIMI_DEFAULT_MODEL,
  opus: KIMI_DEFAULT_MODEL,
  "claude-opus-4-7": KIMI_DEFAULT_MODEL,
  "kimi-for-coding": KIMI_DEFAULT_MODEL,
}

export function resolveModel(model: string): string {
  return ALIAS_TARGETS[model] ?? KIMI_DEFAULT_MODEL
}

export function assertAllowedModel(model: string): void {
  if (!ALLOWED_MODELS.has(model)) throw new ModelNotAllowedError(model)
}

export class ModelNotAllowedError extends Error {
  constructor(public model: string) {
    super(`Model not allowed: ${model}`)
    this.name = "ModelNotAllowedError"
  }
}
