import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase";
import { meStatus } from "@/lib/data";
export const dynamic = "force-dynamic";
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const s = await meStatus(user.id);
  return NextResponse.json({ devices: s.devices, telegram: s.telegram });
}
