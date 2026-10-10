import type { NextApiRequest, NextApiResponse } from "next";

type GitHubUser = {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  blog: string | null;
  public_repos: number;
  followers: number;
  following: number;
  public_gists: number;
  created_at: string;
};
type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
  fork: boolean;
  archived: boolean;
  default_branch: string;
};
type ApiResponse = { user?: GitHubUser; repos?: GitHubRepo[]; fetched_at?: string; error?: string };

async function githubFetch<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "devboard-portfolio-dashboard",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    if (response.status === 404) throw new Error("That username was not found or has no public profile.");
    if (response.status === 403 || response.status === 429) throw new Error("GitHub API rate limit reached. Wait a little and try again.");
    throw new Error(`GitHub API returned HTTP ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }
  const raw = typeof req.query.username === "string" ? req.query.username.trim().replace(/^@/, "") : "";
  if (!/^[a-zA-Z0-9-]{1,39}$/.test(raw) || raw.startsWith("-") || raw.endsWith("-") || raw.includes("--")) {
    return res.status(400).json({ error: "Enter a valid GitHub username (letters, numbers, and single hyphens)." });
  }

  try {
    const [user, repos] = await Promise.all([
      githubFetch<GitHubUser>(`https://api.github.com/users/${encodeURIComponent(raw)}`),
      githubFetch<GitHubRepo[]>(`https://api.github.com/users/${encodeURIComponent(raw)}/repos?per_page=100&sort=updated&type=owner`),
    ]);
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({
      user,
      repos: repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        homepage: repo.homepage,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        open_issues_count: repo.open_issues_count,
        updated_at: repo.updated_at,
        fork: repo.fork,
        archived: repo.archived,
        default_branch: repo.default_branch,
      })),
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch GitHub data.";
    return res.status(502).json({ error: message });
  }
}
