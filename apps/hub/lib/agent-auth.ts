import { createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "./supabase";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newToken = () => "egh_" + randomBytes(24).toString("hex");
export const sixDigits = () => String(Math.floor(100000 + Math.random() * 900000));

/** Authorization: Bearer <deviceToken> → device row (없으면 null). last_seen 갱신 */
export async function authDevice(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const sb = supabaseAdmin();
  const { data } = await sb.from("devices").select("*").eq("token_hash", sha256(token)).maybeSingle();
  if (!data) return null;
  await sb.from("devices").update({ last_seen: new Date().toISOString() }).eq("id", data.id);
  return data as { id: string; user_id: string; workspace_path: string; name: string };
}
