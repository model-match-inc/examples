import { useEffect, useMemo, useState } from "react";
import {
  Agents,
  createApiClient,
  type AgentSummary,
} from "@model-match/api";
import { STORAGE, type UserInfo } from "../lib/oauth";

type Status =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; rows: AgentSummary[] };

const apiClient = createApiClient({
  baseUrl: import.meta.env.VITE_MMR_API_URL ?? "http://localhost:3001",
});

function readUser(): UserInfo | null {
  const raw = sessionStorage.getItem(STORAGE.USERINFO);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
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
    const granted = sessionStorage.getItem(STORAGE.GRANTED_SCOPE) ?? "(none)";
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
        <div>
          Signed in, but no <code>id_token</code> was returned.
        </div>
        <div style={{ marginTop: 6 }}>
          Issuer granted scope:{" "}
          <code style={{ color: "#e6e9f5" }}>{granted}</code>
        </div>
        <div style={{ marginTop: 6, fontSize: 12 }}>
          If <code>openid</code> isn't listed there, your OAuth client
          registration probably needs <code>openid</code> (and{" "}
          <code>profile</code>/<code>email</code>) added to its allowed
          scopes.
        </div>
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

function fmtMoney(n?: number) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const user = useMemo(readUser, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = sessionStorage.getItem(STORAGE.ACCESS_TOKEN);
      if (!token) {
        setStatus({
          kind: "error",
          message: "Not signed in — go back home and click sign in.",
        });
        return;
      }

      try {
        const { data } = await Agents.list({
          client: apiClient,
          headers: { Authorization: `Bearer ${token}` },
          body: {
            flatFilters: { city: "Long Beach", state: "CA" },
            pagination: { size: 4 },
          },
        });
        if (cancelled) return;
        setStatus({ kind: "done", rows: data?.data ?? [] });
      } catch (err) {
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <UserBadge user={user} />
      <p style={{ color: "#9cd99c" }}>
        ✓ Signed in. Access token is in <code>sessionStorage</code>.
      </p>
      <h2 style={{ marginTop: 32 }}>4 agents in Long Beach, CA</h2>
      <p style={{ color: "#7a86b8", fontSize: 13, marginTop: -8 }}>
        <code>Agents.list({"{ flatFilters: { city, state }, pagination: { size: 4 } }"})</code>
      </p>
      {status.kind === "loading" && <p>Loading…</p>}
      {status.kind === "error" && (
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
      )}
      {status.kind === "done" && status.rows.length === 0 && (
        <p style={{ color: "#7a86b8" }}>No agents found.</p>
      )}
      {status.kind === "done" && (
        <ul style={{ padding: 0, listStyle: "none" }}>
          {status.rows.map((agent) => {
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
      )}
      <button
        type="button"
        onClick={onLogout}
        style={{
          marginTop: 12,
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
  );
}
