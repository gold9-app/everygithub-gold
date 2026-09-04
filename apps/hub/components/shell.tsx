"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Home, Library, Activity, Settings, Monitor, LogOut } from "lucide-react";

const NAV = [
  { href: "/app", label: "홈", icon: Home, exact: true },
  { href: "/app/repos", label: "라이브러리", icon: Library },
  { href: "/app/activity", label: "활동", icon: Activity },
  { href: "/app/settings", label: "설정", icon: Settings },
];

export type MeStatus = { devices: { id: string; name: string; online: boolean }[]; telegram: boolean };

/** 앱 셸: 좌측 내비 + 상단 PC 상태. 상태는 10초마다 갱신 */
export function AppShell({ children, initialStatus, login }: { children: ReactNode; initialStatus: MeStatus; login: string }) {
  const path = usePathname();
  const [status, setStatus] = useState(initialStatus);
  useEffect(() => {
    const t = setInterval(async () => {
      try { const r = await fetch("/api/me/status"); if (r.ok) setStatus(await r.json()); } catch {}
    }, 10_000);
    return () => clearInterval(t);
  }, []);
  const online = status.devices.filter((d) => d.online);

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-[232px] shrink-0 flex-col border-r border-line bg-bg-raised">
        <Link href="/app" className="flex items-center gap-2 px-5 h-14 border-b border-line">
          <span className="w-6 h-6 rounded-md bg-gold text-black font-black text-[13px] flex items-center justify-center">eg</span>
          <span className="font-bold tracking-tight">everygithub<span className="text-gold">_gold</span></span>
        </Link>
        <nav className="p-3 flex-1">
          {NAV.map((n) => {
            const active = n.exact ? path === n.href : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={clsx("flex items-center gap-2.5 px-3 h-9 rounded-md text-sm mb-0.5 transition-colors", active ? "bg-panel-2 text-fg font-medium" : "text-fg-2 hover:text-fg hover:bg-panel")}>
                <n.icon size={16} className={active ? "text-gold" : ""} />{n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-line">
          <Link href="/app/settings" className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-panel text-sm">
            <span className={online.length ? "dot-online" : "dot-offline"} />
            <div className="flex-1 min-w-0">
              <div className="text-fg truncate">{online.length ? `${online[0].name}${online.length > 1 ? ` +${online.length - 1}` : ""}` : "PC 오프라인"}</div>
              <div className="text-[11px] text-mute">{online.length ? "링크를 던질 준비 완료" : status.devices.length ? "에이전트가 꺼져 있음" : "PC 를 연결하세요"}</div>
            </div>
            <Monitor size={14} className="text-mute" />
          </Link>
          <div className="flex items-center justify-between px-3 pt-2 text-xs text-mute">
            <span className="truncate">@{login}</span>
            <a href="/auth/signout" className="hover:text-fg flex items-center gap-1"><LogOut size={12} />로그아웃</a>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* 모바일 상단바 */}
        <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-line bg-bg-raised sticky top-0 z-20">
          <Link href="/app" className="font-bold">everygithub<span className="text-gold">_gold</span></Link>
          <span className={online.length ? "dot-online" : "dot-offline"} />
        </header>
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 max-w-[1120px] w-full mx-auto">{children}</main>
        <nav className="md:hidden sticky bottom-0 grid grid-cols-4 border-t border-line bg-bg-raised">
          {NAV.map((n) => {
            const active = n.exact ? path === n.href : path.startsWith(n.href);
            return <Link key={n.href} href={n.href} className={clsx("flex flex-col items-center gap-1 py-2 text-[11px]", active ? "text-gold" : "text-mute")}><n.icon size={18} />{n.label}</Link>;
          })}
        </nav>
      </div>
    </div>
  );
}
