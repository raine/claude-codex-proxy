import { CLIENT_ID, ISSUER } from "./constants.ts"
import type { TokenResponse } from "./jwt.ts"

const POLL_SAFETY_MARGIN_MS = 3000

export async function runDeviceLogin(): Promise<TokenResponse> {
  const init = await fetch(`${ISSUER}/api/accounts/deviceauth/usercode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID }),
  })
  if (!init.ok) throw new Error(`Device init failed: ${init.status}`)
  const data = (await init.json()) as {
    device_auth_id: string
    user_code: string
    interval: string
  }
  const intervalMs = Math.max(parseInt(data.interval) || 5, 1) * 1000

  console.log(`\nVisit: ${ISSUER}/codex/device\nEnter code: ${data.user_code}\n`)

  while (true) {
    const resp = await fetch(`${ISSUER}/api/accounts/deviceauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_auth_id: data.device_auth_id,
        user_code: data.user_code,
      }),
    })
    if (resp.ok) {
      const body = (await resp.json()) as { authorization_code: string; code_verifier: string }
      const tokenResp = await fetch(`${ISSUER}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: body.authorization_code,
          redirect_uri: `${ISSUER}/deviceauth/callback`,
          client_id: CLIENT_ID,
          code_verifier: body.code_verifier,
        }).toString(),
      })
      if (!tokenResp.ok) throw new Error(`Token exchange failed: ${tokenResp.status}`)
      return (await tokenResp.json()) as TokenResponse
    }
    if (resp.status !== 403 && resp.status !== 404) {
      throw new Error(`Device poll failed: ${resp.status}`)
    }
    await new Promise((r) => setTimeout(r, intervalMs + POLL_SAFETY_MARGIN_MS))
  }
}
