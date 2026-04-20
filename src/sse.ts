export interface SseEvent {
  event?: string
  data: string
}

export function encodeSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

const BOUNDARY = /\r\n\r\n|\n\n|\r\r/

export async function* parseSseStream(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ""
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let match: RegExpExecArray | null
      while ((match = BOUNDARY.exec(buf)) !== null) {
        const raw = buf.slice(0, match.index)
        buf = buf.slice(match.index + match[0].length)
        const evt = parseEventBlock(raw)
        if (evt) yield evt
      }
    }
    if (buf.trim()) {
      const evt = parseEventBlock(buf)
      if (evt) yield evt
    }
  } finally {
    reader.releaseLock()
  }
}

function parseEventBlock(raw: string): SseEvent | undefined {
  let event: string | undefined
  const dataLines: string[] = []
  // Per SSE spec, lines are terminated by CR, LF, or CRLF.
  for (const line of raw.split(/\r\n|\n|\r/)) {
    if (!line || line.startsWith(":")) continue
    const colon = line.indexOf(":")
    const field = colon === -1 ? line : line.slice(0, colon)
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "")
    if (field === "event") event = value
    else if (field === "data") dataLines.push(value)
  }
  if (!dataLines.length && !event) return undefined
  return { event, data: dataLines.join("\n") }
}
