import Head from "next/head";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Repo = {
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
type Profile = {
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
type DashboardData = { user: Profile; repos: Repo[]; fetched_at: string };
type SortMode = "updated" | "stars" | "forks";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: value > 9999 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}
function timeAgo(value: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

export default function Home() {
  const [username, setUsername] = useState("itsasmikb");
  const [query, setQuery] = useState("itsasmikb");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<SortMode>("updated");
  const [includeForks, setIncludeForks] = useState(false);

  async function loadProfile(name: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/github?username=${encodeURIComponent(name)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load GitHub data.");
      setData(payload);
      setUsername(payload.user.login);
      setQuery(payload.user.login);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadProfile("itsasmikb"); }, []);

  const visibleRepos = useMemo(() => {
    if (!data) return [];
    const repos = data.repos.filter((repo) => includeForks || !repo.fork);
    return [...repos].sort((a, b) => {
      if (sort === "stars") return b.stargazers_count - a.stargazers_count || Date.parse(b.updated_at) - Date.parse(a.updated_at);
      if (sort === "forks") return b.forks_count - a.forks_count || Date.parse(b.updated_at) - Date.parse(a.updated_at);
      return Date.parse(b.updated_at) - Date.parse(a.updated_at);
    });
  }, [data, sort, includeForks]);

  const totals = useMemo(() => {
    const repos = data?.repos ?? [];
    const owned = repos.filter((repo) => !repo.fork);
    return {
      stars: owned.reduce((sum, repo) => sum + repo.stargazers_count, 0),
      forks: owned.reduce((sum, repo) => sum + repo.forks_count, 0),
      issues: owned.reduce((sum, repo) => sum + repo.open_issues_count, 0),
      languages: Object.entries(owned.reduce<Record<string, number>>((counts, repo) => {
        if (repo.language) counts[repo.language] = (counts[repo.language] ?? 0) + 1;
        return counts;
      }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6),
    };
  }, [data]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = query.trim().replace(/^@/, "");
    if (cleaned) void loadProfile(cleaned);
  }

  return (
    <>
      <Head>
        <title>Dev Dashboard — GitHub Analytics</title>
        <meta name="description" content="A clean analytics dashboard for public GitHub profiles and repository activity." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="app-shell">
        <aside className="sidebar">
          <a className="brand" href="#" aria-label="Dev Dashboard home"><span className="brand-icon">{"</>"}</span><span>dev<span className="brand-light">board</span></span></a>
          <div className="sidebar-section-label">WORKSPACE</div>
          <div className="sidebar-item active"><span className="side-symbol">▦</span> Overview</div>
          <a className="sidebar-item" href="#repositories"><span className="side-symbol">⌘</span> Repositories</a>
          <a className="sidebar-item" href="#languages"><span className="side-symbol">◒</span> Languages</a>
          <div className="sidebar-bottom">
            <div className="sidebar-avatar">GH</div>
            <div><strong>GitHub analytics</strong><small>Public data · read only</small></div>
          </div>
        </aside>

        <main className="main-content">
          <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> Overview</div><div className="live-status"><span className="status-dot" /> GitHub API <span className="status-text">connected on request</span></div></header>
          <section className="welcome">
            <div><p className="overline">DEVELOPER INTELLIGENCE</p><h1>Repository overview<span className="heading-period">.</span></h1><p className="welcome-copy">A clearer picture of code, projects, and public repository activity.</p></div>
            <form className="search-form" onSubmit={submitSearch}><label htmlFor="username">GitHub username</label><div className="search-row"><span className="at-symbol">@</span><input id="username" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Enter a username" autoComplete="off" /><button type="submit" disabled={loading}>{loading ? "Loading…" : "Analyze ↗"}</button></div></form>
          </section>

          {error && <div className="error-banner" role="alert"><strong>Couldn’t load this profile.</strong><span>{error}</span><button onClick={() => void loadProfile(query)}>Retry</button></div>}
          {loading && !data && <div className="loading-panel"><span className="spinner" /> Fetching public profile and repository data…</div>}

          {data && (
            <>
              <section className="profile-strip">
                <img className="avatar" src={data.user.avatar_url} alt={`${data.user.login} GitHub avatar`} />
                <div className="profile-info"><div className="profile-name">{data.user.name || data.user.login}<span className="verified-pill">PUBLIC PROFILE</span></div><a className="profile-handle" href={data.user.html_url} target="_blank" rel="noreferrer">@{data.user.login} ↗</a><p>{data.user.bio || "No public bio has been added to this profile."}</p><div className="profile-meta">{data.user.location && <span>⌖ {data.user.location}</span>}{data.user.company && <span>▤ {data.user.company}</span>}<span>Joined {new Date(data.user.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span></div></div>
                <a className="profile-link" href={data.user.html_url} target="_blank" rel="noreferrer">View GitHub profile <span>↗</span></a>
              </section>

              <section className="stat-grid" aria-label="GitHub profile metrics">
                <article className="stat-card"><div className="stat-label">Public repositories <span>⌘</span></div><div className="stat-value">{formatNumber(data.user.public_repos)}</div><div className="stat-foot">Owned public projects</div></article>
                <article className="stat-card"><div className="stat-label">Stars earned <span>☆</span></div><div className="stat-value">{formatNumber(totals.stars)}</div><div className="stat-foot">Across non-fork repositories</div></article>
                <article className="stat-card"><div className="stat-label">Forks <span>⑂</span></div><div className="stat-value">{formatNumber(totals.forks)}</div><div className="stat-foot">Repository forks</div></article>
                <article className="stat-card"><div className="stat-label">Followers <span>◎</span></div><div className="stat-value">{formatNumber(data.user.followers)}</div><div className="stat-foot">{formatNumber(data.user.following)} following</div></article>
              </section>

              <section className="middle-grid">
                <article className="content-card language-card" id="languages"><div className="card-heading"><div><p className="overline">TECH STACK</p><h2>Language footprint</h2></div><span className="small-muted">By primary language</span></div>
                  {totals.languages.length ? <div className="language-list">{totals.languages.map(([language, count], index) => <div className="language-row" key={language}><div className="language-info"><span className={`language-dot lang-${index}`} /><span>{language}</span><strong>{count}</strong></div><div className="language-track"><span style={{ width: `${Math.max(5, count / totals.languages[0][1] * 100)}%` }} /></div></div>)}</div> : <p className="empty-copy">No primary language metadata is available for the selected repositories.</p>}
                  <p className="card-footnote">Counts repositories, not lines of code. GitHub may classify some projects without a primary language.</p>
                </article>
                <article className="content-card activity-card"><div className="card-heading"><div><p className="overline">PROJECT HEALTH</p><h2>Repository snapshot</h2></div><span className="snapshot-icon">↗</span></div>
                  <div className="snapshot-row"><span>Non-fork repositories</span><strong>{data.repos.filter((repo) => !repo.fork).length}</strong></div>
                  <div className="snapshot-row"><span>Archived projects</span><strong>{data.repos.filter((repo) => repo.archived).length}</strong></div>
                  <div className="snapshot-row"><span>Open issues across owned repos</span><strong>{formatNumber(totals.issues)}</strong></div>
                  <div className="snapshot-row"><span>Latest repository update</span><strong>{data.repos.length ? timeAgo(data.repos.reduce((latest, repo) => Date.parse(repo.updated_at) > Date.parse(latest) ? repo.updated_at : latest, data.repos[0].updated_at)) : "—"}</strong></div>
                  <p className="card-footnote">Public metadata only. This dashboard does not infer commit quality, contribution value, or private activity.</p>
                </article>
              </section>

              <section className="repositories-section" id="repositories">
                <div className="repositories-heading"><div><p className="overline">CODE & PROJECTS</p><h2>Repositories <span className="count-badge">{visibleRepos.length}</span></h2><p className="section-copy">Explore projects, language tags, and public engagement.</p></div>
                  <div className="repo-controls"><label htmlFor="sort">Sort by</label><select id="sort" value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="updated">Recently updated</option><option value="stars">Most stars</option><option value="forks">Most forks</option></select><label className="fork-toggle"><input type="checkbox" checked={includeForks} onChange={(event) => setIncludeForks(event.target.checked)} /> Include forks</label></div>
                </div>
                {visibleRepos.length ? <div className="repo-grid">{visibleRepos.map((repo) => <article className="repo-card" key={repo.id}><div className="repo-card-top"><span className="repo-icon">⌘</span><span className={`repo-state ${repo.archived ? "archived" : ""}`}>{repo.archived ? "Archived" : repo.fork ? "Fork" : "Public"}</span></div><a className="repo-title" href={repo.html_url} target="_blank" rel="noreferrer">{repo.name}<span>↗</span></a><p className="repo-description">{repo.description || "No description added yet."}</p><div className="repo-tags">{repo.language && <span className="language-tag"><i className={`language-dot lang-${Math.abs(repo.language.split("").reduce((n, c) => n + c.charCodeAt(0), 0)) % 6}`} />{repo.language}</span>}<span>☆ {formatNumber(repo.stargazers_count)}</span><span>⑂ {formatNumber(repo.forks_count)}</span></div><div className="repo-card-footer"><span>Updated {timeAgo(repo.updated_at)}</span>{repo.homepage && <a href={repo.homepage} target="_blank" rel="noreferrer">Live demo ↗</a>}</div></article>)}</div> : <div className="empty-state">No repositories match these filters.</div>}
              </section>
              <div className="data-footer"><span>DATA SOURCE <strong>GitHub REST API</strong></span><span>Fetched {new Date(data.fetched_at).toLocaleTimeString()}</span><button onClick={() => void loadProfile(username)} disabled={loading}>{loading ? "Refreshing…" : "↻ Refresh data"}</button></div>
            </>
          )}
          <footer className="page-footer"><span>DEVBOARD <span className="footer-dot">·</span> OPEN SOURCE PROJECT</span><span>Built by Asmi Bandyopadhyay · <a href="https://github.com/itsasmikb" target="_blank" rel="noreferrer">GitHub ↗</a></span></footer>
        </main>
      </div>
    </>
  );
}
