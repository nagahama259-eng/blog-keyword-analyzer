import type { KeywordGrade } from "@/types/keyword";

const GRADE_STYLES: Record<KeywordGrade, string> = {
  황금:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  양호:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  보통: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  포화: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function GradeBadge({ grade }: { grade: KeywordGrade }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${GRADE_STYLES[grade]}`}
    >
      {grade}
    </span>
  );
}
