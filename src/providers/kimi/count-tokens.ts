import { encode } from "gpt-tokenizer/model/gpt-4o"
import type { AnthropicRequest } from "../../anthropic/schema.ts"
import type { KimiChatRequest } from "./translate/request.ts"
import { buildSystemMessage, normalizeContent, toolResultToString } from "./translate/request.ts"

const IMAGE_TOKEN_ESTIMATE = 2000

// Approximate — Kimi's tokenizer isn't gpt-tokenizer, but Claude Code's
// compaction logic only needs a monotonic estimate, not an exact count.
export function countTokens(req: AnthropicRequest): number {
  let total = 0
  const system = buildSystemMessage(req.system)
  if (system) total += encode(system).length

  for (const msg of req.messages) {
    const blocks = normalizeContent(msg.content)
    for (const block of blocks) {
      if (block.type === "text") {
        total += encode(block.text).length
      } else if (block.type === "image") {
        total += IMAGE_TOKEN_ESTIMATE
      } else if (block.type === "tool_use") {
        total += encode(block.name).length
        total += encode(JSON.stringify(block.input ?? {})).length
      } else if (block.type === "tool_result") {
        total += encode(toolResultToString(block.content)).length
      }
    }
  }

  for (const tool of req.tools ?? []) {
    total += encode(tool.name).length
    if (tool.description) total += encode(tool.description).length
    total += encode(JSON.stringify(tool.input_schema ?? {})).length
  }

  total += req.messages.length * 4
  return total
}

export function countTranslatedTokens(req: KimiChatRequest): number {
  let total = 0
  for (const m of req.messages) {
    if (m.role === "system") {
      total += encode(m.content).length
    } else if (m.role === "user") {
      if (typeof m.content === "string") total += encode(m.content).length
      else {
        for (const p of m.content) {
          if (p.type === "text") total += encode(p.text).length
          else total += IMAGE_TOKEN_ESTIMATE
        }
      }
    } else if (m.role === "assistant") {
      if (typeof m.content === "string") total += encode(m.content).length
      for (const tc of m.tool_calls ?? []) {
        total += encode(tc.function.name).length
        total += encode(tc.function.arguments).length
      }
    } else if (m.role === "tool") {
      if (typeof m.content === "string") total += encode(m.content).length
      else {
        for (const p of m.content) {
          if (p.type === "text") total += encode(p.text).length
          else total += IMAGE_TOKEN_ESTIMATE
        }
      }
    }
  }

  for (const tool of req.tools ?? []) {
    total += encode(tool.function.name).length
    if (tool.function.description) total += encode(tool.function.description).length
    total += encode(JSON.stringify(tool.function.parameters ?? {})).length
  }

  total += req.messages.length * 4
  return total
}
