import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

/**
 * Server function — runs ONLY on the server.
 *
 * 1. Builds the Model Match `/authorize` URL using your `client_id`.
 * 2. Generates random `state` + PKCE verifier, stashes both in httpOnly
 *    cookies so the callback can verify state (CSRF) and complete PKCE.
 * 3. Returns the authorize URL so the client can redirect to it.
 *
 * Even though this is a confidential client (we'll use `client_secret` at
 * the token endpoint), modern OAuth 2.1 issuers require PKCE for *every*
 * client. So we do both.
 */
const startLoginFn = createServerFn({ method: "POST" }).handler(async () => {
  const { getOAuth, COOKIE_OAUTH_STATE, COOKIE_PKCE_VERIFIER } = await import(
    "~/lib/oauth.server"
  );
  const { setCookie } = await import("@tanstack/react-start/server");
  const { createPKCE } = await import("@model-match/oauth");

  const oauth = getOAuth();
  const state = crypto.randomUUID();
  const pkce = await createPKCE();

  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  };

  setCookie(COOKIE_OAUTH_STATE, state, cookieOpts);
  setCookie(COOKIE_PKCE_VERIFIER, pkce.codeVerifier, cookieOpts);

  const url = await oauth.createAuthorizationUrl({
    scopes: [
      "openid",
      "profile",
      "email",
      "market-insights:read",
      "property-enrichment:run",
    ],
    state,
    codeChallenge: pkce.codeChallenge,
    codeChallengeMethod: "S256",
  });

  return { url: url.toString() };
});

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    const { url } = await startLoginFn();
    window.location.assign(url);
  }

  return (
    <div>
      <p style={{ lineHeight: 1.6, color: "#c2cae6" }}>
        Click the button below to kick off an OAuth Authorization Code flow.
        Because this app has a backend, we use a <strong>confidential client</strong>:
        the <code>client_secret</code> lives on the server and is used to
        authenticate the token exchange.
      </p>

      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        style={{
          marginTop: 24,
          padding: "12px 20px",
          borderRadius: 8,
          border: "1px solid #4453a8",
          background: "#3b4ad1",
          color: "white",
          fontSize: 15,
          fontWeight: 600,
          cursor: busy ? "wait" : "pointer",
        }}
      >
        {busy ? "Redirecting…" : "Sign in with Model Match →"}
      </button>

      <ol style={{ marginTop: 40, color: "#9ba6cf", lineHeight: 1.7 }}>
        <li>
          The button POSTs to a TanStack <code>createServerFn</code>, which
          builds the <code>/authorize</code> URL and redirects you to
          Model&nbsp;Match.
        </li>
        <li>
          You sign in there, then get redirected to
          <code> /oauth/callback?code=…&amp;state=…</code>.
        </li>
        <li>
          The callback server route swaps the <code>code</code> for an{" "}
          <code>access_token</code> using <code>client_secret</code>, stores
          the token in an httpOnly cookie, and sends you to{" "}
          <code>/dashboard</code>.
        </li>
      </ol>
    </div>
  );
}
