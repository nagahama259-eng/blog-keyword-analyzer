import type { KeywordGrade, KeywordMetrics } from "@/types/keyword";

/**
 * 경쟁도(blogDocCount / totalSearch) 등급 임계값.
 * 값이 낮을수록 검색량 대비 문서수가 적어 경쟁이 약하다는 뜻.
 */
const GRADE_THRESHOLDS = {
  golden: 10,
  good: 30,
  fair: 70,
} as const;

export function calculateGoldenScore(
  totalSearch: number,
  blogDocCount: number
): number {
  return (totalSearch / (blogDocCount + 1)) * 1000;
}

export function calculateCompetitionRatio(
  totalSearch: number,
  blogDocCount: number
): number {
  if (totalSearch <= 0) return Infinity;
  return blogDocCount / totalSearch;
}

/**
 * isDocCountCapped가 true면(문서수 API의 1000건 상한에 걸린 경우) 실제 문서수를
 * 알 수 없으므로 경쟁도 계산과 무관하게 무조건 "포화"로 판정한다.
 */
export function calculateGrade(
  competitionRatio: number,
  isDocCountCapped: boolean
): KeywordGrade {
  if (isDocCountCapped) return "포화";
  if (competitionRatio < GRADE_THRESHOLDS.golden) return "황금";
  if (competitionRatio < GRADE_THRESHOLDS.good) return "양호";
  if (competitionRatio < GRADE_THRESHOLDS.fair) return "보통";
  return "포화";
}

const GRADE_RANK: Record<KeywordGrade, number> = {
  황금: 0,
  양호: 1,
  보통: 2,
  포화: 3,
};

/**
 * goldenScore만으로 정렬하면 검색량이 아주 큰 "포화" 키워드가 상위를 다 차지한다
 * (문서수 상한 때문에 점수가 비정상적으로 높게 나옴). 등급을 먼저 비교해서
 * 황금 > 양호 > 보통 > 포화 순으로 우선하고, 같은 등급 안에서만 점수로 정렬한다.
 */
export function compareByGradeThenScore(
  a: KeywordMetrics,
  b: KeywordMetrics
): number {
  const rankDiff = GRADE_RANK[a.grade] - GRADE_RANK[b.grade];
  if (rankDiff !== 0) return rankDiff;
  return b.goldenScore - a.goldenScore;
}
