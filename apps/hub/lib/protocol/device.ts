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

/** 페어링: 허브가 6자리 코드 발급 → 에이전트가 코드+기기정보 제출 → device_token 수령 */
export const PairRequest = z.object({
  code: z.string().length(6),
  name: z.string(),
  os: DeviceOS,
  agentVersion: z.string(),
  workspacePath: z.string(),
});
export type PairRequest = z.infer<typeof PairRequest>;

export const PairResponse = z.object({
  deviceId: z.string().uuid(),
  deviceToken: z.string(),
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string(),
});
export type PairResponse = z.infer<typeof PairResponse>;
