import { createOAuthClient } from "@model-match/oauth";

/**
 * Confidential client — only ever imported from server functions / server
 * routes. The secret never leaves the server.
 *
 * If you accidentally import this from a component, the build will inline
 * `process.env.MODEL_MATCH_CLIENT_SECRET` into the client bundle. Don't.
 */
export function getOAuth() {
  const clientId = process.env.MODEL_MATCH_CLIENT_ID;
  const clientSecret = process.env.MODEL_MATCH_CLIENT_SECRET;
  const issuer =
    process.env.MODEL_MATCH_ISSUER ?? "https://auth.modelmatch.com";
  const redirectUri =
    process.env.MODEL_MATCH_REDIRECT_URI ??
    "http://localhost:3000/oauth/callback";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing MODEL_MATCH_CLIENT_ID / MODEL_MATCH_CLIENT_SECRET env vars. Copy .env.example to .env.",
    );
  }

  return createOAuthClient({
    issuer,
    clientId,
    clientSecret,
    redirectUri,
  });
}

export const COOKIE_ACCESS_TOKEN = "mm_access_token";
export const COOKIE_REFRESH_TOKEN = "mm_refresh_token";
export const COOKIE_OAUTH_STATE = "mm_oauth_state";
export const COOKIE_PKCE_VERIFIER = "mm_pkce_verifier";
export const COOKIE_USERINFO = "mm_userinfo";

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
 * Decode the payload of a JWT without verifying its signature. Safe for
 * *display only* — never trust these claims for an authorization decision.
 * The token was just delivered by the issuer over TLS, so showing the
 * user's own name to themselves is fine.
 */
export function decodeIdToken(idToken: string): UserInfo {
  const parts = idToken.split(".");
  if (parts.length < 2) throw new Error("id_token is not a JWT");
  const payload = parts[1]!;
  const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "===".slice((b64.length + 3) % 4);
  return JSON.parse(
    Buffer.from(padded, "base64").toString("utf8"),
  ) as UserInfo;
}
