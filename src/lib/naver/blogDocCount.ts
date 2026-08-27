const SEARCH_LIST_ENDPOINT =
  "https://section.blog.naver.com/ajax/SearchList.naver";
const REFERER = "https://section.blog.naver.com/Search/Post.naver";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * 이 엔드포인트는 로그인하지 않은 상태로 조회하면 totalCount가 실제 문서수와
 * 무관하게 최대 이 값에서 멈춘다. (직접 테스트로 확인함)
 */
export const BLOG_DOC_COUNT_CAP = 1000;

export interface BlogDocCountResult {
  blogDocCount: number;
  isDocCountCapped: boolean;
}

/**
 * 네이버가 응답 앞에 붙이는 `)]}',\n` 같은 XSSI 방지 접두어를 제거하고 JSON을 파싱한다.
 */
function parseXssiProtectedJson(rawText: string): unknown {
  const newlineIndex = rawText.indexOf("\n");
  const jsonText = newlineIndex === -1 ? rawText : rawText.slice(newlineIndex + 1);
  return JSON.parse(jsonText);
}

/**
 * 따옴표 없이 검색하면 네이버가 느슨한 토큰 매칭을 해서(예: "FIATETF"가 "ETF" 포함
 * 게시물과도 매칭됨) 대부분의 키워드가 실제와 무관하게 상한(1000)까지 차버린다.
 * 따옴표로 감싸 정확한 구문 검색을 하면 훨씬 정확한 값이 나온다. (직접 테스트로 확인함)
 */
function toExactPhraseQuery(keyword: string): string {
  return `"${keyword.replace(/"/g, "")}"`;
}

export async function fetchBlogDocCount(
  keyword: string
): Promise<BlogDocCountResult> {
  const url = new URL(SEARCH_LIST_ENDPOINT);
  url.searchParams.set("countPerPage", "1");
  url.searchParams.set("currentPage", "1");
  url.searchParams.set("rangeType", "ALL");
  url.searchParams.set("orderBy", "sim");
  url.searchParams.set("keyword", toExactPhraseQuery(keyword));

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Referer: REFERER,
    },
  });

  if (!response.ok) {
    throw new Error(
      `네이버 블로그 검색 요청 실패 (status ${response.status}): ${keyword}`
    );
  }

  const rawText = await response.text();
  const parsed = parseXssiProtectedJson(rawText) as {
    result?: { totalCount?: number };
  };
  const totalCount = parsed.result?.totalCount;

  if (typeof totalCount !== "number") {
    throw new Error(
      `네이버 블로그 검색 응답 형식이 예상과 다름: ${keyword} (응답: ${rawText.slice(0, 300)})`
    );
  }

  return {
    blogDocCount: totalCount,
    isDocCountCapped: totalCount >= BLOG_DOC_COUNT_CAP,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 비공식 엔드포인트라 요청이 몰리면 가끔 예상과 다른 응답이 온다.
 * 한 번 실패하면 잠시 쉬었다가 한 번만 더 시도하고, 그래도 안 되면 null을 반환해
 * 호출한 쪽에서 해당 키워드를 건너뛸 수 있게 한다.
 */
export async function fetchBlogDocCountSafe(
  keyword: string,
  retryDelayMs = 3000
): Promise<BlogDocCountResult | null> {
  try {
    return await fetchBlogDocCount(keyword);
  } catch (firstError) {
    await sleep(retryDelayMs);
    try {
      return await fetchBlogDocCount(keyword);
    } catch (secondError) {
      console.warn(
        `[blogDocCount] "${keyword}" 조회 2회 실패, 건너뜀:`,
        firstError instanceof Error ? firstError.message : firstError,
        secondError instanceof Error ? secondError.message : secondError
      );
      return null;
    }
  }
}

/**
 * 여러 키워드를 순차적으로(동시에 요청하지 않고) 조회하면서 매 요청 사이에
 * delayMs만큼 쉬어서 네이버 서버에 부담을 주지 않는다.
 */
export async function fetchBlogDocCounts(
  keywords: string[],
  delayMs = 800
): Promise<Map<string, BlogDocCountResult>> {
  const results = new Map<string, BlogDocCountResult>();

  for (const keyword of keywords) {
    const result = await fetchBlogDocCount(keyword);
    results.set(keyword, result);
    await sleep(delayMs);
  }

  return results;
}
