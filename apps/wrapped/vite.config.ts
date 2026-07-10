import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // `nitro()` produces the server build output. On Vercel, Nitro auto-detects
  // the platform and applies its `vercel` preset (Vercel ships zero-config
  // detection for TanStack Start + Nitro) — this is what makes the one-click
  // "Deploy to Vercel" button build successfully.
  plugins: [tsconfigPaths(), tanstackStart(), nitro(), viteReact()],
});
