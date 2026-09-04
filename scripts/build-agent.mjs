// 에이전트를 단일 파일로 번들 (심볼릭 링크·워크스페이스 불필요)
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
mkdirSync("apps/agent/dist", { recursive: true });
await build({
  entryPoints: ["apps/agent/src/cli.ts"],
  outfile: "apps/agent/dist/cli.js",
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  banner: { js: "#!/usr/bin/env node\nimport { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  alias: { "@everygithub/protocol": "./packages/protocol/src/index.ts", "@everygithub/core": "./packages/core/src/index.ts" },
  logLevel: "info",
});
