import { createLogger, logDir } from "./log.ts"
import type { AnthropicRequest } from "./anthropic/schema.ts"
import type { Provider, RequestContext } from "./providers/types.ts"

const log = createLogger("server")

export interface ServeOptions {
  port: number
  provider: Provider
}

const sessionSeqs = new Map<string, number>()

function nextSessionSeq(sessionId?: string): number | undefined {
  if (!sessionId) return undefined
  const seq = (sessionSeqs.get(sessionId) ?? 0) + 1
  sessionSeqs.set(sessionId, seq)
  return seq
}

export function startServer(opts: ServeOptions): { stop: () => void; port: number } {
  const { provider } = opts
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: opts.port,
    idleTimeout: 255,
    async fetch(req) {
      const url = new URL(req.url)
      const start = Date.now()
      const reqId = crypto.randomUUID()
      log.info("request", {
        reqId,
        method: req.method,
        path: url.pathname,
        query: url.search,
        provider: provider.name,
      })
      try {
        const resp = await route(req, url, reqId, provider)
        log.info("response", { reqId, status: resp.status, ms: Date.now() - start })
        return resp
      } catch (err) {
        log.error("handler error", { reqId, err: String(err), stack: (err as Error)?.stack })
        return jsonError(500, "internal_error", String(err))
      }
    },
  })
  log.info("server listening", { port: server.port, provider: provider.name, logDir: logDir() })
  return {
    port: Number(server.port),
    stop: () => server.stop(),
  }
}

async function route(req: Request, url: URL, reqId: string, provider: Provider): Promise<Response> {
  if (url.pathname === "/healthz") {
    return new Response(JSON.stringify({ ok: true, provider: provider.name }), {
      headers: { "content-type": "application/json" },
    })
  }

  if (req.method === "POST" && url.pathname === "/v1/messages/count_tokens") {
    const body = await parseJsonBody(req)
    if (body instanceof Response) return body
    const sessionId = req.headers.get("x-claude-code-session-id") || undefined
    const ctx: RequestContext = {
      reqId,
      sessionId,
      sessionSeq: nextSessionSeq(sessionId),
      signal: req.signal,
    }
    return provider.handleCountTokens(body, ctx)
  }

  if (req.method === "POST" && url.pathname === "/v1/messages") {
    const body = await parseJsonBody(req)
    if (body instanceof Response) return body
    const sessionId = req.headers.get("x-claude-code-session-id") || undefined
    const ctx: RequestContext = {
      reqId,
      sessionId,
      sessionSeq: nextSessionSeq(sessionId),
      signal: req.signal,
    }
    return provider.handleMessages(body, ctx)
  }

  return jsonError(404, "not_found", `No route for ${req.method} ${url.pathname}`)
}

async function parseJsonBody(req: Request): Promise<AnthropicRequest | Response> {
  try {
    return (await req.json()) as AnthropicRequest
  } catch (err) {
    return jsonError(400, "invalid_request_error", `Invalid JSON: ${err}`)
  }
}

function jsonError(status: number, type: string, message: string): Response {
  return new Response(JSON.stringify({ type: "error", error: { type, message } }), {
    status,
    headers: { "content-type": "application/json" },
  })
}
