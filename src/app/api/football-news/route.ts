import { NextResponse } from "next/server";

/**
 * GET /api/football-news
 * Fetches football news from RSS feeds (BBC Sport + Sky Sports).
 * Cached in-memory for 30 minutes to avoid hammering RSS endpoints.
 */

interface NewsItem {
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  ageLabel: string; // e.g. "2h ago"
}

// In-memory cache
let _cache: { items: NewsItem[]; cachedAt: number } | null = null;
const CACHE_MS = 30 * 60 * 1000; // 30 minutes

const RSS_FEEDS = [
  { url: "https://feeds.bbci.co.uk/sport/football/rss.xml",  source: "BBC Sport" },
  { url: "https://www.skysports.com/rss/12040",              source: "Sky Sports" },
];

/** Parse a single RSS feed into NewsItem[] */
async function parseFeed(feedUrl: string, source: string): Promise<NewsItem[]> {
  const res = await fetch(feedUrl, {
    headers: { "User-Agent": "Matchkoo/2.0 (football news aggregator)" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return [];

  const xml = await res.text();
  const items: NewsItem[] = [];

  const matches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
  for (const m of matches) {
    const block = m[1];

    // Title — strip CDATA wrapper
    const rawTitle = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() ?? "";
    const title = rawTitle
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
    if (!title || title.length < 8) continue;

    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? "";
    const link    = block.match(/<link[^>]*>\s*(https?:\/\/[^\s<]+)/)?.[1]?.trim()
                 ?? block.match(/<guid[^>]*>(https?:\/\/[^\s<]+)<\/guid>/)?.[1]?.trim()
                 ?? "";

    const publishedMs = pubDate ? new Date(pubDate).getTime() : 0;
    const ageLabel    = _relativeTime(publishedMs);

    items.push({ title, source, publishedAt: pubDate, url: link, ageLabel });
  }

  return items.slice(0, 12);
}

/** Human-friendly relative time */
function _relativeTime(ms: number): string {
  if (!ms) return "";
  const diff = Date.now() - ms;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1)  return `${h}h ago`;
  if (m >= 1)  return `${m}m ago`;
  return "just now";
}

export async function GET() {
  try {
    // Serve from cache if fresh
    if (_cache && Date.now() - _cache.cachedAt < CACHE_MS) {
      return NextResponse.json({ news: _cache.items });
    }

    // Fetch all feeds in parallel, tolerate individual failures
    const results = await Promise.allSettled(
      RSS_FEEDS.map((f) => parseFeed(f.url, f.source))
    );

    const all: NewsItem[] = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : []
    );

    // Sort newest first
    all.sort((a, b) => {
      const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return tb - ta;
    });

    const items = all.slice(0, 24);
    _cache = { items, cachedAt: Date.now() };

    return NextResponse.json({ news: items });
  } catch {
    return NextResponse.json({ news: [] });
  }
}
