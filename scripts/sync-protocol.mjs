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
  console.log("synced apps/agent/dist/cli.mjs → apps/hub/public/agent/cli.mjs");
}
