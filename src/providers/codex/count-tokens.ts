import { encode } from "gpt-tokenizer/model/gpt-4o"
import type { AnthropicRequest } from "../../anthropic/schema.ts"
import type { ResponsesRequest } from "./translate/request.ts"
import { buildInstructions, normalizeContent, toolResultToString } from "./translate/request.ts"

const IMAGE_TOKEN_ESTIMATE = 2000

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

export function countTranslatedTokens(
  req: Pick<ResponsesRequest, "instructions" | "input" | "tools" | "text" | "tool_choice">,
): number {
  let total = 0
  if (req.instructions) total += encode(req.instructions).length

  for (const item of req.input) {
    if (item.type === "message") {
      for (const part of item.content) {
        if (part.type === "input_text" || part.type === "output_text") {
          total += encode(part.text).length
        } else if (part.type === "input_image") {
          total += IMAGE_TOKEN_ESTIMATE
        }
      }
    } else if (item.type === "function_call") {
      total += encode(item.call_id).length
      total += encode(item.name).length
      total += encode(item.arguments).length
    } else if (item.type === "function_call_output") {
      total += encode(item.call_id).length
      total += encode(item.output).length
    }
  }

  for (const tool of req.tools ?? []) {
    total += encode(tool.name).length
    if (tool.description) total += encode(tool.description).length
    total += encode(JSON.stringify(tool.parameters ?? {})).length
  }

  if (req.text?.format?.type === "json_schema") {
    total += encode(req.text.format.name).length
    total += encode(JSON.stringify(req.text.format.schema)).length
  }

  if (typeof req.tool_choice === "string") {
    total += encode(req.tool_choice).length
  } else if (req.tool_choice?.type === "function") {
    total += encode(req.tool_choice.type).length
    total += encode(req.tool_choice.name).length
  }

  total += req.input.length * 4
  return total
}
