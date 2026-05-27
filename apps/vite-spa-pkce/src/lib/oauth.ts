import { createOAuthClient } from "@model-match/oauth";

const clientId = import.meta.env.VITE_MODEL_MATCH_CLIENT_ID;
const issuer =
  import.meta.env.VITE_MODEL_MATCH_ISSUER ?? "https://auth.modelmatch.com";
const redirectUri =
  import.meta.env.VITE_MODEL_MATCH_REDIRECT_URI ??
  `${window.location.origin}/oauth/callback`;

if (!clientId) {
  throw new Error(
    "Missing VITE_MODEL_MATCH_CLIENT_ID. Copy .env.example to .env.local.",
  );
}

/**
 * A *public* OAuth client. No secret — the browser cannot keep one.
 * Auth is proven at the token endpoint with PKCE instead (see pages/Login).
 */
export const oauth = createOAuthClient({
  issuer,
  clientId,
  redirectUri,
});

export const STORAGE = {
  CODE_VERIFIER: "mm_pkce_code_verifier",
  STATE: "mm_oauth_state",
  ACCESS_TOKEN: "mm_access_token",
  EXPIRES_AT: "mm_access_token_expires_at",
  USERINFO: "mm_userinfo",
  GRANTED_SCOPE: "mm_granted_scope",
} as const;

/**
 * Standard OIDC ID-token claims. Issuers may add custom ones.
 * See https://openid.net/specs/openid-connect-core-1_0.html#IDToken and
 * https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims
 */
export type UserInfo = {
  sub: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  [claim: string]: unknown;
};

/**
 * Decode the payload of a JWS-compact JWT without verifying its signature.
 *
 * This is only safe for *display* — never trust these claims for an
 * authorization decision in the browser. The token was just delivered to us
 * by the issuer over TLS at the token endpoint, so for showing the user's
 * own name to themselves this is fine.
 */
export function decodeIdToken(idToken: string): UserInfo {
  const parts = idToken.split(".");
  if (parts.length < 2) throw new Error("id_token is not a JWT");
  const payload = parts[1]!;
  // base64url -> base64
  const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "===".slice((b64.length + 3) % 4);
  const json = decodeURIComponent(
    atob(padded)
      .split("")
      .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join(""),
  );
  return JSON.parse(json) as UserInfo;
}
