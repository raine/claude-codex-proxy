// Opaque per-block signature for Anthropic thinking blocks. Claude Code
// treats this as a passthrough string, so the only requirements are:
// stable per (messageId, blockIndex) and identical between the streaming
// and non-streaming paths.
export function makeThinkingSignature(messageId: string, index: number): string {
  return Buffer.from(`ccp:kimi:v1:${messageId}:${index}`).toString("base64url")
}
