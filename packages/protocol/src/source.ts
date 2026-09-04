import { z } from "zod";

/** 깃허브 URL을 파싱한 결과. 어떤 채널에서 들어와도 이 형태로 통일한다. */
export const SourceKind = z.enum(["repo", "subdir", "pr", "gist", "release", "commit"]);
export type SourceKind = z.infer<typeof SourceKind>;

export const Source = z.object({
  url: z.string().url(),
  kind: SourceKind,
  owner: z.string(),
  name: z.string(),
  ref: z.string().optional(), // branch / tag / sha
  path: z.string().optional(), // subdir (sparse checkout)
  prNumber: z.number().optional(),
  gistId: z.string().optional(),
});
export type Source = z.infer<typeof Source>;

const GH = /^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:\/(.*))?$/;
const GIST = /^https?:\/\/gist\.github\.com\/(?:[^/]+\/)?([0-9a-f]+)/;

/** github.com / gist.github.com URL → Source. 인식 실패 시 null. */
export function parseGithubUrl(input: string): Source | null {
  const url = input.trim().replace(/[)>\].,]+$/, "");
  const gist = url.match(GIST);
  if (gist) {
    return { url, kind: "gist", owner: "gist", name: gist[1], gistId: gist[1] };
  }
  const m = url.match(GH);
  if (!m) return null;
  const [, owner, name, rest = ""] = m;
  const base = { url, owner, name };
  if (!rest) return { ...base, kind: "repo" };
  const seg = rest.split("/").filter(Boolean);
  const head = seg[0];
  if (head === "tree" || head === "blob") {
    const ref = seg[1];
    const path = seg.slice(2).join("/");
    if (path) return { ...base, kind: "subdir", ref, path };
    return { ...base, kind: "repo", ref };
  }
  if (head === "pull" && seg[1]) return { ...base, kind: "pr", prNumber: Number(seg[1]) };
  if (head === "commit" && seg[1]) return { ...base, kind: "commit", ref: seg[1] };
  if (head === "releases") {
    const tag = seg[1] === "tag" ? seg[2] : undefined;
    return { ...base, kind: "release", ref: tag };
  }
  return { ...base, kind: "repo" };
}

/** 메시지 본문에서 첫 번째 깃허브 링크를 찾아낸다 (텔레그램/슬랙 입력용). */
export function extractGithubUrl(text: string): string | null {
  const m = text.match(/https?:\/\/(?:gist\.)?github\.com\/[^\s<>"']+/);
  return m ? m[0] : null;
}
