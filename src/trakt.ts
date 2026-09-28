import { HttpError, fetchText, toRadarrMovie, type RadarrMovie } from "./lib.js";

type TraktItem = {
  movie?: {
    title?: unknown;
    year?: unknown;
    ids?: { tmdb?: unknown; imdb?: unknown };
  };
};

export function traktToRadarr(payload: unknown): RadarrMovie[] {
  if (!Array.isArray(payload)) {
    throw new HttpError(502, "Trakt did not return a list");
  }

  const movies: RadarrMovie[] = [];
  for (const item of payload as TraktItem[]) {
    const movie = item.movie;
    const tmdbId = movie?.ids?.tmdb;
    if (!movie || typeof movie.title !== "string" || typeof tmdbId !== "number") continue;
    const mapped = toRadarrMovie({
      tmdbId,
      title: movie.title,
      year: typeof movie.year === "number" ? movie.year : undefined,
      imdbId: typeof movie.ids?.imdb === "string" ? movie.ids.imdb : undefined,
    });
    if (mapped) movies.push(mapped);
  }
  return movies;
}

export function traktMoviesUrl(user: string, list: string): string {
  const owner = encodeURIComponent(user);
  if (list === "watchlist") return `https://api.trakt.tv/users/${owner}/watchlist/movies`;
  return `https://api.trakt.tv/users/${owner}/lists/${encodeURIComponent(list)}/items/movies`;
}

export async function fetchTraktList(user: string, list: string, clientId: string, limit = 500): Promise<RadarrMovie[]> {
  const movies: RadarrMovie[] = [];
  const pageSize = 100;
  const maxPages = Math.min(10, Math.max(1, Math.ceil(limit / pageSize)));

  for (let page = 1; page <= maxPages && movies.length < limit; page += 1) {
    const url = new URL(traktMoviesUrl(user, list));
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(pageSize));

    const { response, body } = await fetchText(url.toString(), {
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": clientId,
      },
    });

    if (response.status === 404) throw new HttpError(404, "Trakt list was not found");
    if (!response.ok) throw new HttpError(502, `Trakt returned ${response.status}`);

    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      throw new HttpError(502, "Trakt returned invalid JSON");
    }

    const pageMovies = traktToRadarr(payload);
    movies.push(...pageMovies);
    const pageCount = Number(response.headers.get("x-pagination-page-count") ?? "1");
    if (!Number.isFinite(pageCount) || page >= pageCount || pageMovies.length === 0) break;
  }

  return movies.slice(0, limit);
}
