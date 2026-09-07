import { promises as fs } from "node:fs";
import path from "node:path";
import type { Step } from "../context";
import { log } from "../context";
import { askClaude, stripFence } from "../ai";
import { collectRepoContext, contextBlock } from "./repo-context";

const SYSTEM = `당신은 오픈소스 레포를 한국 개발자에게 설명하는 테크니컬 라이터입니다.
README 를 그대로 번역하지 말고, 실제로 이 레포를 "받아서 돌려보는 사람" 순서대로 재구성하세요.
사실은 README·매니페스트에 있는 것만 쓰고, 없는 내용은 지어내지 말고 "README 에 명시되지 않음"이라고 적으세요.
코드블록·명령어·URL·옵션 이름은 원문 그대로 유지합니다. 출력은 마크다운만, 코드펜스로 전체를 감싸지 마세요.`;

/** README 한국어 설명서 (AI). ctx.artifacts.docs_ko + 레포 폴더에 EVERYGITHUB.ko.md 저장 */
export const docsStep: Step = {
  name: "docs",
  async run(ctx) {
    if (!ctx.anthropicApiKey) { ctx.emit({ step: "docs", level: "skipped", payload: { reason: "no_api_key" } }); return; }
    const c = await collectRepoContext(ctx);
    log(ctx, "docs", `한국어 설명서 생성 중 (README ${c.readme.length.toLocaleString()}자)`);
    const prompt = `${contextBlock(c)}

---
위 레포의 **한국어 설명서**를 아래 구조로 작성하세요. 각 섹션 제목은 그대로 사용합니다.

# ${c.repoName} 설명서
> 한 줄 요약 (이 레포가 무엇이고 누구에게 필요한지)

## 이게 뭔가요
- 핵심 기능 3~6개, 어떤 문제를 푸는지, 비슷한 도구와 다른 점(README 에 있으면)

## 준비물
- 필요한 런타임/버전, 계정, API 키 등. 필요 환경변수는 표로 (변수명 / 용도 / 필수 여부)

## 설치
- 실제 명령어 순서대로. 패키지 매니저는 감지된 것(${c.stack?.packageManager ?? "unknown"}) 기준

## 설정
- 설정 파일·환경변수·옵션 설명. 없으면 "별도 설정 없음"

## 첫 실행
- 가장 짧게 동작을 확인하는 명령과 기대 결과

## 자주 쓰는 사용법
- 대표 명령/코드 예시 3~5개, 각 예시에 한 줄 설명

## 클로드코드/AI 도구와 함께 쓰기
- MCP 서버·스킬·CLI 로 연동 가능한지, 가능하면 어떻게(README 근거가 있을 때만). 근거 없으면 "해당 없음"

## 주의할 점
- 라이선스(${c.license ?? "없음"}) 의미, 설치 스크립트(${c.stack?.installScripts?.join(", ") || "없음"}), 알려진 제한, 보안상 유의점

## 참고 링크
- 원문 README, 문서, 이슈 등 README 에 있는 링크만`;
    const md = stripFence(await askClaude(prompt, { apiKey: ctx.anthropicApiKey, system: SYSTEM, maxTokens: 7000 }));
    ctx.artifacts.docs_ko = md;
    try {
      const out = path.join(c.root, "EVERYGITHUB.ko.md");
      await fs.writeFile(out, md, "utf8");
      log(ctx, "docs", `설명서 저장: ${out}`);
    } catch {}
    ctx.emit({ step: "docs", level: "result", payload: { chars: md.length } });
  },
};
