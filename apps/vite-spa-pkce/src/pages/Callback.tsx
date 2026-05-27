import { useEffect, useRef, useState } from "react";
import { parseOAuthCallback } from "@model-match/oauth";
import { STORAGE, decodeIdToken, oauth } from "../lib/oauth";

type Status =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done" };

export function Callback({ onSignedIn }: { onSignedIn: () => void }) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  // React StrictMode runs effects twice in dev. The OAuth `code` is
  // single-use and we delete the PKCE verifier on first read, so without
  // this guard the second invocation always fails with "state mismatch".
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      const callback = parseOAuthCallback(window.location.href);
      if (!callback.ok) {
        setStatus({
          kind: "error",
          message: callback.errorDescription ?? callback.error,
        });
        return;
      }

      const expectedState = sessionStorage.getItem(STORAGE.STATE);
      sessionStorage.removeItem(STORAGE.STATE);
      if (!expectedState || expectedState !== callback.state) {
        setStatus({
          kind: "error",
          message:
            "OAuth state mismatch — possible CSRF, or the tab was reloaded. Try signing in again.",
        });
        return;
      }

      const codeVerifier = sessionStorage.getItem(STORAGE.CODE_VERIFIER);
      sessionStorage.removeItem(STORAGE.CODE_VERIFIER);
      if (!codeVerifier) {
        setStatus({
          kind: "error",
          message:
            "Missing PKCE code_verifier. The browser session was lost — try signing in again.",
        });
        return;
      }

      try {
        const tokens = await oauth.exchangeCode({
          code: callback.code,
          codeVerifier,
        });

        sessionStorage.setItem(STORAGE.ACCESS_TOKEN, tokens.access_token);
        if (tokens.expires_in) {
          sessionStorage.setItem(
            STORAGE.EXPIRES_AT,
            String(Date.now() + tokens.expires_in * 1000),
          );
        }
        sessionStorage.setItem(STORAGE.GRANTED_SCOPE, tokens.scope ?? "");
        console.log("token response:", tokens);

        // Identity comes from the ID token (a JWT in `tokens.id_token`)
        // since this issuer doesn't expose a `/userinfo` endpoint. We're
        // only using it for display, not authorization, so unsigned decode
        // is fine.
        if (tokens.id_token) {
          try {
            const userinfo = decodeIdToken(tokens.id_token);
            sessionStorage.setItem(STORAGE.USERINFO, JSON.stringify(userinfo));
          } catch (err) {
            console.warn("id_token decode failed:", err);
          }
        }

        setStatus({ kind: "done" });
        window.history.replaceState({}, "", "/dashboard");
        onSignedIn();
      } catch (err) {
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    })();
  }, [onSignedIn]);

  if (status.kind === "loading") return <p>Signing you in…</p>;
  if (status.kind === "error") {
    return (
      <div>
        <h2 style={{ color: "#ff8a8a" }}>OAuth callback failed</h2>
        <pre
          style={{
            background: "#1a2140",
            padding: 16,
            borderRadius: 8,
            overflowX: "auto",
            color: "#ffd0d0",
          }}
        >
          {status.message}
        </pre>
        <a href="/" style={{ color: "#7aa4ff" }}>
          ← Start over
        </a>
      </div>
    );
  }
  return <p>Signed in. Redirecting…</p>;
}
