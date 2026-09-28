export function homePage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>filmfeed</title>
  <meta name="description" content="Public movie lists as a Radarr custom-list feed. Serverless, with nothing to keep awake.">
  <style>
    :root { color-scheme: light dark; --ink: #17211b; --muted: #5c675f; --line: #d7ddd4; --accent: #0f6b4c; --bg: #f6f7f4; }
    @media (prefers-color-scheme: dark) {
      :root { --ink: #e7eee8; --muted: #a8b3ab; --line: #2c3831; --accent: #7dcea8; --bg: #101512; }
    }
    * { box-sizing: border-box; }
    body { margin: 0; font: 17px/1.55 Georgia, "Iowan Old Style", Palatino, serif; color: var(--ink); background: var(--bg); }
    main { max-width: 42rem; margin: 0 auto; padding: 3rem 1.25rem 4rem; }
    h1 { font-size: 2.4rem; line-height: 1; margin: 0 0 0.4rem; letter-spacing: -0.03em; }
    h2 { font-size: 1.25rem; margin: 2rem 0 0.4rem; }
    p, li { color: var(--ink); }
    .lede { font-size: 1.15rem; }
    .muted { color: var(--muted); }
    a { color: var(--accent); }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.86rem; }
    code { padding: 0.1em 0.3em; background: color-mix(in srgb, var(--line) 55%, transparent); border-radius: 4px; }
    pre { overflow: auto; padding: 0.9rem 1rem; background: color-mix(in srgb, var(--line) 45%, transparent); border-radius: 8px; }
    ol { padding-left: 1.2rem; }
  </style>
</head>
<body>
  <main>
    <h1>filmfeed</h1>
    <p class="lede">Public movie lists, as the JSON Radarr already knows how to import.</p>
    <p class="muted">No Redis, no container, no process that has to stay awake. Put it on Cloudflare Workers or Vercel and Radarr polls a URL.</p>

    <h2>Use it in Radarr</h2>
    <ol>
      <li>Settings → Import Lists → add <strong>Custom Lists</strong>.</li>
      <li>Set List URL to one of the feed URLs below, on your deployment.</li>
      <li>Test, then save. Radarr reads the <code>id</code> field as the TMDB id.</li>
    </ol>
    <pre>https://YOUR_DOMAIN/api/mdblist/linaspurinis/top-watched-movies-of-the-week
https://YOUR_DOMAIN/api/letterboxd/dave
https://YOUR_DOMAIN/api/tmdb/1
https://YOUR_DOMAIN/api/trakt/someuser/watchlist</pre>

    <h2>Sources</h2>
    <ul>
      <li><strong>MDBList</strong> public lists. Full list, TMDB and IMDb ids. No key.</li>
      <li><strong>Letterboxd diary RSS</strong> at <code>/api/letterboxd/:user</code>. About the 100 most recent public diary entries, with TMDB ids. This is the feed Letterboxd publishes.</li>
      <li><strong>Letterboxd list and watchlist RSS</strong> are requested as published, and returned when Letterboxd serves them. They are often blocked. filmfeed does not try to get around that.</li>
      <li><strong>TMDB lists</strong> need <code>TMDB_API_KEY</code> on the deployment.</li>
      <li><strong>Trakt lists</strong> need <code>TRAKT_CLIENT_ID</code> on the deployment.</li>
    </ul>
    <p>Add <code>?limit=50</code> to cap a feed. Letterboxd also accepts <code>?minRating=4</code>. <code>?errorOnEmpty=true</code> returns 404 when nothing matched.</p>

    <h2>Why this is smaller than a scraper</h2>
    <p>The usual Letterboxd-to-Radarr bridge keeps a web server and a cache running so it can page through the site. Letterboxd’s terms disallow that kind of automated extraction, and the list pages sit behind a challenge page. filmfeed only calls published feeds and official APIs, then caches the JSON at the edge for an hour.</p>
    <p class="muted">Not affiliated with Letterboxd, Radarr, TMDB, MDBList, or Trakt.</p>
  </main>
</body>
</html>`;
}
