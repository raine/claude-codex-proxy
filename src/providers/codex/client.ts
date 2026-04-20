import { CODEX_API_ENDPOINT, ORIGINATOR } from "./auth/constants.ts"
import { forceRefresh, getAuth } from "./auth/manager.ts"
import { createLogger } from "../../log.ts"
import type { ResponsesRequest } from "./translate/request.ts"

const log = createLogger("codex.client")

export interface CodexPostOptions {
  sessionId?: string
  signal?: AbortSignal
}

export interface CodexResponse {
  body: ReadableStream<Uint8Array>
  status: number
  headers: Headers
}

export async function postCodex(
  body: ResponsesRequest,
  opts: CodexPostOptions = {},
): Promise<CodexResponse> {
  let auth = await getAuth()
  let resp = await doFetch(auth.access, auth.accountId, body, opts)

  if (resp.status === 401) {
    log.warn("got 401, refreshing token", {})
    try {
      auth = await forceRefresh()
      resp = await doFetch(auth.access, auth.accountId, body, opts)
    } catch (err) {
      log.error("refresh after 401 failed", { err: String(err) })
    }
  }

  if (resp.status === 403) {
    const text = await safeText(resp)
    log.error("403 from upstream (non-refreshable)", { body: text })
    throw new CodexError(403, "Forbidden", text)
  }

  if (resp.status === 429) {
    const retryAfter = resp.headers.get("retry-after") || undefined
    const text = await safeText(resp)
    throw new CodexError(429, "Rate limited", text, { retryAfter })
  }

  if (!resp.ok) {
    const text = await safeText(resp)
    throw new CodexError(resp.status, "Upstream error", text)
  }

  if (!resp.body) throw new CodexError(500, "Upstream returned no body")

  return { body: resp.body, status: resp.status, headers: resp.headers }
}

async function doFetch(
  accessToken: string,
  accountId: string | undefined,
  body: ResponsesRequest,
  opts: CodexPostOptions,
): Promise<Response> {
  const headers = new Headers({
    "Content-Type": "application/json",
    accept: "text/event-stream",
    authorization: `Bearer ${accessToken}`,
    originator: ORIGINATOR,
    "openai-beta": "responses=experimental",
  })
  if (accountId) headers.set("ChatGPT-Account-Id", accountId)
  if (opts.sessionId) {
    headers.set("session_id", opts.sessionId)
    headers.set("x-client-request-id", opts.sessionId)
    headers.set("x-codex-window-id", `${opts.sessionId}:0`)
  }

  log.debug("posting to codex", {
    url: CODEX_API_ENDPOINT,
    model: body.model,
    inputCount: body.input.length,
    toolCount: body.tools?.length ?? 0,
    sessionId: opts.sessionId,
  })

  return fetch(CODEX_API_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: opts.signal,
  })
}

async function safeText(resp: Response): Promise<string> {
  try {
    return await resp.text()
  } catch {
    return ""
  }
}

export class CodexError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: string,
    public meta?: { retryAfter?: string },
  ) {
    super(message)
    this.name = "CodexError"
  }
}
