import { Hono } from "hono";
import { isBlockedFeed, letterboxdToRadarr, parseLetterboxdRss } from "./letterboxd.js";
import {
  HttpError,
  dedupe,
  fetchText,
  parseLimit,
  parseMinRating,
  requireSlug,
  requireTmdbListId,
  requireUser,
  wantsEmptyError,
  type RadarrMovie,
} from "./lib.js";
import { fetchMdbList } from "./mdblist.js";
import { homePage } from "./page.js";
import { fetchTmdbList } from "./tmdb.js";
import { fetchTraktList } from "./trakt.js";

export type Bindings = {
  TMDB_API_KEY?: string;
  TRAKT_CLIENT_ID?: string;
};

function readEnv(env: Bindings | undefined, key: keyof Bindings): string | undefined {
  const bound = env?.[key];
  if (typeof bound === "string" && bound.length > 0) return bound;
  const fromProcess = globalThis.process?.env?.[key];
  if (typeof fromProcess === "string" && fromProcess.length > 0) return fromProcess;
  return undefined;
}

function moviesResponse(movies: RadarrMovie[], source: string, errorOnEmpty: boolean): Response {
  if (movies.length === 0 && errorOnEmpty) {
    return Response.json({ error: "List is empty" }, { status: 404, headers: cacheHeaders(60) });
  }
  const headers = cacheHeaders(3600);
  headers.set("x-filmfeed-source", source);
  headers.set("x-filmfeed-count", String(movies.length));
  return Response.json(movies, { headers });
}

function cacheHeaders(seconds: number): Headers {
  return new Headers({
    "cache-control": `public, max-age=${seconds}, s-maxage=${seconds}, stale-while-revalidate=86400`,
  });
}

async function letterboxdFeed(path: string, minRating: number | undefined): Promise<RadarrMovie[]> {
  const url = `https://letterboxd.com/${path}`;
  const { response, body } = await fetchText(url);
  if (isBlockedFeed(response, body) || !response.ok) {
    throw new HttpError(
      502,
      "Letterboxd did not serve this RSS feed. Diary feeds usually work; list and watchlist feeds are often blocked. filmfeed does not bypass that. Use an MDBList, TMDB, or Trakt list for a full catalog.",
    );
  }
  return letterboxdToRadarr(parseLetterboxdRss(body), minRating);
}

export function createApp(): Hono<{ Bindings: Bindings }> {
  const app = new Hono<{ Bindings: Bindings }>();

  app.onError((error, c) => {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError ? error.message : "Unexpected error";
    return c.json({ error: message }, status as 400, { "cache-control": "public, max-age=60" });
  });

  app.get("/", (c) => c.html(homePage(new URL(c.req.url).origin)));

  app.get("/health", (c) => c.json({ ok: true, name: "filmfeed" }));

  app.get("/api", (c) =>
    c.json({
      name: "filmfeed",
      radarr: "Custom Lists",
      feeds: [
        "/api/letterboxd/:user",
        "/api/letterboxd/:user/watchlist",
        "/api/letterboxd/:user/list/:slug",
        "/api/mdblist/:user/:list",
        "/api/tmdb/:listId",
        "/api/trakt/:user/:list",
      ],
    }),
  );

  app.get("/api/letterboxd/:user", async (c) => {
    const user = requireUser(c.req.param("user"));
    const movies = await letterboxdFeed(`${user}/rss/`, parseMinRating(c.req.query("minRating")));
    return moviesResponse(dedupe(movies, parseLimit(c.req.query("limit"))), "letterboxd-diary", wantsEmptyError(c.req.query("errorOnEmpty")));
  });

  app.get("/api/letterboxd/:user/watchlist", async (c) => {
    const user = requireUser(c.req.param("user"));
    const movies = await letterboxdFeed(`${user}/watchlist/rss/`, parseMinRating(c.req.query("minRating")));
    return moviesResponse(dedupe(movies, parseLimit(c.req.query("limit"))), "letterboxd-watchlist", wantsEmptyError(c.req.query("errorOnEmpty")));
  });

  app.get("/api/letterboxd/:user/list/:slug", async (c) => {
    const user = requireUser(c.req.param("user"));
    const slug = requireSlug(c.req.param("slug"), "list");
    const movies = await letterboxdFeed(`${user}/list/${slug}/rss/`, parseMinRating(c.req.query("minRating")));
    return moviesResponse(dedupe(movies, parseLimit(c.req.query("limit"))), "letterboxd-list", wantsEmptyError(c.req.query("errorOnEmpty")));
  });

  app.get("/api/mdblist/:user/:list", async (c) => {
    const user = requireSlug(c.req.param("user"), "user");
    const list = requireSlug(c.req.param("list"), "list");
    const movies = await fetchMdbList(user, list);
    return moviesResponse(dedupe(movies, parseLimit(c.req.query("limit"))), "mdblist", wantsEmptyError(c.req.query("errorOnEmpty")));
  });

  app.get("/api/tmdb/:listId", async (c) => {
    const listId = requireTmdbListId(c.req.param("listId"));
    const apiKey = readEnv(c.env, "TMDB_API_KEY");
    if (!apiKey) throw new HttpError(501, "TMDB_API_KEY is not configured on this deployment");
    const limit = parseLimit(c.req.query("limit")) ?? 500;
    const movies = await fetchTmdbList(listId, apiKey, limit);
    return moviesResponse(dedupe(movies, limit), "tmdb", wantsEmptyError(c.req.query("errorOnEmpty")));
  });

  app.get("/api/trakt/:user/:list", async (c) => {
    const user = requireSlug(c.req.param("user"), "user");
    const list = requireSlug(c.req.param("list"), "list");
    const clientId = readEnv(c.env, "TRAKT_CLIENT_ID");
    if (!clientId) throw new HttpError(501, "TRAKT_CLIENT_ID is not configured on this deployment");
    const limit = parseLimit(c.req.query("limit")) ?? 500;
    const movies = await fetchTraktList(user, list, clientId, limit);
    return moviesResponse(dedupe(movies, limit), "trakt", wantsEmptyError(c.req.query("errorOnEmpty")));
  });

  return app;
}

const app = createApp();
export default app;
