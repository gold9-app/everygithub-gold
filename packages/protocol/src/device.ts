import { z } from "zod";

export const DeviceOS = z.enum(["windows", "mac", "linux"]);

export const DeviceInfo = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  os: DeviceOS,
  agentVersion: z.string(),
  workspacePath: z.string(),
  lastSeen: z.string().nullable(),
});
export type DeviceInfo = z.infer<typeof DeviceInfo>;

/** 페어링: 사이트가 발급한 코드(6자리) 또는 설치 토큰(긴 문자열) + 기기정보 → device_token */
export const PairRequest = z.object({
  code: z.string().min(6),
  name: z.string(),
  os: DeviceOS,
  agentVersion: z.string(),
  workspacePath: z.string().optional(), // 비우면 허브가 기본값(내 문서\everygithub) 사용
});
export type PairRequest = z.infer<typeof PairRequest>;

export const PairResponse = z.object({
  deviceId: z.string().uuid(),
  deviceToken: z.string(),
});
export type PairResponse = z.infer<typeof PairResponse>;

/** 에이전트가 허브에서 내려받는 실행 설정. 사이트 설정 화면에서 바꾸면 다음 폴링 때 반영 */
export const AgentSettings = z.object({
  workspacePath: z.string(),
  anthropicApiKey: z.string().optional(),
  approve: z.enum(["auto", "ask"]).default("ask"),
  pollIntervalMs: z.number().default(3000),
});
export type AgentSettings = z.infer<typeof AgentSettings>;
