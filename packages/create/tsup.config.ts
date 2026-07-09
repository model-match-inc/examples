import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts", "src/index.ts", "src/gen.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "node20",
  // deps (clack/giget/zod) are externalized automatically from package.json
});
