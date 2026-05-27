import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { AgentSummary } from "@model-match/api";
import type { UserInfo as ServerUserInfo } from "~/lib/oauth.server";

/**
 * Wire-safe subset of the id-token claims — TanStack Start's server fn
 * return type can't include an open `[claim: string]: unknown` index, so we
 * pick the standard OIDC claims we actually render.
 */
type UserInfo = {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  email?: string;
  picture?: string;
};

type DashboardData = {
  user: UserInfo | null;
  agents: AgentSummary[];
};

function toWireUser(u: ServerUserInfo): UserInfo {
  return {
    sub: u.sub,
    name: u.name,
    given_name: u.given_name,
    family_name: u.family_name,
    preferred_username: u.preferred_username,
    email: u.email,
    picture: u.picture,
  };
}

/**
 * Reads the access token + cached id-token claims from httpOnly cookies,
 * then uses `@model-match/api` to fetch agents server-side. The token never
 * touches the browser.
 */
const loadDashboardFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<DashboardData> => {
    const { COOKIE_ACCESS_TOKEN, COOKIE_USERINFO } = await import(
      "~/lib/oauth.server"
    );
    const { getCookie } = await import("@tanstack/react-start/server");
    const { Agents, createApiClient } = await import("@model-match/api");

    const token = getCookie(COOKIE_ACCESS_TOKEN);
    if (!token) {
      throw redirect({ to: "/" });
    }

    let user: UserInfo | null = null;
    const rawUser = getCookie(COOKIE_USERINFO);
    if (rawUser) {
      try {
        user = toWireUser(JSON.parse(rawUser) as ServerUserInfo);
      } catch {
        user = null;
      }
    }

    const apiClient = createApiClient({
      baseUrl: process.env.MMR_API_URL ?? "http://localhost:3001",
    });

    const { data } = await Agents.list({
      client: apiClient,
      headers: { Authorization: `Bearer ${token}` },
      body: {
        flatFilters: { city: "Long Beach", state: "CA" },
        pagination: { size: 4 },
      },
    });

    return { user, agents: data?.data ?? [] };
  },
);

function fmtMoney(n?: number) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function UserBadge({ user }: { user: UserInfo | null }) {
  if (!user) {
    return (
      <div
        style={{
          padding: "12px 16px",
          background: "#1a2140",
          borderRadius: 8,
          marginBottom: 24,
          color: "#7a86b8",
          fontSize: 13,
        }}
      >
        Signed in, but no <code>id_token</code> was returned by the issuer.
        Add <code>openid</code> / <code>profile</code> / <code>email</code>{" "}
        to the client's allowed scopes if you want a user badge here.
      </div>
    );
  }
  const name =
    user.name ??
    ([user.given_name, user.family_name].filter(Boolean).join(" ") ||
      user.preferred_username ||
      user.email ||
      user.sub);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: "#1a2140",
        borderRadius: 8,
        marginBottom: 24,
      }}
    >
      {user.picture ? (
        <img
          src={user.picture}
          alt=""
          width={40}
          height={40}
          style={{ borderRadius: 999, objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            background: "#3b4ad1",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {initials(name)}
        </div>
      )}
      <div>
        <div style={{ fontWeight: 600 }}>{name}</div>
        {user.email && user.email !== name && (
          <div style={{ fontSize: 12, color: "#7a86b8" }}>{user.email}</div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/dashboard")({
  loader: () => loadDashboardFn(),
  component: Dashboard,
});

function Dashboard() {
  const { user, agents } = Route.useLoaderData();

  return (
    <div>
      <UserBadge user={user} />
      <p style={{ color: "#9cd99c" }}>
        ✓ Signed in. Access token is sitting in an httpOnly cookie on the
        server side.
      </p>
      <h2 style={{ marginTop: 32 }}>4 agents in Long Beach, CA</h2>
      <p style={{ color: "#7a86b8", fontSize: 13, marginTop: -8 }}>
        <code>
          Agents.list(
          {"{ flatFilters: { city, state }, pagination: { size: 4 } }"})
        </code>
      </p>
      {agents.length === 0 && (
        <p style={{ color: "#7a86b8" }}>No agents found.</p>
      )}
      <ul style={{ padding: 0, listStyle: "none" }}>
        {agents.map((agent) => {
          const name =
            agent.fullName ??
            ([agent.firstName, agent.lastName]
              .filter(Boolean)
              .join(" ")
              .trim() ||
              "Unnamed agent");
          return (
            <li
              key={agent.id}
              style={{
                padding: "12px 16px",
                background: "#141b3a",
                borderRadius: 8,
                marginBottom: 8,
              }}
            >
              <div>
                <strong>{name}</strong>
                {agent.office && (
                  <span style={{ color: "#7a86b8", marginLeft: 8 }}>
                    · {agent.office}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: "#9ba6cf", marginTop: 4 }}>
                {fmtMoney(agent.volume)} volume · {agent.units ?? 0} units
                {agent.city && (
                  <span style={{ color: "#5a6694", marginLeft: 8 }}>
                    · {agent.city}, {agent.state}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#5a6694", marginTop: 2 }}>
                id: {agent.id}
              </div>
            </li>
          );
        })}
      </ul>
      <a href="/" style={{ color: "#7aa4ff" }}>
        ← Home
      </a>
    </div>
  );
}
