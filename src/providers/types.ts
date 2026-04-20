import type { AnthropicRequest } from "../anthropic/schema.ts"

export interface RequestContext {
  reqId: string
  sessionId?: string
  sessionSeq?: number
  signal: AbortSignal
}

export interface CliHandlers {
  login?: () => Promise<void>
  device?: () => Promise<void>
  status: () => Promise<void>
  logout: () => Promise<void>
}

export interface Provider {
  name: string
  handleMessages(body: AnthropicRequest, ctx: RequestContext): Promise<Response>
  handleCountTokens(body: AnthropicRequest, ctx: RequestContext): Promise<Response>
  cli: CliHandlers
}
