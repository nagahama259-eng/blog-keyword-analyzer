import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "블로그 키워드 분석기",
  description: "네이버 블로그 황금 키워드 발굴 대시보드",
};

/** document.write를 쓰는 위젯이라 격리된 iframe 문서 안에서 실행한다. */
const COUPANG_BANNER_HTML = `<script src="https://ads-partners.coupang.com/g.js"></script>
<script>
	new PartnersCoupang.G({"id":1022842,"template":"carousel","trackingCode":"AF1043821","width":"728","height":"90","tsource":""});
</script>`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-base font-semibold">
                블로그 키워드 분석기
              </Link>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                by 259
              </span>
            </div>
            <Link
              href="/"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              홈
            </Link>
            <Link
              href="/keywords"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              전체 키워드
            </Link>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-600">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 py-4">
            <iframe
              title="쿠팡 파트너스 배너"
              srcDoc={COUPANG_BANNER_HTML}
              width={728}
              height={90}
              scrolling="no"
              style={{ border: "none", maxWidth: "100%" }}
            />
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
              이 포스팅은 쿠팡파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
            </p>
          </div>
          made by 259
        </footer>
      </body>
    </html>
  );
}
