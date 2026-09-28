import { describe, expect, it, vi, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { parseFilmIds, parsePosters, parseRatingToken } from "../src/letterboxd-html.js";
import { letterboxdToRadarr, parseLetterboxdRss } from "../src/letterboxd.js";
import { dedupe, parseLimit } from "../src/lib.js";
import { mdblistToRadarr } from "../src/mdblist.js";
import { tmdbPageToRadarr } from "../src/tmdb.js";
import { traktMoviesUrl, traktToRadarr } from "../src/trakt.js";

const diary = `<?xml version="1.0"?>
<rss><channel>
  <item>
    <title>Am&amp;lie, 2001 - ★★★★★</title>
    <letterboxd:filmTitle>Am&#233;lie</letterboxd:filmTitle>
    <letterboxd:filmYear>2001</letterboxd:filmYear>
    <letterboxd:memberRating>5.0</letterboxd:memberRating>
    <tmdb:movieId>194</tmdb:movieId>
  </item>
  <item>
    <letterboxd:filmTitle>No Id</letterboxd:filmTitle>
    <letterboxd:filmYear>1999</letterboxd:filmYear>
  </item>
  <item>
    <letterboxd:filmTitle>Amelie again</letterboxd:filmTitle>
    <letterboxd:memberRating>2</letterboxd:memberRating>
    <tmdb:movieId>194</tmdb:movieId>
  </item>
  <item>
    <letterboxd:filmTitle>Low</letterboxd:filmTitle>
    <letterboxd:memberRating>3</letterboxd:memberRating>
    <tmdb:movieId>550</tmdb:movieId>
  </item>
</channel></rss>`;

describe("letterboxd rss", () => {
  it("reads titles, years, ratings, and tmdb ids", () => {
    const entries = parseLetterboxdRss(diary);
    expect(entries[0]).toMatchObject({ title: "Amélie", year: "2001", tmdbId: 194, rating: 5 });
    expect(entries).toHaveLength(4);
  });

  it("drops films without a tmdb id and applies minRating", () => {
    const movies = letterboxdToRadarr(parseLetterboxdRss(diary), 4);
    expect(movies.map((movie) => movie.id)).toEqual([194]);
    expect(movies[0]?.release_year).toBe("2001");
  });
});

describe("other sources", () => {
  it("maps mdblist movies and skips shows", () => {
    const movies = mdblistToRadarr([
      { id: 475557, title: "Joker", imdb_id: "tt7286456", release_year: 2019, mediatype: "movie", adult: 0 },
      { id: 1, title: "A show", mediatype: "show", release_year: 2020 },
    ]);
    expect(movies).toEqual([
      expect.objectContaining({ id: 475557, imdb_id: "tt7286456", title: "Joker", adult: false, release_year: "2019" }),
    ]);
  });

  it("maps a tmdb list page", () => {
    const movies = tmdbPageToRadarr({
      items: [{ id: 550, title: "Fight Club", release_date: "1999-10-15", adult: false }],
    });
    expect(movies[0]).toMatchObject({ id: 550, title: "Fight Club", release_year: "1999" });
  });

  it("uses Trakt's watchlist route for that name", () => {
    expect(traktMoviesUrl("ada", "watchlist")).toBe("https://api.trakt.tv/users/ada/watchlist/movies");
    expect(traktMoviesUrl("ada", "criterion")).toBe("https://api.trakt.tv/users/ada/lists/criterion/items/movies");
  });

  it("maps trakt movies", () => {
    const movies = traktToRadarr([{ movie: { title: "Fight Club", year: 1999, ids: { tmdb: 550, imdb: "tt0137523" } } }]);
    expect(movies[0]).toMatchObject({ id: 550, imdb_id: "tt0137523" });
  });

  it("dedupes and caps", () => {
    const movies = dedupe(
      [
        { id: 1, title: "A", adult: false },
        { id: 1, title: "A again", adult: false },
        { id: 2, title: "B", adult: false },
      ],
      1,
    );
    expect(movies.map((movie) => movie.id)).toEqual([1]);
  });

  it("rejects a bad limit", () => {
    expect(() => parseLimit("0")).toThrow(/limit/);
  });
});

describe("letterboxd pages", () => {
  it("reads a rating from the films grid", () => {
    const html = `<li class="griditem"><div class="react-component" data-component-class="LazyPoster" data-item-slug="amelie" data-item-name="Amelie (2001)" data-item-link="/film/amelie/" data-postered-identifier='{"type":"film"}'></div><span class="rating rated-7">★★★½</span></li>`;
    expect(parsePosters(html)).toEqual([{ slug: "amelie", title: "Amelie", year: "2001", rating: 7 }]);
    expect(parseRatingToken("3.5")).toBe(7);
    expect(parseRatingToken("7")).toBe(7);
    expect(parseRatingToken("none")).toBeNull();
  });

  it("reads the current poster markup", () => {
    const html = `<div class="react-component" data-component-class="LazyPoster" data-item-slug="amelie" data-item-name="Am&amp;lie (2001)" data-item-link="/film/amelie/" data-postered-identifier="{&quot;type&quot;:&quot;film&quot;}"></div>`;
    expect(parsePosters(html)).toEqual([{ slug: "amelie", title: "Am&lie", year: "2001" }]);
  });

  it("reads tmdb and imdb links from a film page", () => {
    const html = `<a href="https://www.themoviedb.org/movie/194/">tmdb</a><a href="http://www.imdb.com/title/tt0211915/maindetails">imdb</a>`;
    expect(parseFilmIds(html)).toMatchObject({ tmdb: "194", imdb: "tt0211915" });
  });
});

describe("http", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.TMDB_API_KEY;
    delete process.env.TRAKT_CLIENT_ID;
  });

  it("serves a homepage and health check", async () => {
    const app = createApp();
    const home = await app.request("http://localhost/");
    expect(home.status).toBe(200);
    const html = await home.text();
    expect(html).toContain("Custom Lists");
    expect(html).toContain("https://vercel.com/new/clone?repository-url=");
    expect(html).toContain("https://deploy.workers.cloudflare.com/?url=https://github.com/kvithana/filmfeed");
    expect(html).toContain("http://localhost/kalpal/films/rated/3.5");
    const health = await app.request("http://localhost/health");
    expect(await health.json()).toEqual({ ok: true, name: "filmfeed" });
  });

  it("turns a diary feed into Radarr JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(diary, { status: 200, headers: { "content-type": "application/rss+xml" } })),
    );
    const response = await createApp().request("http://localhost/api/letterboxd/dave?limit=10");
    expect(response.status).toBe(200);
    expect(response.headers.get("x-filmfeed-source")).toBe("letterboxd-diary");
    const body = (await response.json()) as { id: number }[];
    expect(body.map((movie) => movie.id)).toEqual([194, 550]);
  });

  it("turns a public list page into Radarr JSON when RSS is blocked", async () => {
    const list = `<div class="react-component" data-component-class="LazyPoster" data-item-slug="amelie" data-item-name="Amelie (2001)" data-item-link="/film/amelie/" data-postered-identifier='{"type":"film"}'></div>`;
    const film = `<a href="https://www.themoviedb.org/movie/194/">tmdb</a><a href="http://www.imdb.com/title/tt0211915/">imdb</a><a href="/films/year/2001">`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.endsWith("/rss/")) {
          return new Response("<!DOCTYPE html>Just a moment...", { status: 403, headers: { "content-type": "text/html" } });
        }
        if (url.includes("/film/")) {
          return new Response(film, { status: 200, headers: { "content-type": "text/html" } });
        }
        return new Response(list, { status: 200, headers: { "content-type": "text/html" } });
      }),
    );
    const response = await createApp().request("http://localhost/screeny05/list/jackie-chan/?limit=5");
    expect(response.status).toBe(200);
    expect(response.headers.get("x-filmfeed-source")).toBe("letterboxd-list");
    const body = (await response.json()) as { id: number; imdb_id?: string; release_year?: string }[];
    expect(body).toEqual([expect.objectContaining({ id: 194, imdb_id: "tt0211915", title: "Amelie", release_year: "2001" })]);
  });

  it("filters a films page by star rating", async () => {
    const grid = (slug: string, name: string, score: number) =>
      `<li class="griditem"><div class="react-component" data-component-class="LazyPoster" data-item-slug="${slug}" data-item-name="${name}" data-item-link="/film/${slug}/" data-postered-identifier='{"type":"film"}'></div><span class="rating rated-${score}"></span></li>`;
    const list = grid("amelie", "Amelie (2001)", 7) + grid("dink", "The Dink (2026)", 4);
    const film = (id: string) => `<a href="https://www.themoviedb.org/movie/${id}/">tmdb</a>`;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        const id = url.includes("amelie") ? "194" : "1";
        const body = url.includes("/film/") ? film(id) : list;
        return new Response(body, { status: 200, headers: { "content-type": "text/html" } });
      }),
    );
    const response = await createApp().request("http://localhost/kalpal/films/rated/3.5?limit=5");
    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: number; title: string }[];
    expect(body.map((movie) => movie.title)).toEqual(["Amelie"]);
    expect(body[0]?.id).toBe(194);
  });

  it("rejects genre filters that Letterboxd blocks", async () => {
    const response = await createApp().request("http://localhost/kalpal/films/genre/drama");
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/does not bypass/);
  });

  it("explains a blocked letterboxd list without pretending it succeeded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<!DOCTYPE html>Just a moment...", { status: 403, headers: { "content-type": "text/html" } })),
    );
    const response = await createApp().request("http://localhost/api/letterboxd/dave/list/my-list");
    expect(response.status).toBe(502);
    const body = (await response.json()) as { error: string };
    expect(body.error).toMatch(/does not bypass/);
  });

  it("rejects usernames that could change the host", async () => {
    const response = await createApp().request("http://localhost/api/letterboxd/dave.evil");
    expect(response.status).toBe(400);
  });

  it("reports a missing tmdb key", async () => {
    const response = await createApp().request("http://localhost/api/tmdb/1");
    expect(response.status).toBe(501);
  });
});
