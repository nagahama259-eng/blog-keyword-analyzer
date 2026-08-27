import { getKeywordMetrics } from "@/lib/getKeywordData";
import { KeywordTable } from "@/components/KeywordTable";

export default async function KeywordsPage() {
  const metrics = await getKeywordMetrics();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">전체 키워드</h1>
      {metrics.length === 0 ? (
        <p className="text-sm text-zinc-500">
          아직 수집된 키워드가 없어요. 홈 화면 안내를 참고해서 데이터 수집을 먼저
          실행해주세요.
        </p>
      ) : (
        <KeywordTable data={metrics} />
      )}
    </div>
  );
}
