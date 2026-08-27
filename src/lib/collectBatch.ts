import type { KeywordMetrics } from "@/types/keyword";
import { readJsonData, writeJsonData } from "@/lib/storage";
import {
  BLOG_DOC_COUNT_DELAY_MS,
  computeMetricForCandidate,
  collectKeywordCandidates,
  readSeedKeywords,
  selectCandidatesForScoring,
  type CandidateEntry,
} from "@/lib/collectKeywords";

const PROGRESS_REPO_PATH = "data/progress.json";
const KEYWORDS_REPO_PATH = "data/keywords.json";

/**
 * Vercel Hobby 플랜은 함수 실행시간이 60초로 제한돼 있어 전체 수집(수 분 소요)을
 * 한 번에 끝낼 수 없다. 그래서 하루치 수집을 여러 번의 짧은 배치로 쪼개고,
 * 진행 상태를 data/progress.json에 저장해 다음 트리거(GitHub Actions 스케줄)가
 * 이어서 처리하게 한다. 채점 배치는 개수가 아니라 시간 예산으로 끊는데, 문서수
 * 조회가 실패하면 내부적으로 재시도(최대 +3초)가 걸려 개수 기준으로는 60초를
 * 넘길 위험이 있기 때문이다.
 */
const SCORING_TIME_BUDGET_MS = 40_000;

interface ProgressState {
  date: string;
  phase: "candidates" | "scoring" | "done";
  collectedAt: string | null;
  selected: CandidateEntry[];
  nextIndex: number;
  metrics: KeywordMetrics[];
}

export type BatchOutcome =
  | { status: "already_done" }
  | { status: "candidates_collected"; selectedCount: number }
  | { status: "scoring_progress"; processed: number; remaining: number }
  | { status: "completed"; count: number };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getKstDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);
}

function freshProgress(dateKey: string): ProgressState {
  return {
    date: dateKey,
    phase: "candidates",
    collectedAt: null,
    selected: [],
    nextIndex: 0,
    metrics: [],
  };
}

async function loadTodayProgress(): Promise<ProgressState> {
  const todayKey = getKstDateKey();
  const existing = await readJsonData<ProgressState>(PROGRESS_REPO_PATH);
  return existing && existing.date === todayKey ? existing : freshProgress(todayKey);
}

async function runCandidatesPhase(progress: ProgressState): Promise<BatchOutcome> {
  const seeds = await readSeedKeywords();
  const candidates = await collectKeywordCandidates(seeds);
  const selected = selectCandidatesForScoring(candidates);

  const next: ProgressState = {
    ...progress,
    phase: "scoring",
    collectedAt: new Date().toISOString(),
    selected,
    nextIndex: 0,
    metrics: [],
  };
  await writeJsonData(
    PROGRESS_REPO_PATH,
    next,
    `chore: 키워드 후보 수집 완료, 채점 대기 (${selected.length}개, ${progress.date})`
  );

  return { status: "candidates_collected", selectedCount: selected.length };
}

async function runScoringPhase(progress: ProgressState): Promise<BatchOutcome> {
  const deadline = Date.now() + SCORING_TIME_BUDGET_MS;
  const collectedAt = progress.collectedAt ?? new Date().toISOString();
  const metrics = [...progress.metrics];
  let index = progress.nextIndex;
  let skippedCount = 0;

  while (index < progress.selected.length && Date.now() < deadline) {
    const metric = await computeMetricForCandidate(progress.selected[index], collectedAt);
    if (metric) {
      metrics.push(metric);
    } else {
      skippedCount++;
    }
    index++;

    if (index < progress.selected.length && Date.now() < deadline) {
      await sleep(BLOG_DOC_COUNT_DELAY_MS);
    }
  }

  if (skippedCount > 0) {
    console.warn(`[collectBatch] 문서수 조회 실패로 ${skippedCount}개 키워드를 건너뜀`);
  }

  const processed = index - progress.nextIndex;
  const isLastBatch = index >= progress.selected.length;

  if (isLastBatch) {
    const sorted = metrics.sort((a, b) => b.goldenScore - a.goldenScore);
    await writeJsonData(
      KEYWORDS_REPO_PATH,
      sorted,
      `chore: 키워드 데이터 갱신 (${collectedAt})`
    );

    const done: ProgressState = { ...progress, phase: "done", nextIndex: index, metrics: sorted };
    await writeJsonData(
      PROGRESS_REPO_PATH,
      done,
      `chore: 오늘 수집 완료 (${progress.date})`
    );

    return { status: "completed", count: sorted.length };
  }

  const next: ProgressState = { ...progress, nextIndex: index, metrics };
  await writeJsonData(
    PROGRESS_REPO_PATH,
    next,
    `chore: 채점 진행 ${index}/${progress.selected.length} (${progress.date})`
  );

  return {
    status: "scoring_progress",
    processed,
    remaining: progress.selected.length - index,
  };
}

/**
 * 크론(GitHub Actions) 트리거 한 번마다 호출된다. 오늘 이미 완료된 상태면 아무 것도
 * 하지 않고 즉시 반환하므로, 하루에 여러 번 트리거해도 안전하다.
 */
export async function runCollectionBatch(): Promise<BatchOutcome> {
  const progress = await loadTodayProgress();

  if (progress.phase === "done") {
    return { status: "already_done" };
  }

  if (progress.phase === "candidates") {
    return runCandidatesPhase(progress);
  }

  return runScoringPhase(progress);
}
