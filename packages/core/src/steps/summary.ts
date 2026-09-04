import type { Step } from "../context";

const LICENSE_NOTE: Record<string, string> = {
  "MIT": "상업 이용·수정·재배포 가능. 저작권 고지만 유지하면 됨.",
  "Apache-2.0": "상업 이용 가능. 변경 사항 고지와 NOTICE 유지 의무. 특허 조항 포함.",
  "BSD-2-Clause": "상업 이용 가능. 저작권 고지 유지.",
  "BSD-3-Clause": "상업 이용 가능. 저작권 고지 유지, 이름을 홍보에 쓰지 않을 것.",
  "ISC": "MIT 와 거의 동일. 상업 이용 가능.",
  "MPL-2.0": "상업 이용 가능. 수정한 파일은 같은 라이선스로 공개해야 함(파일 단위).",
  "LGPL-3.0": "라이브러리로 링크해 쓰는 건 자유. 라이브러리 자체를 수정하면 공개 의무.",
  "GPL-3.0": "이 코드를 포함해 배포하는 소프트웨어 전체를 GPL 로 공개해야 함. 상용 제품에 넣기 전 검토 필요.",
  "GPL-2.0": "GPL-3.0 과 유사한 카피레프트. 배포 시 소스 공개 의무.",
  "AGPL-3.0": "네트워크로 서비스만 해도 소스 공개 의무. SaaS 에 쓰려면 주의.",
  "Unlicense": "퍼블릭 도메인. 제한 없음.",
  "UNKNOWN": "라이선스 파일은 있으나 자동 식별 실패. 직접 확인 필요.",
};

/** AI 없이 만드는 기본 요약 카드 (마크다운). 텔레그램/웹 카드의 본문이 된다. */
export const summaryStep: Step = {
  name: "summary",
  async run(ctx) {
    const { source } = ctx.job;
    const s = ctx.stack;
    const lic = ctx.license;
    const lines: string[] = [];
    lines.push(`# ${source.owner}/${source.name}`);
    lines.push("");
    lines.push(`- 위치: \`${ctx.localPath}\``);
    if (source.ref) lines.push(`- ref: \`${source.ref}\``);
    if (source.path) lines.push(`- 서브폴더: \`${source.path}\``);
    if (source.prNumber) lines.push(`- PR #${source.prNumber}`);
    if (s) {
      lines.push(`- 언어: ${s.languages.join(", ") || "감지 안 됨"}${s.framework ? ` · ${s.framework}` : ""}`);
      lines.push(`- 패키지 매니저: ${s.packageManager}${s.runtime ? ` · 런타임 ${s.runtime}` : ""}`);
      lines.push(`- 파일 ${s.fileCount}개 · 테스트 ${s.hasTests ? "있음" : "없음"} · Docker ${s.hasDocker ? "있음" : "없음"}`);
      const badges: string[] = [];
      if (s.isMcpServer) badges.push("MCP 서버");
      if (s.isClaudeSkill) badges.push("클로드 스킬");
      if (badges.length) lines.push(`- 종류: ${badges.join(", ")}`);
      if (s.installScripts.length) lines.push(`- ⚠️ 설치 시 자동 실행 스크립트: ${s.installScripts.join(", ")} — 설치 전 내용 확인 권장`);
      if (s.envKeys.length) lines.push(`- 필요 환경변수 ${s.envKeys.length}개: ${s.envKeys.slice(0, 8).join(", ")}${s.envKeys.length > 8 ? " …" : ""}`);
    }
    lines.push(`- 라이선스: ${lic ?? "없음(주의: 라이선스 미표기 = 기본적으로 재사용 불가)"}`);
    if (lic && LICENSE_NOTE[lic]) lines.push(`  - ${LICENSE_NOTE[lic]} (법률 자문 아님)`);
    lines.push("");
    lines.push("## 추천 액션");
    if (s?.isMcpServer) lines.push("- `mcp` — 클로드코드에 MCP 서버로 등록");
    if (s?.isClaudeSkill) lines.push("- `skill` — 클로드코드 스킬로 등록");
    if (s?.scripts?.dev || s?.scripts?.start) lines.push("- `dev` — 설치 후 dev 서버 실행");
    if (s?.hasTests) lines.push("- `test` — 테스트 실행");
    lines.push("- `docs` — README 한국어 설명서 생성" + (ctx.anthropicApiKey ? "" : " (AI 연결 필요)"));
    lines.push("");
    lines.push("## 구조");
    lines.push("```");
    lines.push(ctx.tree ?? "");
    lines.push("```");
    const md = lines.join("\n");
    ctx.artifacts.summary = md;
    ctx.emit({ step: "summary", level: "result", payload: { summary: md } });
  },
};
