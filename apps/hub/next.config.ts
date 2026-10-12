import type { NextConfig } from "next";
import path from "node:path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = { outputFileTracingRoot: path.join(__dirname) };
export default nextConfig;

// 로컬 `next dev` 에서도 Cloudflare 바인딩/env 를 흉내낸다 (배포 빌드에는 영향 없음)
initOpenNextCloudflareForDev();
