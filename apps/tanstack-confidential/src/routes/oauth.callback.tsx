import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

type CallbackSearch = {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
};

/**
 * Server function that:
 *   1. Verifies the `state` cookie matches the one returned by the issuer.
 *   2. POSTs the auth code to the token endpoint, authenticated by the
 *      app's `client_secret` (this is the "confidential" part).
 *   3. Writes the access (and refresh) token into httpOnly cookies so the
 *      browser can't read or exfiltrate them.
 */
const exchangeCodeFn = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; state?: string }) => input)
  .handler(async ({ data }) => {
    const {
      getOAuth,
      decodeIdToken,
      COOKIE_ACCESS_TOKEN,
      COOKIE_REFRESH_TOKEN,
      COOKIE_OAUTH_STATE,
      COOKIE_PKCE_VERIFIER,
      COOKIE_USERINFO,
    } = await import("~/lib/oauth.server");
    const { getCookie, setCookie, deleteCookie } = await import(
      "@tanstack/react-start/server"
    );

    const expectedState = getCookie(COOKIE_OAUTH_STATE);
    if (!expectedState || expectedState !== data.state) {
      throw new Error(
        "OAuth state mismatch — possible CSRF, or your cookie expired. Try signing in again.",
      );
    }
    deleteCookie(COOKIE_OAUTH_STATE, { path: "/" });

    const codeVerifier = getCookie(COOKIE_PKCE_VERIFIER);
    deleteCookie(COOKIE_PKCE_VERIFIER, { path: "/" });
    if (!codeVerifier) {
      throw new Error(
        "Missing PKCE verifier cookie. Try signing in again from /.",
      );
    }

    const oauth = getOAuth();
    const tokens = await oauth.exchangeCode({
      code: data.code,
      codeVerifier,
    });

    setCookie(COOKIE_ACCESS_TOKEN, tokens.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: tokens.expires_in ?? 60 * 60,
      path: "/",
    });

    if (tokens.refresh_token) {
      setCookie(COOKIE_REFRESH_TOKEN, tokens.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }

    if (tokens.id_token) {
      try {
        const userinfo = decodeIdToken(tokens.id_token);
        setCookie(COOKIE_USERINFO, JSON.stringify(userinfo), {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: tokens.expires_in ?? 60 * 60,
          path: "/",
        });
      } catch (err) {
        console.warn("id_token decode failed:", err);
      }
    }
  });

function parseSearch(search: Record<string, unknown>): CallbackSearch {
  return {
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    error_description:
      typeof search.error_description === "string"
        ? search.error_description
        : undefined,
  };
}

export const Route = createFileRoute("/oauth/callback")({
  validateSearch: parseSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const search = deps as CallbackSearch;
    if (search.error) {
      throw new Error(search.error_description ?? search.error);
    }
    if (!search.code) {
      throw new Error("No authorization code in callback URL.");
    }
    await exchangeCodeFn({
      data: { code: search.code, state: search.state },
    });
    throw redirect({ to: "/dashboard" });
  },
  component: () => <p>Signing you in…</p>,
  errorComponent: ({ error }) => (
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
        {error.message}
      </pre>
      <a href="/" style={{ color: "#7aa4ff" }}>
        ← Start over
      </a>
    </div>
  ),
});
