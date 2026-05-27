import { useCallback, useState } from "react";
import { Login } from "./pages/Login";
import { Callback } from "./pages/Callback";
import { Dashboard } from "./pages/Dashboard";
import { STORAGE } from "./lib/oauth";

/**
 * Hand-rolled routing — no router lib for this tiny demo. Three "pages":
 *   /                  → <Login />
 *   /oauth/callback    → <Callback />  (parses ?code, exchanges, redirects)
 *   /dashboard         → <Dashboard /> (calls @model-match/api with token)
 */
export function App() {
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((n) => n + 1), []);

  const path = window.location.pathname;

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE.ACCESS_TOKEN);
    sessionStorage.removeItem(STORAGE.EXPIRES_AT);
    sessionStorage.removeItem(STORAGE.USERINFO);
    window.history.replaceState({}, "", "/");
    rerender();
  }, [rerender]);

  let page;
  if (path === "/oauth/callback") {
    page = <Callback onSignedIn={rerender} />;
  } else if (path === "/dashboard") {
    page = <Dashboard onLogout={logout} />;
  } else {
    page = <Login onLogout={logout} />;
  }

  return (
    <div
      style={{
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        background: "#0b1020",
        color: "#e6e9f5",
        minHeight: "100vh",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
        <header style={{ marginBottom: 32 }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#7a86b8",
            }}
          >
            Model Match · Vite SPA
          </p>
          <h1 style={{ margin: "4px 0 0", fontSize: 28 }}>
            Public OAuth client (PKCE)
          </h1>
        </header>
        {page}
      </div>
    </div>
  );
}
