# filmfeed

Public movie lists, as the JSON [Radarr](https://radarr.video/) already imports. One HTTP function, cached at the edge. Nothing you have to keep running.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkvithana%2Ffilmfeed&project-name=filmfeed&repository-name=filmfeed&demo-title=filmfeed&demo-description=Serverless%20Radarr%20import%20feeds%20from%20public%20movie%20lists.&demo-url=https%3A%2F%2Ffilmfeed.kal.im)
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kvithana/filmfeed)
[![CI](https://github.com/kvithana/filmfeed/actions/workflows/ci.yml/badge.svg)](https://github.com/kvithana/filmfeed/actions/workflows/ci.yml)

Live demo: [filmfeed.kal.im](https://filmfeed.kal.im/)

Letterboxd diary, lists, watchlists, and a few profile filters, plus public lists from [MDBList](https://mdblist.com/), [TMDB](https://www.themoviedb.org/), and [Trakt](https://trakt.tv/). [letterboxd-list-radarr](https://github.com/screeny05/letterboxd-list-radarr) did the Letterboxd half with a web server and Redis. filmfeed is the fetch handler those hosts already run.

## Use it in Radarr

1. Open a deployment (the demo above, or your own).
2. In Radarr: **Settings → Import Lists → Custom Lists**.
3. Paste a feed URL and save.

```text
https://filmfeed.kal.im/screeny05/list/jackie-chan-the-definitive-list/
https://filmfeed.kal.im/kalpal/films/rated/3.5
https://filmfeed.kal.im/api/letterboxd/dave
https://filmfeed.kal.im/api/mdblist/linaspurinis/top-watched-movies-of-the-week
https://filmfeed.kal.im/api/tmdb/1
https://filmfeed.kal.im/api/trakt/someuser/watchlist
```

Radarr keeps movies whose JSON `id` is a TMDB id. filmfeed always sets `id` to that, and includes `imdb_id`, `title`, and `release_year` when the source has them.

```json
[
  {
    "id": 194,
    "title": "Amélie",
    "release_year": "2001",
    "imdb_id": "tt0211915",
    "clean_title": "amelie",
    "adult": false
  }
]
```

| Param | Meaning |
| --- | --- |
| `limit` | Integer from 1 to 1000. |
| `minRating` | Letterboxd diary only. Keep entries rated at least this (0–5). Unrated entries are dropped. |
| `errorOnEmpty` | `true` returns 404 when the feed has no movies. Default is `[]`. |

Responses are cached for an hour, so Radarr’s refresh does not hit the upstream on every poll.

## Feeds

| Feed | What you get | Key |
| --- | --- | --- |
| `GET /:user/list/:slug` | A public Letterboxd list. Same path as letterboxd.com. Also at `/api/letterboxd/:user/list/:slug`. | None |
| `GET /:user/watchlist` | A public Letterboxd watchlist. | None |
| `GET /:user/films` | A public watched-films page. | None |
| `GET /:user/films/rated/:rating` | Films at that rating. `3.5` means 3.5 stars. `7` is the same rating on Letterboxd’s 1–10 scale. `none` is unrated. | None |
| `GET /:user/films/year/:year` | Watched films released that year, such as `2024`. | None |
| `GET /:user/films/decade/:decade` | Watched films from that decade, such as `2010s`. | None |
| `GET /api/letterboxd/:user` | The public diary RSS. About the 100 most recent entries. | None |
| `GET /api/mdblist/:user/:list` | A public MDBList. Movies only. | None |
| `GET /api/tmdb/:listId` | A TMDB list, up to 500 films. | `TMDB_API_KEY` |
| `GET /api/trakt/:user/:list` | A public Trakt list, up to 500 films. Use `watchlist` for a user’s watchlist. | `TRAKT_CLIENT_ID` |

`GET /` is this project’s page for the deployment you are on. `GET /health` returns `{ "ok": true }`. `GET /api` lists the routes.

Letterboxd often answers list RSS with a Cloudflare challenge. filmfeed does not try to get past one. When the public list page itself is served, filmfeed reads the film links and the TMDB id on each film page, up to 80 films (30 on Cloudflare’s free plan). If a page stays blocked, copy the list to MDBList and use that feed. Diary RSS is separate and already includes TMDB ids.

## Deploy

Letterboxd and MDBList work with no keys. Add the two environment variables only if you want TMDB or Trakt.

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fkvithana%2Ffilmfeed&project-name=filmfeed&repository-name=filmfeed&demo-title=filmfeed&demo-description=Serverless%20Radarr%20import%20feeds%20from%20public%20movie%20lists.&demo-url=https%3A%2F%2Ffilmfeed.kal.im)

Or from a checkout: `npx vercel`. Set `TMDB_API_KEY` and `TRAKT_CLIENT_ID` in the project environment, then redeploy.

### Cloudflare Workers

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/kvithana/filmfeed)

```bash
npm install
npx wrangler login
npx wrangler secret put TMDB_API_KEY     # optional
npx wrangler secret put TRAKT_CLIENT_ID  # optional
npm run dev                              # http://localhost:8787
npx wrangler deploy
```

### Node

```bash
npm install
npm start
```

Listens on `127.0.0.1:3000` unless `PORT` / `HOST` are set. Copy `.env.example` and export the variables yourself. `npm start` reads the process environment.

## Environment variables

| Name | Required | Used by |
| --- | --- | --- |
| `TMDB_API_KEY` | No | `/api/tmdb/:listId`. A free key from TMDB. |
| `TRAKT_CLIENT_ID` | No | `/api/trakt/:user/:list`. Create an app at [trakt.tv/oauth/applications](https://trakt.tv/oauth/applications) and copy the client id. |

Without a key, that feed returns 501. The others keep working.

## Development

```bash
npm install
npm test
npm run typecheck
```

Node 20 or newer. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Limitations

- Letterboxd diary feeds are a recent window, not a user’s entire history.
- A Letterboxd list response includes at most 80 films, or 30 on Cloudflare’s free plan (50 outbound requests per invocation). Split a larger list, or copy it to MDBList.
- Genre, country, language, and sort URLs such as `/films/by/` or `/films/genre/` are blocked by Letterboxd. filmfeed does not request them. Rating, year, and decade are applied from the public films page.
- A challenge page is returned as an error. filmfeed does not try to get past it.
- TMDB and Trakt stay dark until that deployment has a key.
- This project is not affiliated with Letterboxd, Radarr, TMDB, MDBList, or Trakt.

## License

[MIT](LICENSE)
