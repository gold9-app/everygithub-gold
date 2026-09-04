import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase";
import { meStatus } from "@/lib/data";
import { Welcome } from "./welcome";

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const user = await currentUser();
  if (!user) redirect("/");
  const s = await meStatus(user.id);
  return <Welcome initial={{ hasDevice: s.devices.length > 0, online: s.devices.some((d) => d.online), telegram: s.telegram }} />;
}
