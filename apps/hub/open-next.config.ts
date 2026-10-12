import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// ISR/캐시를 쓰지 않으므로 별도 R2/KV 바인딩 없이 기본 설정
export default defineCloudflareConfig({});
