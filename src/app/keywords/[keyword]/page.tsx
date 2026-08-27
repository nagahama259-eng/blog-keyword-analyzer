import Link from "next/link";
import { notFound } from "next/navigation";
import { getKeywordMetrics } from "@/lib/getKeywordData";
import { GradeBadge } from "@/components/GradeBadge";
import { formatNumber } from "@/lib/format";

export default async function KeywordDetailPage({
  params,
}: PageProps<"/keywords/[keyword]">) {
  const { keyword: rawKeyword } = await params;
  const keyword = decodeURIComponent(rawKeyword);
  const metrics = await getKeywordMetrics();
  const item = metrics.find((entry) => entry.keyword === keyword);

  if (!item) {
    notFound();
  }

  const relatedKeywords = item.isSeed
    ? metrics.filter((entry) => entry.expandedFrom === item.keyword)
    : metrics.filter(
        (entry) =>
          entry.expandedFrom === item.expandedFrom && entry.keyword !== item.keyword
      );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <div>
        <Link
          href="/keywords"
          className="text-sm text-zinc-500 hover:underline"
        >
          ← 전체 키워드로 돌아가기
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{item.keyword}</h1>
          <GradeBadge grade={item.grade} />
          {item.isSeed && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              시드 키워드
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {item.category ?? "-"}
          {!item.isSeed &&
            item.expandedFrom &&
            ` · "${item.expandedFrom}"에서 확장됨`}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="PC 검색량" value={formatNumber(item.monthlyPcSearch)} />
        <Stat
          label="모바일 검색량"
          value={formatNumber(item.monthlyMobileSearch)}
        />
        <Stat label="월간 총 검색량" value={formatNumber(item.totalSearch)} />
        <Stat
          label="블로그 문서수"
          value={
            item.isDocCountCapped ? "1000+" : formatNumber(item.blogDocCount)
          }
        />
        <Stat
          label="경쟁도 (문서수/검색량)"
          value={item.competitionRatio.toFixed(2)}
        />
        <Stat label="황금점수" value={formatNumber(item.goldenScore)} />
        <Stat label="광고 경쟁정도" value={item.adCompetitionLevel ?? "-"} />
        <Stat
          label="수집 시각"
          value={new Date(item.collectedAt).toLocaleString("ko-KR")}
        />
      </dl>

      <section>
        <h2 className="text-lg font-semibold">
          연관 키워드{" "}
          {relatedKeywords.length > 0 && `(${relatedKeywords.length})`}
        </h2>
        {relatedKeywords.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            수집된 데이터 안에서는 연관 키워드를 찾지 못했어요.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {relatedKeywords
              .slice()
              .sort((a, b) => b.goldenScore - a.goldenScore)
              .map((related) => (
                <li key={related.keyword}>
                  <Link
                    href={`/keywords/${encodeURIComponent(related.keyword)}`}
                    className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  >
                    <span>{related.keyword}</span>
                    <span className="flex items-center gap-2 text-zinc-500">
                      <GradeBadge grade={related.grade} />
                      <span className="tabular-nums">
                        {formatNumber(related.totalSearch)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 text-base font-medium tabular-nums">{value}</dd>
    </div>
  );
}
