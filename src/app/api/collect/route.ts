import { NextResponse } from "next/server";
import { runCollectionBatch } from "@/lib/collectBatch";

/** Vercel Hobby 플랜의 함수 실행시간 상한. */
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const outcome = await runCollectionBatch();
    return NextResponse.json({ success: true, ...outcome });
  } catch (error) {
    console.error("[api/collect] 데이터 수집 실패:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 }
    );
  }
}
