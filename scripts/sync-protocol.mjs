// packages/protocol/src → apps/hub/lib/protocol 복사 (허브는 이 복사본을 import)
import { cpSync, rmSync, mkdirSync } from "node:fs";
rmSync("apps/hub/lib/protocol", { recursive: true, force: true });
mkdirSync("apps/hub/lib", { recursive: true });
cpSync("packages/protocol/src", "apps/hub/lib/protocol", { recursive: true });
console.log("synced packages/protocol/src → apps/hub/lib/protocol");
