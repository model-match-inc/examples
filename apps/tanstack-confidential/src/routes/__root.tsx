import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Model Match — TanStack Start (Confidential Client demo)" },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body
        style={{
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
          margin: 0,
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
              Model Match · TanStack Start
            </p>
            <h1 style={{ margin: "4px 0 0", fontSize: 28 }}>
              Confidential OAuth client
            </h1>
          </header>
          <Outlet />
        </div>
        <Scripts />
      </body>
    </html>
  );
}
