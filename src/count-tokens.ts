import { encode } from "gpt-tokenizer/model/gpt-4o"
import type { AnthropicRequest } from "./anthropic/schema.ts"
import { buildInstructions, normalizeContent, toolResultToString } from "./translate/request.ts"

export function countTokens(req: AnthropicRequest): number {
  let total = 0
  const instructions = buildInstructions(req.system)
  if (instructions) total += encode(instructions).length

  for (const msg of req.messages) {
    const blocks = normalizeContent(msg.content)
    for (const block of blocks) {
      if (block.type === "text") {
        total += encode(block.text).length
      } else if (block.type === "image") {
        const value = block.source.type === "url" ? block.source.url : `data:${block.source.media_type};base64,${block.source.data}`
        total += encode(value).length
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
