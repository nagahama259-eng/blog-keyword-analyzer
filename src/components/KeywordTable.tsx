"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { KeywordCategory, KeywordGrade, KeywordMetrics } from "@/types/keyword";
import { GradeBadge } from "@/components/GradeBadge";
import { formatNumber } from "@/lib/format";

type SortKey = "keyword" | "totalSearch" | "blogDocCount" | "goldenScore";

const GRADE_OPTIONS: Array<KeywordGrade | "전체"> = [
  "전체",
  "황금",
  "양호",
  "보통",
  "포화",
];

const CATEGORY_OPTIONS: Array<KeywordCategory | "전체"> = [
  "전체",
  "생활",
  "이슈",
  "재테크",
  "IT",
];

export function KeywordTable({ data }: { data: KeywordMetrics[] }) {
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState<KeywordGrade | "전체">("전체");
  const [categoryFilter, setCategoryFilter] = useState<KeywordCategory | "전체">(
    "전체"
  );
  const [sortKey, setSortKey] = useState<SortKey>("goldenScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return data
      .filter((item) =>
        keyword ? item.keyword.toLowerCase().includes(keyword) : true
      )
      .filter((item) => (gradeFilter === "전체" ? true : item.grade === gradeFilter))
      .filter((item) =>
        categoryFilter === "전체" ? true : item.category === categoryFilter
      )
      .sort((a, b) => {
        const dir = sortDir === "desc" ? -1 : 1;
        if (sortKey === "keyword") {
          return dir * a.keyword.localeCompare(b.keyword, "ko");
        }
        return dir * (a[sortKey] - b[sortKey]);
      });
  }, [data, search, gradeFilter, categoryFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="키워드 검색"
          className="w-56 rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          value={gradeFilter}
          onChange={(event) =>
            setGradeFilter(event.target.value as KeywordGrade | "전체")
          }
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {GRADE_OPTIONS.map((grade) => (
            <option key={grade} value={grade}>
              {grade === "전체" ? "전체 등급" : grade}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(event) =>
            setCategoryFilter(event.target.value as KeywordCategory | "전체")
          }
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category}>
              {category === "전체" ? "전체 카테고리" : category}
            </option>
          ))}
        </select>
        <span className="text-sm text-zinc-500">
          {formatNumber(filtered.length)}개
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-zinc-50 text-left text-zinc-500 dark:bg-zinc-900">
            <tr>
              <SortableTh
                label="키워드"
                sortKey="keyword"
                current={sortKey}
                dir={sortDir}
                onClick={toggleSort}
              />
              <th className="px-4 py-2 font-medium">카테고리</th>
              <th className="px-4 py-2 font-medium">등급</th>
              <SortableTh
                label="월간 검색량"
                sortKey="totalSearch"
                current={sortKey}
                dir={sortDir}
                onClick={toggleSort}
              />
              <SortableTh
                label="문서수"
                sortKey="blogDocCount"
                current={sortKey}
                dir={sortDir}
                onClick={toggleSort}
              />
              <SortableTh
                label="황금점수"
                sortKey="goldenScore"
                current={sortKey}
                dir={sortDir}
                onClick={toggleSort}
              />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr
                key={item.keyword}
                className="border-t border-zinc-100 dark:border-zinc-800"
              >
                <td className="px-4 py-2 font-medium">
                  <Link
                    href={`/keywords/${encodeURIComponent(item.keyword)}`}
                    className="hover:underline"
                  >
                    {item.keyword}
                  </Link>
                </td>
                <td className="px-4 py-2 text-zinc-500">
                  {item.category ?? "-"}
                </td>
                <td className="px-4 py-2">
                  <GradeBadge grade={item.grade} />
                </td>
                <td className="px-4 py-2 tabular-nums">
                  {formatNumber(item.totalSearch)}
                </td>
                <td className="px-4 py-2 tabular-nums">
                  {item.isDocCountCapped
                    ? "1000+"
                    : formatNumber(item.blogDocCount)}
                </td>
                <td className="px-4 py-2 tabular-nums">
                  {formatNumber(item.goldenScore)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  조건에 맞는 키워드가 없어요
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableTh({
  label,
  sortKey,
  current,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: "asc" | "desc";
  onClick: (key: SortKey) => void;
}) {
  const active = sortKey === current;

  return (
    <th className="px-4 py-2 font-medium">
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        {label}
        {active && <span>{dir === "desc" ? "↓" : "↑"}</span>}
      </button>
    </th>
  );
}
