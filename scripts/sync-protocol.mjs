// packages/protocol/src → apps/hub/lib/protocol 복사 (허브는 이 복사본을 import)
import { cpSync, rmSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
rmSync("apps/hub/lib/protocol", { recursive: true, force: true });
mkdirSync("apps/hub/lib", { recursive: true });
cpSync("packages/protocol/src", "apps/hub/lib/protocol", { recursive: true });
console.log("synced packages/protocol/src → apps/hub/lib/protocol");

// 에이전트 번들 → 허브 public (사이트가 /agent/cli.mjs 로 배포)
if (existsSync("apps/agent/dist/cli.mjs")) {
  mkdirSync("apps/hub/public/agent", { recursive: true });
  copyFileSync("apps/agent/dist/cli.mjs", "apps/hub/public/agent/cli.mjs");
  const { createHash } = await import("node:crypto");
  const { readFileSync, writeFileSync } = await import("node:fs");
  const sha = createHash("sha256").update(readFileSync("apps/agent/dist/cli.mjs")).digest("hex");
  writeFileSync("apps/hub/public/agent/cli.mjs.sha256", sha + "\n");
  // 허브가 에이전트 응답 헤더(x-agent-sha)에 실어 보내는 값 — 주기적 업데이트 확인 요청이 필요 없어진다
  writeFileSync("apps/hub/lib/agent-bundle.ts", `// scripts/sync-protocol.mjs 가 생성. 직접 수정하지 말 것\nexport const AGENT_BUNDLE_SHA = "${sha}";\n`);
  console.log("synced apps/agent/dist/cli.mjs → apps/hub/public/agent/cli.mjs");
}
