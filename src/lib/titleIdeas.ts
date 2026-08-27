/**
 * LLM 호출 없이 미리 정의된 템플릿으로 블로그 글 제목 후보를 조합한다.
 * 키워드마다 시작 위치(offset)를 다르게 줘서 여러 키워드를 나열해도
 * 매번 같은 3개 템플릿만 반복되지 않게 한다.
 */
const TITLE_TEMPLATES = [
  "{keyword} 총정리",
  "{keyword} 후기",
  "{keyword} 하는 법",
  "{keyword} 추천 BEST 5",
  "{keyword} 장단점 비교",
  "초보자를 위한 {keyword} 가이드",
  "{keyword} 꿀팁 모음",
  "{keyword} 가격 비교",
  "후회 없는 {keyword} 고르는 법",
  "{keyword}, 이것만 알면 끝",
];

export function generateTitleIdeas(
  keyword: string,
  offset = 0,
  count = 3
): string[] {
  return Array.from({ length: count }, (_, i) => {
    const template = TITLE_TEMPLATES[(offset + i) % TITLE_TEMPLATES.length];
    return template.replace("{keyword}", keyword);
  });
}
