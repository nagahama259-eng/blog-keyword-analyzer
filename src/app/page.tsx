import Link from "next/link";
import { getKeywordMetrics } from "@/lib/getKeywordData";
import { compareByGradeThenScore } from "@/lib/scoring";
import { generateTitleIdeas } from "@/lib/titleIdeas";
import { GradeBadge } from "@/components/GradeBadge";
import { formatNumber } from "@/lib/format";

export default async function Home() {
  const metrics = await getKeywordMetrics();

  if (metrics.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-24 text-center">
        <h1 className="text-xl font-semibold">아직 수집된 키워드가 없어요</h1>
        <p className="text-sm text-zinc-500">
          아래 명령으로 데이터 수집을 먼저 실행해주세요. (.env.local의 CRON_SECRET
          값 사용)
        </p>
        <pre className="overflow-x-auto rounded bg-zinc-100 px-4 py-3 text-left text-xs dark:bg-zinc-900">
          {`curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/collect`}
        </pre>
      </div>
    );
  }

  const ranked = [...metrics].sort(compareByGradeThenScore);
  const top10 = ranked.slice(0, 10);
  const top5 = ranked.slice(0, 5);
  const goldenCount = metrics.filter((item) => item.grade === "황금").length;
  const collectedAt = metrics[0]?.collectedAt;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">오늘의 추천 키워드 TOP 10</h1>
        <p className="mt-1 text-sm text-zinc-500">
          전체 {formatNumber(metrics.length)}개 중 황금 등급{" "}
          {formatNumber(goldenCount)}개
          {collectedAt &&
            ` · ${new Date(collectedAt).toLocaleString("ko-KR")} 기준`}
        </p>
      </div>

      <ol className="flex flex-col gap-2">
        {top10.map((item, index) => (
          <li key={item.keyword}>
            <Link
              href={`/keywords/${encodeURIComponent(item.keyword)}`}
              className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <span className="w-6 text-center text-sm font-semibold text-zinc-400">
                {index + 1}
              </span>
              <div className="flex min-w-40 flex-1 flex-col">
                <span className="font-medium">{item.keyword}</span>
                <span className="text-xs text-zinc-500">
                  {item.category ?? "-"}
                </span>
              </div>
              <GradeBadge grade={item.grade} />
              <div className="flex gap-4 text-sm text-zinc-600 tabular-nums dark:text-zinc-300">
                <span title="월간 검색량(PC+모바일)">
                  검색량 {formatNumber(item.totalSearch)}
                </span>
                <span title="블로그 문서수">
                  문서수{" "}
                  {item.isDocCountCapped
                    ? "1000+"
                    : formatNumber(item.blogDocCount)}
                </span>
                <span title="황금점수">
                  점수 {formatNumber(item.goldenScore)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>

      <Link
        href="/keywords"
        className="self-start text-sm font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
      >
        전체 키워드 리스트 보기 →
      </Link>

      <section>
        <h2 className="text-xl font-semibold">오늘의 글감 아이디어</h2>
        <p className="mt-1 text-sm text-zinc-500">
          상위 5개 키워드로 만든 블로그 글 제목 후보예요. (템플릿 조합, AI 생성
          아님)
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {top5.map((item, index) => (
            <div
              key={item.keyword}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Link
                href={`/keywords/${encodeURIComponent(item.keyword)}`}
                className="font-medium hover:underline"
              >
                {item.keyword}
              </Link>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
                {generateTitleIdeas(item.keyword, index * 3).map((title) => (
                  <li key={title}>· {title}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
