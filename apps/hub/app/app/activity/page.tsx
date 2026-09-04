import { supabaseServer } from "@/lib/supabase";
import { ActivityList } from "./activity";

export const dynamic = "force-dynamic";
const LOCAL = new Set(["open", "remove", "pick_folder"]);
const isLocalJob = (j: any) => Array.isArray(j.steps) && j.steps.length > 0 && j.steps.every((s: string) => LOCAL.has(s));


export default async function ActivityPage() {
  const sb = await supabaseServer();
  const { data } = await sb.from("jobs").select("id,source,pipeline,steps,status,origin,created_at,finished_at,repo_id").order("created_at", { ascending: false }).limit(100);
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-1">활동</h1>
      <p className="text-sm text-fg-2 mb-6">모든 작업 이력. 항목을 펼치면 스텝별 로그를 볼 수 있습니다.</p>
      <ActivityList jobs={(data ?? []).filter((j) => !isLocalJob(j))} />
    </div>
  );
}
