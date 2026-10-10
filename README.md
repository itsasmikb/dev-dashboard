# DevBoard — GitHub Repository Analytics

A responsive developer analytics dashboard built with Next.js, TypeScript, and the GitHub REST API. Search a public GitHub username to inspect repository counts, stars, forks, primary languages, and project metadata.

## Features

- Search public GitHub profiles by username.
- Profile summary with public repository and follower counts.
- Repository cards with descriptions, primary language, stars, forks, last update, archive/fork status, and optional live-demo links.
- Sort repositories by update time, stars, or forks; optionally include forks.
- Language footprint based on each repository's primary language.
- Loading, error, empty, and API rate-limit states.
- Server-side API route with input validation and short-lived response caching.
- Responsive layout for desktop, tablet, and mobile.

## Run locally

Requires Node.js 20+ and npm.

```bash
git clone https://github.com/itsasmikb/dev-dashboard.git
cd dev-dashboard
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The dashboard defaults to `itsasmikb`; use the search field to inspect another public profile.

## Build and quality checks

```bash
npm run lint
npm run build
npm start
```

GitHub Actions runs lint and production-build checks on pushes and pull requests.

## GitHub API

The browser calls the local `/api/github?username=...` endpoint. The server validates the username, requests the public profile and owned public repositories, and returns only the fields needed by the UI. Responses are cached briefly to reduce repeated requests.

Unauthenticated GitHub API requests are rate-limited. For local development or a deployed instance that needs higher limits, configure a server-side `GITHUB_TOKEN` environment variable with the minimum required permissions for public read access. **Never expose a token in client-side code or commit it to the repository.** The dashboard works without a token while within GitHub's public rate limit.

## Metrics and caveats

- Stars and forks are summed across non-fork repositories returned by the API.
- Language footprint counts repositories by their primary language; it does not measure lines of code or proficiency.
- “Updated” uses GitHub's repository update timestamp, which can change for metadata as well as code.
- Only public GitHub data is available. Private repositories, private activity, contribution quality, and actual engineering impact are not inferred.
- The endpoint returns up to 100 owned public repositories per query.

## Architecture

```text
src/pages/index.tsx       dashboard UI, search, sorting and filters
src/pages/api/github.ts   validated server-side GitHub API proxy
src/styles/globals.css    responsive dashboard styling
```

## Deployment

Deploy as a standard Next.js application on Vercel or another Node-compatible host. Add `GITHUB_TOKEN` only as a server-side environment variable if needed. No database is required.

## Author

Asmi Bandyopadhyay · [GitHub](https://github.com/itsasmikb)
