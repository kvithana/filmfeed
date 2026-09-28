# filmfeed

Public movie lists, as the JSON [Radarr](https://radarr.video/) already imports. One HTTP function, cached at the edge. Nothing you have to keep running.

[letterboxd-list-radarr](https://github.com/screeny05/letterboxd-list-radarr) did this with a web server and Redis. filmfeed is one HTTP function for Cloudflare, Vercel, or any host that can run Node. Diary entries come from Letterboxd’s RSS feed. Lists come from the public page when Letterboxd serves it. A challenge page is an error. filmfeed does not try to get past one.

[![CI](https://github.com/kvithana/filmfeed/actions/workflows/ci.yml/badge.svg)](https://github.com/kvithana/filmfeed/actions/workflows/ci.yml)

## Use it in Radarr

1. Deploy filmfeed (see below). You can also point Radarr at someone else's deployment if they run one.
2. In Radarr: **Settings → Import Lists → Custom Lists**.
3. Set **List URL** to a feed URL:

```text
https://YOUR_DOMAIN/api/mdblist/linaspurinis/top-watched-movies-of-the-week
https://YOUR_DOMAIN/screeny05/list/jackie-chan-the-definitive-list/
https://YOUR_DOMAIN/api/letterboxd/dave
https://YOUR_DOMAIN/api/tmdb/1
https://YOUR_DOMAIN/api/trakt/someuser/watchlist
```

4. Test and save.

Radarr's Custom Lists importer keeps movies whose JSON `id` is a TMDB id. filmfeed always sets `id` to that. `imdb_id`, `title`, and `release_year` are included when the source has them.

Optional query parameters:

| Param | Meaning |
| --- | --- |
| `limit` | Integer from 1 to 1000. |
| `minRating` | Letterboxd only. Keep diary entries rated at least this (0–5). Unrated entries are dropped. |
| `errorOnEmpty` | `true` returns 404 when the feed has no movies. Default is `[]`. |

Responses are cached for an hour (`Cache-Control`), so Radarr's refresh does not hit the upstream on every poll.

## Sources

| Feed | What you get | Key |
| --- | --- | --- |
| `GET /api/mdblist/:user/:list` | A public [MDBList](https://mdblist.com/) list. Movies only. | None |
| `GET /api/letterboxd/:user` | The public [Letterboxd](https://letterboxd.com/) diary RSS. About the 100 most recent entries. | None |
| `GET /:user/list/:slug` | A public Letterboxd list. Same path as on letterboxd.com. Also at `/api/letterboxd/:user/list/:slug`. | None |
| `GET /:user/watchlist` | A public watchlist. | None |
| `GET /:user/films` | A public watched-films page. | None |
| `GET /api/tmdb/:listId` | A [TMDB](https://www.themoviedb.org/) list, up to 500 films. | `TMDB_API_KEY` |
| `GET /api/trakt/:user/:list` | A public [Trakt](https://trakt.tv/) list, up to 500 films. | `TRAKT_CLIENT_ID` |

Letterboxd’s list RSS is often a Cloudflare challenge. filmfeed does not solve challenges. When the public list page itself is served, filmfeed reads the film links on that page and the TMDB id linked from each film, up to 80 films. `?limit=` can lower that. If the page is blocked, copy the list to MDBList and use that feed. Diary RSS is separate and includes TMDB ids directly.

`GET /` is a short HTML page. `GET /health` returns `{ "ok": true }`. `GET /api` lists the routes.

## Deploy

The app is a [Hono](https://hono.dev/) fetch handler. Cloudflare Workers and Vercel both run that directly. A tiny Node server exists for anything else that can run `node`.

### Cloudflare Workers

Free tier is enough. Radarr talks to the workers.dev (or custom domain) URL.

```bash
npm install
npx wrangler login
npx wrangler secret put TMDB_API_KEY     # optional
npx wrangler secret put TRAKT_CLIENT_ID  # optional
npm run dev                              # http://localhost:8787
npx wrangler deploy
```

### Vercel

[Deploy filmfeed](https://vercel.com/new/clone?repository-url=https://github.com/kvithana/filmfeed) or:

```bash
npx vercel
```

Set `TMDB_API_KEY` and `TRAKT_CLIENT_ID` in the project environment only if you want those two feeds. Redeploy after adding them.

### Anywhere else

```bash
npm install
npm start
```

Listens on `127.0.0.1:3000` unless `PORT` / `HOST` are set. Copy `.env.example` to `.env` for local keys (`npm start` reads the process environment; export the variables yourself or use your host's env UI).

## Development

```bash
npm install
npm test
npm run typecheck
```

Node 20 or newer. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Limitations

- Letterboxd diary feeds are a recent window, not a user's entire film history.
- A single response includes at most 80 films from a Letterboxd list page, or 30 on Cloudflare’s free plan (50 outbound requests per invocation). Larger lists should be split, or copied to MDBList.
- Filmography, studio, and popular-film pages are not separate routes. Watched films, watchlists, and lists are.
- Letterboxd challenge pages are returned as an error. filmfeed does not try to get past them.
- TMDB and Trakt stay dark until that deployment has a key. Both keys are free from those sites.
- This project is not affiliated with Letterboxd, Radarr, TMDB, MDBList, or Trakt.

## License

[MIT](LICENSE)
