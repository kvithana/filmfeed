import { decodeXml, toRadarrMovie, type RadarrMovie } from "./lib.js";

export type LetterboxdEntry = {
  title: string;
  year?: string;
  tmdbId?: number;
  rating?: number;
};

function tag(block: string, name: string): string | undefined {
  const pattern = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");
  const match = block.match(pattern);
  if (!match?.[1]) return undefined;
  const value = decodeXml(match[1]);
  return value || undefined;
}

export function parseLetterboxdRss(xml: string): LetterboxdEntry[] {
  const entries: LetterboxdEntry[] = [];
  for (const chunk of xml.split(/<item\b[^>]*>/i).slice(1)) {
    const block = chunk.split(/<\/item>/i)[0] ?? "";
    const title = tag(block, "letterboxd:filmTitle");
    if (!title) continue;

    const tmdbRaw = tag(block, "tmdb:movieId");
    const tmdbId = tmdbRaw ? Number(tmdbRaw) : undefined;
    const ratingRaw = tag(block, "letterboxd:memberRating");
    const rating = ratingRaw ? Number(ratingRaw) : undefined;

    entries.push({
      title,
      year: tag(block, "letterboxd:filmYear"),
      tmdbId: Number.isInteger(tmdbId) ? tmdbId : undefined,
      rating: rating !== undefined && Number.isFinite(rating) ? rating : undefined,
    });
  }
  return entries;
}

export function letterboxdToRadarr(entries: LetterboxdEntry[], minRating?: number): RadarrMovie[] {
  const movies: RadarrMovie[] = [];
  for (const entry of entries) {
    if (minRating !== undefined && (entry.rating === undefined || entry.rating < minRating)) continue;
    if (entry.tmdbId === undefined) continue;
    const movie = toRadarrMovie({ tmdbId: entry.tmdbId, title: entry.title, year: entry.year });
    if (movie) movies.push(movie);
  }
  return movies;
}

export function isBlockedFeed(response: Response, body: string): boolean {
  if (response.status === 403 || response.status === 503) return true;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) return true;
  return body.trimStart().startsWith("<!DOCTYPE") || body.includes("Just a moment");
}
