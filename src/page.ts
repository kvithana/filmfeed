const REPO = "https://github.com/kvithana/filmfeed";
const VERCEL_DEPLOY =
  "https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkvithana%2Ffilmfeed&project-name=filmfeed&repository-name=filmfeed&demo-title=filmfeed&demo-description=Serverless%20Radarr%20import%20feeds%20from%20public%20movie%20lists.&demo-url=https%3A%2F%2Ffilmfeed.kal.im";
const CLOUDFLARE_DEPLOY = "https://deploy.workers.cloudflare.com/?url=https://github.com/kvithana/filmfeed";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

export function homePage(origin = "https://YOUR_DOMAIN"): string {
  const base = escapeHtml(origin);
  const feeds: [string, string][] = [
    ["Letterboxd list", `${origin}/screeny05/list/jackie-chan-the-definitive-list/`],
    ["Rated 3.5 stars", `${origin}/kalpal/films/rated/3.5`],
    ["Diary", `${origin}/api/letterboxd/dave`],
    ["MDBList", `${origin}/api/mdblist/linaspurinis/top-watched-movies-of-the-week`],
    ["TMDB list", `${origin}/api/tmdb/1`],
    ["Trakt watchlist", `${origin}/api/trakt/someuser/watchlist`],
  ];

  const feedRows = feeds
    .map(([label, url]) => {
      const safeUrl = escapeHtml(url);
      return `<li>
        <div>
          <span class="label">${escapeHtml(label)}</span>
          <code>${safeUrl}</code>
        </div>
        <button type="button" data-copy="${safeUrl}">Copy</button>
      </li>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>filmfeed — Radarr lists from public movie feeds</title>
  <meta name="description" content="Public movie lists as the JSON Radarr already imports. One serverless function for Letterboxd, MDBList, TMDB, and Trakt.">
  <meta property="og:title" content="filmfeed">
  <meta property="og:description" content="Public movie lists as a Radarr custom-list feed. Deploy on Vercel or Cloudflare.">
  <meta property="og:url" content="${base}/">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23141712'/%3E%3Cpath d='M8 7h3v18H8zm13 0h3v18h-3zM13.5 10h5v2h-5zm0 5h5v2h-5zm0 5h5v2h-5z' fill='%23f4f1ea'/%3E%3C/svg%3E">
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f3f0e8;
      --ink: #171512;
      --muted: #5f5a52;
      --line: #ddd6c8;
      --card: #fffdf8;
      --accent: #0f6b4c;
      --accent-ink: #f4fff8;
      --shadow: 0 1px 0 rgba(23, 21, 18, 0.04);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #121411;
        --ink: #f3f0e8;
        --muted: #b7b1a6;
        --line: #2c312c;
        --card: #1b1e1a;
        --accent: #8fd7b4;
        --accent-ink: #102117;
        --shadow: none;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--accent) 10%, transparent), transparent 280px),
        var(--bg);
      font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    }
    a { color: var(--accent); }
    header, main, footer { width: min(52rem, calc(100% - 2rem)); margin-inline: auto; }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 0;
    }
    .wordmark {
      color: inherit;
      font-weight: 680;
      letter-spacing: -0.04em;
      text-decoration: none;
    }
    nav { display: flex; gap: 1rem; font-size: 0.92rem; }
    nav a { color: var(--muted); text-decoration: none; }
    nav a:hover { color: var(--ink); }
    h1 {
      max-width: 16ch;
      margin: 0.35rem 0 0.75rem;
      font-size: clamp(2.2rem, 6vw, 3.4rem);
      line-height: 0.98;
      letter-spacing: -0.045em;
    }
    h2 { margin: 0 0 0.75rem; font-size: 1.15rem; letter-spacing: -0.02em; }
    .eyebrow {
      margin: 0;
      color: var(--accent);
      font-size: 0.78rem;
      font-weight: 650;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .lede { max-width: 38rem; margin: 0; font-size: 1.12rem; color: var(--muted); }
    .actions { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; margin: 1.4rem 0 2.4rem; }
    .badges {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem;
      border: 1px solid #e4e4e4;
      border-radius: 8px;
      background: #fff;
    }
    .badges a { display: inline-flex; line-height: 0; }
    .badges img { height: 32px; width: auto; }
    .ghost {
      height: 32px;
      padding: 0 0.85rem;
      border: 1px solid var(--line);
      border-radius: 6px;
      color: var(--ink);
      background: var(--card);
      font-size: 0.84rem;
      line-height: 30px;
      text-decoration: none;
    }
    section {
      margin: 0 0 1rem;
      padding: 1.15rem 1.15rem 1.2rem;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--card);
      box-shadow: var(--shadow);
    }
    ol { margin: 0; padding-left: 1.2rem; }
    ol li + li { margin-top: 0.35rem; }
    .feeds { list-style: none; margin: 0; padding: 0; }
    .feeds li {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      justify-content: space-between;
      padding: 0.7rem 0;
      border-top: 1px solid var(--line);
    }
    .feeds li > div { min-width: 0; }
    .feeds li:first-child { border-top: 0; padding-top: 0; }
    .feeds .label { display: block; font-size: 0.82rem; font-weight: 650; }
    .feeds code, pre code {
      display: block;
      overflow-x: auto;
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 0.78rem;
    }
    .feeds code { white-space: nowrap; }
    button {
      flex: none;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 0.3rem 0.7rem;
      color: var(--ink);
      background: transparent;
      font: inherit;
      font-size: 0.78rem;
      cursor: pointer;
    }
    button:hover { border-color: var(--accent); color: var(--accent); }
    pre {
      margin: 0;
      overflow: auto;
      padding: 0.85rem 1rem;
      border-radius: 10px;
      background: color-mix(in srgb, var(--line) 45%, transparent);
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .sources { margin: 0; padding-left: 1.1rem; color: var(--muted); }
    .sources strong { color: var(--ink); font-weight: 650; }
    footer { padding: 0.4rem 0 2.5rem; color: var(--muted); font-size: 0.88rem; }
    @media (max-width: 700px) {
      .grid { grid-template-columns: 1fr; }
      .feeds li { align-items: flex-start; }
    }
  </style>
</head>
<body>
  <header>
    <a class="wordmark" href="/">filmfeed</a>
    <nav>
      <a href="${escapeHtml(REPO)}">GitHub</a>
      <a href="/api">API</a>
      <a href="/health">Health</a>
    </nav>
  </header>
  <main>
    <p class="eyebrow">Radarr custom lists</p>
    <h1>Public movie lists, as JSON Radarr already imports.</h1>
    <p class="lede">One HTTP function for Letterboxd, MDBList, TMDB, and Trakt. Cached at the edge. Nothing you have to keep running.</p>
    <div class="actions">
      <div class="badges">
        <a href="${VERCEL_DEPLOY}" aria-label="Deploy with Vercel"><img src="https://vercel.com/button" alt="" height="32"></a>
        <a href="${CLOUDFLARE_DEPLOY}" aria-label="Deploy to Cloudflare"><img src="https://deploy.workers.cloudflare.com/button" alt="" height="32"></a>
      </div>
      <a class="ghost" href="${escapeHtml(REPO)}">View source</a>
    </div>

    <section>
      <h2>Use it in Radarr</h2>
      <ol>
        <li>Settings → Import Lists → add <strong>Custom Lists</strong>.</li>
        <li>Paste a feed URL from this deployment, or from your own.</li>
        <li>Test, then save. Radarr reads <code>id</code> as the TMDB id.</li>
      </ol>
    </section>

    <section>
      <h2>Feeds on this deployment</h2>
      <ul class="feeds">${feedRows}</ul>
    </section>

    <div class="grid">
      <section>
        <h2>Sources</h2>
        <ul class="sources">
          <li><strong>Letterboxd</strong> diary, lists, watchlists, and films. <code>/you/films/rated/3.5</code>, <code>/year/2024</code>, and <code>/decade/2010s</code> are filtered from the public films page.</li>
          <li><strong>MDBList</strong> public lists. No key.</li>
          <li><strong>TMDB</strong> lists need <code>TMDB_API_KEY</code>.</li>
          <li><strong>Trakt</strong> lists need <code>TRAKT_CLIENT_ID</code>.</li>
        </ul>
      </section>
      <section>
        <h2>What Radarr receives</h2>
        <pre><code>[{
  "id": 194,
  "title": "Amélie",
  "release_year": "2001",
  "imdb_id": "tt0211915",
  "clean_title": "amelie",
  "adult": false
}]</code></pre>
      </section>
    </div>
  </main>
  <footer>
    <p>Add <code>?limit=50</code> to cap a feed. Letterboxd diary also accepts <code>?minRating=4</code>. Responses cache for an hour.</p>
    <p>Not affiliated with Letterboxd, Radarr, TMDB, MDBList, or Trakt. <a href="${escapeHtml(REPO)}#limitations">Limitations</a>.</p>
  </footer>
  <script>
    document.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", async () => {
        const value = button.getAttribute("data-copy");
        if (!value) return;
        let copied = false;
        try {
          await navigator.clipboard.writeText(value);
          copied = true;
        } catch {
          const area = document.createElement("textarea");
          area.value = value;
          area.setAttribute("readonly", "");
          area.style.position = "fixed";
          area.style.left = "-9999px";
          document.body.append(area);
          area.select();
          copied = document.execCommand("copy");
          area.remove();
        }
        if (!copied) return;
        const previous = button.textContent;
        button.textContent = "Copied";
        setTimeout(() => { button.textContent = previous; }, 1200);
      });
    });
  </script>
</body>
</html>`;
}
