import { HttpError, fetchText, toRadarrMovie, type RadarrMovie } from "./lib.js";

type TmdbListItem = {
  id?: unknown;
  title?: unknown;
  original_title?: unknown;
  release_date?: unknown;
  adult?: unknown;
};

type TmdbListPage = {
  items?: TmdbListItem[];
  total_pages?: number;
  status_message?: string;
};

export function tmdbPageToRadarr(payload: TmdbListPage): RadarrMovie[] {
  const movies: RadarrMovie[] = [];
  for (const item of payload.items ?? []) {
    const title = typeof item.title === "string" && item.title ? item.title : item.original_title;
    if (typeof item.id !== "number" || typeof title !== "string") continue;
    const year = typeof item.release_date === "string" ? item.release_date.slice(0, 4) : undefined;
    const movie = toRadarrMovie({
      tmdbId: item.id,
      title,
      year: year && /^\d{4}$/.test(year) ? year : undefined,
      adult: item.adult === true,
    });
    if (movie) movies.push(movie);
  }
  return movies;
}

export async function fetchTmdbList(listId: string, apiKey: string, limit = 500): Promise<RadarrMovie[]> {
  const movies: RadarrMovie[] = [];
  const maxPages = Math.min(25, Math.max(1, Math.ceil(limit / 20)));

  for (let page = 1; page <= maxPages && movies.length < limit; page += 1) {
    const url = new URL(`https://api.themoviedb.org/3/list/${listId}`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("page", String(page));

    const { response, body } = await fetchText(url.toString(), { headers: { accept: "application/json" } });
    let payload: TmdbListPage;
    try {
      payload = JSON.parse(body) as TmdbListPage;
    } catch {
      throw new HttpError(502, "TMDB returned invalid JSON");
    }

    if (!response.ok) {
      throw new HttpError(response.status === 404 ? 404 : 502, payload.status_message || `TMDB returned ${response.status}`);
    }

    movies.push(...tmdbPageToRadarr(payload));
    const totalPages = payload.total_pages ?? 1;
    if (page >= totalPages) break;
  }

  return movies.slice(0, limit);
}
