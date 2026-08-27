import { readFile } from "node:fs/promises";
import path from "node:path";
import type { KeywordMetrics } from "@/types/keyword";

const KEYWORDS_PATH = path.join(process.cwd(), "data", "keywords.json");

/** 아직 한 번도 수집을 안 돌렸으면 파일이 없을 수 있으므로 빈 배열로 처리한다. */
export async function getKeywordMetrics(): Promise<KeywordMetrics[]> {
  try {
    const raw = await readFile(KEYWORDS_PATH, "utf-8");
    return JSON.parse(raw) as KeywordMetrics[];
  } catch {
    return [];
  }
}
