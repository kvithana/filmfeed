export const USER_AGENT = "filmfeed/0.1 (+https://github.com/kvithana/filmfeed)";

export const MAX_BODY_BYTES = 2_000_000;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export type RadarrMovie = {
  id: number;
  title: string;
  adult: boolean;
  imdb_id?: string;
  release_year?: string;
  clean_title?: string;
};

const SLUG = /^[a-z0-9][a-z0-9_-]*$/i;
const USER = /^[A-Za-z0-9_]{1,40}$/;
const TMDB_LIST = /^[0-9]{1,12}$/;
const IMDB = /^tt\d{5,10}$/;

export function requireSlug(value: string, label: string): string {
  if (!SLUG.test(value)) {
    throw new HttpError(400, `${label} contains unsupported characters`);
  }
  return value;
}

export function requireUser(value: string): string {
  if (!USER.test(value)) {
    throw new HttpError(400, "username contains unsupported characters");
  }
  return value;
}

export function requireTmdbListId(value: string): string {
  if (!TMDB_LIST.test(value)) {
    throw new HttpError(400, "TMDB list id must be numeric");
  }
  return value;
}

export function cleanTitle(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "film";
}

export function toRadarrMovie(input: {
  tmdbId: number;
  title: string;
  year?: string | number | null;
  imdbId?: string | null;
  adult?: boolean;
}): RadarrMovie | undefined {
  if (!Number.isInteger(input.tmdbId) || input.tmdbId <= 0) return undefined;
  const title = input.title.trim();
  if (!title) return undefined;

  const movie: RadarrMovie = {
    id: input.tmdbId,
    title,
    adult: input.adult === true,
    clean_title: cleanTitle(title),
  };

  if (input.year !== undefined && input.year !== null && `${input.year}`.trim() !== "") {
    movie.release_year = String(input.year);
  }

  if (input.imdbId && IMDB.test(input.imdbId)) {
    movie.imdb_id = input.imdbId;
  }

  return movie;
}

export function dedupe(movies: RadarrMovie[], limit?: number): RadarrMovie[] {
  const seen = new Set<number>();
  const unique: RadarrMovie[] = [];
  for (const movie of movies) {
    if (seen.has(movie.id)) continue;
    seen.add(movie.id);
    unique.push(movie);
    if (limit !== undefined && unique.length >= limit) break;
  }
  return unique;
}

export function parseLimit(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === "") return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 1000) {
    throw new HttpError(400, "limit must be an integer from 1 to 1000");
  }
  return value;
}

export function parseMinRating(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === "") return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 5) {
    throw new HttpError(400, "minRating must be a number from 0 to 5");
  }
  return value;
}

export function wantsEmptyError(raw: string | undefined): boolean {
  return raw === "true" || raw === "1";
}

export function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

export async function readBody(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new HttpError(502, "Upstream response is larger than 2 MB");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export async function fetchText(url: string, init: RequestInit = {}): Promise<{ response: Response; body: string }> {
  const headers = new Headers(init.headers);
  if (!headers.has("user-agent")) headers.set("user-agent", USER_AGENT);
  if (!headers.has("accept")) headers.set("accept", "application/rss+xml, application/xml, application/json, text/xml");

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    throw new HttpError(502, `Upstream request failed: ${message}`);
  }

  const body = await readBody(response);
  return { response, body };
}
