import Link from "next/link";
export default function NotFound() {
  return <div className="min-h-screen flex flex-col items-center justify-center text-center px-6"><div className="text-6xl font-black text-gold mb-2">404</div><p className="text-fg-2 mb-6">페이지를 찾을 수 없습니다.</p><Link href="/app" className="btn btn-ghost">홈으로</Link></div>;
}
