import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "everygithub_gold — 깃허브 링크 하나로 클론·분석·등록",
  description: "링크만 던지면 내 PC 에 클론하고, 분석하고, 한국어 설명서를 만들고, 클로드코드에 등록합니다.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
