const GITHUB_API_BASE = "https://api.github.com";

interface GithubConfig {
  token: string;
  owner: string;
  name: string;
  branch: string;
}

function getGithubConfig(): GithubConfig {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !repo) {
    throw new Error(
      "GitHub 커밋에 필요한 환경변수가 없습니다. GITHUB_TOKEN, GITHUB_REPO(owner/repo 형식)를 확인하세요."
    );
  }

  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new Error(`GITHUB_REPO는 "owner/repo" 형식이어야 합니다. (받은 값: ${repo})`);
  }

  return { token, owner, name, branch };
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function getExistingFile(
  config: GithubConfig,
  repoPath: string
): Promise<{ sha: string; content: string } | null> {
  const url = `${GITHUB_API_BASE}/repos/${config.owner}/${config.name}/contents/${repoPath}?ref=${config.branch}`;
  const response = await fetch(url, { headers: authHeaders(config.token) });

  if (response.status === 404) return null;
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub 파일 조회 실패 (status ${response.status}): ${body}`);
  }

  const data = (await response.json()) as { sha: string; content: string };
  return data;
}

/** 파일이 저장소에 없으면(첫 실행 등) null을 반환한다. */
export async function readJsonFileFromGithub<T>(repoPath: string): Promise<T | null> {
  const config = getGithubConfig();
  const existing = await getExistingFile(config, repoPath);
  if (!existing) return null;

  const raw = Buffer.from(existing.content, "base64").toString("utf-8");
  return JSON.parse(raw) as T;
}

/**
 * Vercel 서버는 파일시스템이 읽기 전용이라 로컬처럼 fs.writeFile로 저장할 수 없다.
 * 대신 GitHub Contents API로 저장소에 직접 커밋해서 데이터를 영속시킨다. 이 커밋은
 * Vercel의 자동 배포도 함께 트리거하므로, data/keywords.json 커밋 시점부터 다음
 * 배포에 최신 데이터가 반영된다.
 */
export async function commitJsonFileToGithub(
  repoPath: string,
  data: unknown,
  commitMessage: string
): Promise<void> {
  const config = getGithubConfig();
  const existing = await getExistingFile(config, repoPath);
  const content = Buffer.from(JSON.stringify(data, null, 2), "utf-8").toString(
    "base64"
  );

  const url = `${GITHUB_API_BASE}/repos/${config.owner}/${config.name}/contents/${repoPath}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: { ...authHeaders(config.token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: commitMessage,
      content,
      branch: config.branch,
      ...(existing ? { sha: existing.sha } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub 커밋 실패 (status ${response.status}): ${body}`);
  }
}
