import { codexModel } from "../../../config.ts"

export const ALLOWED_MODELS = new Set([
  "gpt-5.2",
  "gpt-5.3-codex",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.5",
])

export const MODEL_ALIASES = new Map<string, string>([
  ["haiku", "gpt-5.4-mini"],
  ["claude-haiku-4-5", "gpt-5.4-mini"],
  ["claude-haiku-4-5-20251001", "gpt-5.4-mini"],
  ["sonnet", "gpt-5.4"],
  ["claude-sonnet-4-6", "gpt-5.4"],
  ["opus", "gpt-5.5"],
  ["claude-opus-4-7", "gpt-5.5"],
])

export function resolveModel(model: string): string {
  // CCP_CODEX_MODEL (env) or codex.model (config.json) overrides the model
  // so that regardless of whatever model is requested by the harness, the
  // provided model is always used. Empty values fall through to alias
  // resolution.
  const override = codexModel()
  if (override !== undefined) return override

  return MODEL_ALIASES.get(model) ?? model
}

export function assertAllowedModel(model: string): void {
  if (!ALLOWED_MODELS.has(model)) {
    throw new ModelNotAllowedError(model)
  }
}

export class ModelNotAllowedError extends Error {
  constructor(public model: string) {
    super(`Model not allowed: ${model}`)
    this.name = "ModelNotAllowedError"
  }
}
