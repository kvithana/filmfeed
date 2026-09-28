import { HttpError, fetchText, toRadarrMovie, type RadarrMovie } from "./lib.js";

export const HTML_FILM_CAP = 80;

function filmCap(): number {
  const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
  return onWorkers ? 30 : HTML_FILM_CAP;
}

const CHALLENGE =
  "Letterboxd did not serve this list. filmfeed does not bypass Cloudflare challenges. Copy the list to MDBList if the public page stays blocked.";

export type Poster = {
  slug: string;
  title: string;
  year?: string;
};

function decode(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function attr(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"));
  return match?.[1] ? decode(match[1]) : undefined;
}

export function splitTitle(name: string): { title: string; year?: string } {
  const match = name.trim().match(/^(.*)\((\d{4})\)\s*$/);
  if (!match?.[1]) return { title: name.trim() };
  return { title: match[1].trim(), year: match[2] };
}

export function parsePosters(html: string): Poster[] {
  const tags = html.match(/<div\b(?=[^>]*\bdata-component-class="LazyPoster")[^>]*>/g) ?? [];
  const posters: Poster[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    const identifier = attr(tag, "data-postered-identifier") ?? "";
    if (identifier && !/"type"\s*:\s*"film"/i.test(identifier)) continue;
    const link = attr(tag, "data-item-link") ?? "";
    const slug = attr(tag, "data-item-slug") ?? link.replace(/^\/film\//, "").replace(/\/$/, "");
    if (!slug || seen.has(slug) || !/^[a-z0-9][a-z0-9-]*$/i.test(slug)) continue;
    seen.add(slug);
    const named = splitTitle(attr(tag, "data-item-name") ?? slug);
    posters.push({ slug, title: named.title || slug, year: named.year });
  }
  return posters;
}

export function parseNextPath(html: string): string | null {
  const match = html.match(/<a class="next" href="([^"]+)"/i);
  const href = match?.[1];
  if (!href || !href.startsWith("/") || href.includes("..")) return null;
  return href;
}

export function parseFilmIds(html: string): { tmdb?: string; imdb?: string; year?: string } {
  const tmdb = html.match(/themoviedb\.org\/movie\/(\d+)/i);
  const imdb = html.match(/imdb\.com\/title\/(tt\d+)/i);
  const year = html.match(/\/films\/year\/(\d{4})/);
  return { tmdb: tmdb?.[1], imdb: imdb?.[1], year: year?.[1] };
}

export function isChallenge(response: Response, body: string): boolean {
  if (response.status === 403 || response.status === 503) return true;
  if (response.headers.get("cf-mitigated") === "challenge") return true;
  return body.includes("Just a moment");
}

export async function filmsFromLetterboxdPages(pagePath: string, limit: number): Promise<{ movies: RadarrMovie[]; truncated: boolean }> {
  const cap = Math.min(limit, filmCap());
  const posters: Poster[] = [];
  let next: string | null = `/${pagePath.replace(/^\/+|\/+$/g, "")}/`;
  let pages = 0;
  let truncated = false;

  while (next && posters.length < cap && pages < 8) {
    const page = await fetchText(`https://letterboxd.com${next}`, {
      headers: { accept: "text/html" },
    });
    if (isChallenge(page.response, page.body)) {
      if (posters.length === 0) throw new HttpError(502, CHALLENGE);
      break;
    }
    if (!page.response.ok) {
      throw new HttpError(page.response.status === 404 ? 404 : 502, `Letterboxd returned ${page.response.status}`);
    }
    pages += 1;
    const found = parsePosters(page.body);
    posters.push(...found.filter((poster) => !posters.some((existing) => existing.slug === poster.slug)));
    const following = parseNextPath(page.body);
    next = following && following !== next ? following : null;
    if (posters.length >= cap && following && cap === filmCap()) truncated = true;
  }

  const slice = posters.slice(0, cap);
  if (slice.length < posters.length && cap === filmCap()) truncated = true;

  const resolved = await mapPool(slice, 8, async (poster) => {
    try {
      const film = await fetchText(`https://letterboxd.com/film/${encodeURIComponent(poster.slug)}/`, {
        headers: { accept: "text/html" },
      });
      if (isChallenge(film.response, film.body) || !film.response.ok) return null;
      const ids = parseFilmIds(film.body);
      if (!ids.tmdb) return null;
      return toRadarrMovie({
        tmdbId: Number(ids.tmdb),
        title: poster.title,
        year: ids.year ?? poster.year,
        imdbId: ids.imdb,
      });
    } catch {
      return null;
    }
  });

  return {
    movies: resolved.filter((movie): movie is RadarrMovie => movie !== null && movie !== undefined),
    truncated,
  };
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item === undefined) continue;
      results[index] = await fn(item);
    }
  });
  await Promise.all(workers);
  return results;
}
