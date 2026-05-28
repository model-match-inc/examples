import { useState } from "react";
import { createPKCE } from "@model-match/oauth";
import { STORAGE, oauth } from "../lib/oauth";

export function Login({ onLogout }: { onLogout: () => void }) {
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);

    // PKCE step 1: generate a random "code_verifier" and its SHA-256
    // hash "code_challenge". The verifier stays in this browser. Only
    // the challenge goes to the issuer in the redirect URL.
    const pkce = await createPKCE();
    const state = crypto.randomUUID();

    sessionStorage.setItem(STORAGE.CODE_VERIFIER, pkce.codeVerifier);
    sessionStorage.setItem(STORAGE.STATE, state);

    const url = await oauth.createAuthorizationUrl({
      scopes: ["openid", "profile", "email", "market-insights:read"],
      state,
      codeChallenge: pkce.codeChallenge,
      codeChallengeMethod: "S256",
    });

    window.location.assign(url.toString());
  }

  const accessToken = sessionStorage.getItem(STORAGE.ACCESS_TOKEN);

  return (
    <div>
      <p style={{ lineHeight: 1.6, color: "#c2cae6" }}>
        This is a single-page app with <strong>no backend</strong>. We can't
        store a <code>client_secret</code> here — anyone could open DevTools and
        steal it. Instead we use <strong>PKCE</strong>: a one-time random secret
        generated in your browser, hashed, and sent to the issuer. Only your
        browser knows the original value, so only your browser can complete the
        token exchange.
      </p>

      {accessToken ? (
        <div style={{ marginTop: 24 }}>
          <p style={{ color: "#9cd99c" }}>
            ✓ You already have an access token in sessionStorage.
          </p>
          <a
            href="/dashboard"
            style={{
              display: "inline-block",
              marginRight: 12,
              padding: "10px 16px",
              borderRadius: 8,
              background: "#3b4ad1",
              color: "white",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            View dashboard →
          </a>
          <button
            type="button"
            onClick={onLogout}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #4453a8",
              background: "transparent",
              color: "#c2cae6",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleSignIn}
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
          {busy ? "Redirecting…" : "Sign in with Model Match (PKCE) →"}
        </button>
      )}

      <ol style={{ marginTop: 40, color: "#9ba6cf", lineHeight: 1.7 }}>
        <li>
          <code>createPKCE()</code> → makes a random <code>codeVerifier</code> +{" "}
          <code>codeChallenge = SHA256(codeVerifier)</code>.
        </li>
        <li>
          We stash the <code>codeVerifier</code> in <code>sessionStorage</code>{" "}
          and redirect to <code>/authorize</code> with the{" "}
          <code>codeChallenge</code>.
        </li>
        <li>
          The issuer redirects back to <code>/oauth/callback?code=…</code>.
        </li>
        <li>
          We POST <code>{`{ code, code_verifier }`}</code> to{" "}
          <code>/token</code>. The server hashes the verifier and checks it
          matches the challenge it saw earlier — proving the same browser that
          started the flow is finishing it.{" "}
          <strong>No secret was ever shared.</strong>
        </li>
      </ol>
    </div>
  );
}
