import { HttpError, fetchText, toRadarrMovie, type RadarrMovie } from "./lib.js";

type MdbListItem = {
  id?: unknown;
  title?: unknown;
  imdb_id?: unknown;
  release_year?: unknown;
  mediatype?: unknown;
  adult?: unknown;
};

export function mdblistToRadarr(payload: unknown): RadarrMovie[] {
  if (!Array.isArray(payload)) {
    const message =
      payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
        ? payload.error
        : "MDBList did not return a list";
    throw new HttpError(502, message);
  }

  const movies: RadarrMovie[] = [];
  for (const item of payload as MdbListItem[]) {
    if (item.mediatype !== "movie") continue;
    if (typeof item.title !== "string" || typeof item.id !== "number") continue;
    const movie = toRadarrMovie({
      tmdbId: item.id,
      title: item.title,
      year: typeof item.release_year === "number" || typeof item.release_year === "string" ? item.release_year : undefined,
      imdbId: typeof item.imdb_id === "string" ? item.imdb_id : undefined,
      adult: item.adult === 1 || item.adult === true,
    });
    if (movie) movies.push(movie);
  }
  return movies;
}

export async function fetchMdbList(user: string, list: string): Promise<RadarrMovie[]> {
  const url = `https://mdblist.com/lists/${encodeURIComponent(user)}/${encodeURIComponent(list)}/json`;
  const { response, body } = await fetchText(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new HttpError(502, `MDBList returned ${response.status}`);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new HttpError(502, "MDBList returned invalid JSON");
  }
  return mdblistToRadarr(payload);
}
