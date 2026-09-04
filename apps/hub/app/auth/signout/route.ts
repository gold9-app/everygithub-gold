import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
export async function GET(req: Request) {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/", new URL(req.url).origin));
}
