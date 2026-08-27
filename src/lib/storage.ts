import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  commitJsonFileToGithub,
  readJsonFileFromGithub,
} from "@/lib/github/jsonFile";

/**
 * GITHUB_TOKEN이 설정되어 있으면(=Vercel 배포 환경) GitHub API로 저장소에서
 * 읽고 쓴다. 없으면(=로컬 next dev) 로컬 파일시스템을 그대로 사용한다.
 */
export async function readJsonData<T>(repoPath: string): Promise<T | null> {
  if (process.env.GITHUB_TOKEN) {
    return readJsonFileFromGithub<T>(repoPath);
  }

  try {
    const raw = await readFile(path.join(process.cwd(), repoPath), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJsonData(
  repoPath: string,
  data: unknown,
  commitMessage: string
): Promise<void> {
  if (process.env.GITHUB_TOKEN) {
    await commitJsonFileToGithub(repoPath, data, commitMessage);
    return;
  }

  const fullPath = path.join(process.cwd(), repoPath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, JSON.stringify(data, null, 2), "utf-8");
}
