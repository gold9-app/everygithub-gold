import { supabaseServer } from "@/lib/supabase";
import { Library as LibraryView } from "./library";

export const dynamic = "force-dynamic";

export default async function ReposPage() {
  const sb = await supabaseServer();
  const { data } = await sb.from("repos").select("id,owner,name,url,ref,local_path,stack,license,stars,tags,cloned_at,updated_at").order("updated_at", { ascending: false }).limit(500);
  return <LibraryView repos={data ?? []} />;
}
