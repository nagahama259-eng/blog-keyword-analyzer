import { createHmac } from "node:crypto";

const BASE_URL = "https://api.searchad.naver.com";
const KEYWORDS_TOOL_URI = "/keywordstool";

/** 이 API는 hintKeywords가 5개를 넘으면 에러 없이 빈 결과를 반환한다. (직접 테스트로 확인함) */
const MAX_HINT_KEYWORDS = 5;

export type CompetitionLevel = "낮음" | "중간" | "높음";

export interface NaverKeywordStat {
  relKeyword: string;
  monthlyPcSearch: number;
  monthlyMobileSearch: number;
  totalSearch: number;
  competitionLevel: CompetitionLevel | null;
}

interface RawKeywordToolItem {
  relKeyword: string;
  monthlyPcQcCnt: number | string;
  monthlyMobileQcCnt: number | string;
  compIdx: string;
}

interface KeywordsToolResponse {
  keywordList: RawKeywordToolItem[];
}

function getCredentials() {
  const customerId = process.env.NAVER_AD_CUSTOMER_ID;
  const apiKey = process.env.NAVER_AD_ACCESS_KEY;
  const secretKey = process.env.NAVER_AD_SECRET_KEY;

  if (!customerId || !apiKey || !secretKey) {
    throw new Error(
      "네이버 검색광고 API 키가 설정되지 않았습니다. .env.local의 NAVER_AD_* 값을 확인하세요."
    );
  }

  return { customerId, apiKey, secretKey };
}

function generateSignature(
  timestamp: string,
  method: string,
  uri: string,
  secretKey: string
): string {
  return createHmac("sha256", secretKey)
    .update(`${timestamp}.${method}.${uri}`)
    .digest("base64");
}

/**
 * monthlyPcQcCnt/monthlyMobileQcCnt는 검색량이 아주 적으면 숫자 대신 "< 10" 같은
 * 문자열로 온다. 정확한 값이 아니라 "10 미만"이라는 뜻이므로 10으로 근사한다.
 */
function normalizeSearchCount(value: number | string): number {
  if (typeof value === "number") return value;
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

function normalizeCompetitionLevel(value: string): CompetitionLevel | null {
  if (value === "낮음" || value === "중간" || value === "높음") return value;
  return null;
}

/** 이 API는 키워드에 공백이 섞여 있으면 400을 반환하므로 공백을 제거해서 보낸다. */
function toHintKeyword(keyword: string): string {
  return keyword.replace(/\s+/g, "");
}

/**
 * 시드 키워드(최대 5개)를 네이버 검색광고 키워드도구 API에 보내 월간 검색량을 조회한다.
 * 응답에는 넘긴 시드 자신뿐 아니라 그로부터 확장된 연관 키워드도 함께 담겨 있어서,
 * 이 한 번의 호출로 "검색량 조회"와 "연관 키워드 확장"을 동시에 처리할 수 있다.
 */
export async function fetchKeywordStats(
  seedKeywords: string[]
): Promise<NaverKeywordStat[]> {
  if (seedKeywords.length === 0) return [];
  if (seedKeywords.length > MAX_HINT_KEYWORDS) {
    throw new Error(
      `hintKeywords는 최대 ${MAX_HINT_KEYWORDS}개까지만 지원됩니다. (받은 개수: ${seedKeywords.length})`
    );
  }

  const { customerId, apiKey, secretKey } = getCredentials();
  const method = "GET";
  const timestamp = String(Date.now());
  const signature = generateSignature(
    timestamp,
    method,
    KEYWORDS_TOOL_URI,
    secretKey
  );

  const url = new URL(BASE_URL + KEYWORDS_TOOL_URI);
  url.searchParams.set(
    "hintKeywords",
    seedKeywords.map(toHintKeyword).join(",")
  );
  url.searchParams.set("showDetail", "1");

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "X-Timestamp": timestamp,
      "X-API-KEY": apiKey,
      "X-Customer": customerId,
      "X-Signature": signature,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `네이버 검색광고 API 요청 실패 (status ${response.status}): ${body}`
    );
  }

  const data = (await response.json()) as KeywordsToolResponse;

  return data.keywordList.map((item) => {
    const monthlyPcSearch = normalizeSearchCount(item.monthlyPcQcCnt);
    const monthlyMobileSearch = normalizeSearchCount(item.monthlyMobileQcCnt);
    return {
      relKeyword: item.relKeyword,
      monthlyPcSearch,
      monthlyMobileSearch,
      totalSearch: monthlyPcSearch + monthlyMobileSearch,
      competitionLevel: normalizeCompetitionLevel(item.compIdx),
    };
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 시드 키워드 전체를 5개씩 묶어 순차 호출하고, 여러 배치에 걸쳐 중복으로 나온
 * relKeyword는 처음 나온 값만 남긴다.
 */
export async function fetchKeywordStatsForSeeds(
  seedKeywords: string[],
  delayMs = 1100
): Promise<NaverKeywordStat[]> {
  const batches = chunk(seedKeywords, MAX_HINT_KEYWORDS);
  const merged = new Map<string, NaverKeywordStat>();

  for (let i = 0; i < batches.length; i++) {
    const stats = await fetchKeywordStats(batches[i]);
    for (const stat of stats) {
      if (!merged.has(stat.relKeyword)) {
        merged.set(stat.relKeyword, stat);
      }
    }
    if (i < batches.length - 1) {
      await sleep(delayMs);
    }
  }

  return Array.from(merged.values());
}
