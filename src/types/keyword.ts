export type KeywordCategory = "생활" | "이슈" | "재테크" | "IT";

export interface SeedKeyword {
  keyword: string;
  category: KeywordCategory;
}

export type KeywordGrade = "황금" | "양호" | "보통" | "포화";

export type AdCompetitionLevel = "낮음" | "중간" | "높음";

export interface KeywordMetrics {
  keyword: string;
  category?: KeywordCategory;
  /** 시드 키워드 자체인지, 연관 키워드 확장으로 발견됐는지 */
  isSeed: boolean;
  /** 연관 키워드로 확장된 경우, 어떤 시드 키워드에서 나왔는지 */
  expandedFrom?: string;
  /** 네이버 검색광고 API가 알려주는 광고 입찰 경쟁정도(블로그 문서수와는 별개 지표) */
  adCompetitionLevel: AdCompetitionLevel | null;
  monthlyPcSearch: number;
  monthlyMobileSearch: number;
  totalSearch: number;
  blogDocCount: number;
  /** blogDocCount가 수집 API의 상한(1000)에 걸려 실제보다 낮게 잡혔는지 */
  isDocCountCapped: boolean;
  goldenScore: number;
  competitionRatio: number;
  grade: KeywordGrade;
  /** ISO 8601 문자열, 수집된 시각 */
  collectedAt: string;
}
