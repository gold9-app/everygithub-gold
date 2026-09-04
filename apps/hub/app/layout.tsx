import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "everygithub_gold", description: "깃허브 링크 하나로 클론·분석·등록" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="top">
          <a href="/dashboard" className="brand">everygithub<span>_gold</span></a>
          <nav><a href="/dashboard">대시보드</a><a href="/dashboard#devices">디바이스</a><a href="/dashboard#telegram">텔레그램</a></nav>
        </header>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
