import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase";
import { meStatus } from "@/lib/data";
import { AppShell } from "@/components/shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/");
  const s = await meStatus(user.id);
  // 첫 방문: PC 가 하나도 없고 온보딩을 끝내지 않았으면 /welcome
  if (s.devices.length === 0 && !s.settings.onboarded) redirect("/welcome");
  return <AppShell initialStatus={{ devices: s.devices, telegram: s.telegram }} login={s.login}>{children}</AppShell>;
}
