# Security

filmfeed fetches fixed hosts (Letterboxd RSS, MDBList, TMDB, and Trakt) using path segments it validates. It does not fetch arbitrary URLs.

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/kvithana/filmfeed/security/advisories/new) rather than a public issue.

Include what you tried, what you expected, and the smallest request that shows the problem. Do not include API keys.

## Secrets

`TMDB_API_KEY` and `TRAKT_CLIENT_ID` belong in the host's secret store (Cloudflare secrets, Vercel environment variables), not in git. `.env` is ignored.
