import { readFile } from "node:fs/promises";
import path from "node:path";
import type { KeywordCategory, KeywordMetrics, SeedKeyword } from "@/types/keyword";
import {
  fetchKeywordStats,
  type CompetitionLevel,
  type NaverKeywordStat,
} from "@/lib/naver/searchAd";
import { fetchBlogDocCountSafe } from "@/lib/naver/blogDocCount";
import {
  calculateCompetitionRatio,
  calculateGoldenScore,
  calculateGrade,
} from "@/lib/scoring";

const SEED_KEYWORDS_PATH = path.join(process.cwd(), "data", "seed-keywords.json");

export const SEARCH_AD_DELAY_MS = 1100;
export const BLOG_DOC_COUNT_DELAY_MS = 800;

/**
 * 확장된 연관 키워드가 수천 개까지 나올 수 있는데, 블로그 문서수 조회는 순차 요청 +
 * 딜레이 방식이라 전부 처리하면 너무 오래 걸린다. 검색량 상위 후보만 골라서 처리한다.
 * (시드 키워드 자신은 이 상한과 무관하게 항상 포함)
 */
const MAX_CANDIDATES_FOR_DOC_COUNT = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface CandidateEntry {
  stat: NaverKeywordStat;
  isSeed: boolean;
  category?: KeywordCategory;
  expandedFrom?: string;
}

export async function readSeedKeywords(): Promise<SeedKeyword[]> {
  const raw = await readFile(SEED_KEYWORDS_PATH, "utf-8");
  return JSON.parse(raw) as SeedKeyword[];
}

/**
 * 시드 키워드를 하나씩(배치로 묶지 않고) 조회한다. 배치로 묶으면 API 호출 횟수는 줄지만
 * 연관 키워드가 "어느 시드에서 확장됐는지" 알 수 없어져서, 상세 페이지에서 시드별
 * 연관 키워드를 보여주려면 시드 단위 호출이 필요하다.
 */
export async function collectKeywordCandidates(
  seeds: SeedKeyword[]
): Promise<CandidateEntry[]> {
  const merged = new Map<string, CandidateEntry>();

  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    const strippedSeedKeyword = seed.keyword.replace(/\s+/g, "");
    const stats = await fetchKeywordStats([seed.keyword]);

    for (const stat of stats) {
      if (merged.has(stat.relKeyword)) continue;
      const isSeedItself = stat.relKeyword === strippedSeedKeyword;
      merged.set(stat.relKeyword, {
        stat,
        isSeed: isSeedItself,
        category: seed.category,
        expandedFrom: isSeedItself ? undefined : seed.keyword,
      });
    }

    if (i < seeds.length - 1) {
      await sleep(SEARCH_AD_DELAY_MS);
    }
  }

  return Array.from(merged.values());
}

/**
 * 검색량 기준으로만 상위 후보를 뽑으면 실제로는 전부 초대형 인기어라 문서수도
 * 무조건 상한(1000)에 걸려 "포화"만 나온다 (실제 테스트로 확인함). 그래서 네이버
 * 검색광고 API가 공짜로 알려주는 광고 경쟁정도(compIdx)를 1차 기준으로 삼아
 * 낮음 → 중간 → 높음 순으로 우선 채우고, 같은 등급 안에서는 검색량 순으로 정렬한다.
 */
const COMPETITION_RANK: Record<CompetitionLevel, number> = {
  낮음: 0,
  중간: 1,
  높음: 2,
};

function competitionRank(level: CompetitionLevel | null): number {
  return level ? COMPETITION_RANK[level] : 3;
}

export function selectCandidatesForScoring(
  candidates: CandidateEntry[]
): CandidateEntry[] {
  const seedEntries = candidates.filter((c) => c.isSeed);
  const nonSeedEntries = candidates
    .filter((c) => !c.isSeed)
    .sort((a, b) => {
      const rankDiff =
        competitionRank(a.stat.competitionLevel) -
        competitionRank(b.stat.competitionLevel);
      if (rankDiff !== 0) return rankDiff;
      return b.stat.totalSearch - a.stat.totalSearch;
    });

  const remainingSlots = Math.max(
    MAX_CANDIDATES_FOR_DOC_COUNT - seedEntries.length,
    0
  );

  return [...seedEntries, ...nonSeedEntries.slice(0, remainingSlots)];
}

/** 문서수 조회가 실패한 후보는 null을 반환해 호출한 쪽에서 건너뛸 수 있게 한다. */
export async function computeMetricForCandidate(
  entry: CandidateEntry,
  collectedAt: string
): Promise<KeywordMetrics | null> {
  const docCountResult = await fetchBlogDocCountSafe(entry.stat.relKeyword);
  if (docCountResult === null) return null;

  const { blogDocCount, isDocCountCapped } = docCountResult;
  const competitionRatio = calculateCompetitionRatio(
    entry.stat.totalSearch,
    blogDocCount
  );
  const goldenScore = calculateGoldenScore(entry.stat.totalSearch, blogDocCount);
  const grade = calculateGrade(competitionRatio, isDocCountCapped);

  return {
    keyword: entry.stat.relKeyword,
    category: entry.category,
    isSeed: entry.isSeed,
    expandedFrom: entry.expandedFrom,
    adCompetitionLevel: entry.stat.competitionLevel,
    monthlyPcSearch: entry.stat.monthlyPcSearch,
    monthlyMobileSearch: entry.stat.monthlyMobileSearch,
    totalSearch: entry.stat.totalSearch,
    blogDocCount,
    isDocCountCapped,
    goldenScore,
    competitionRatio,
    grade,
    collectedAt,
  };
}
