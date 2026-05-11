/**
 * API-Football client
 * Docs: https://www.api-football.com/documentation-v3
 */

const BASE_URL = "https://v3.football.api-sports.io";
const API_KEY  = process.env.FOOTBALL_API_KEY!;

export interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string };
    venue: { name: string | null; city: string | null };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    round: string;
    season: number;
  };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
}

async function apiFetch(path: string, params: Record<string, string | number> = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const res = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": API_KEY,
      "x-rapidapi-host": "v3.football.api-sports.io",
    },
    next: { revalidate: 0 }, // always fresh
  });

  if (!res.ok) throw new Error(`API-Football error: ${res.status}`);
  return res.json();
}

/** Get fixtures by date range */
export async function getFixturesByDate(
  from: string, // YYYY-MM-DD
  to: string,
  leagueId?: number,
  season?: number
): Promise<ApiFixture[]> {
  // Auto-detect season: Jan-Jul = previous year, Aug-Dec = current year
  const now = new Date();
  const autoSeason = season ?? (now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear());

  if (leagueId) {
    // League-specific: pass league + season + date range (required by API)
    const data = await apiFetch("/fixtures", {
      from, to,
      league: leagueId,
      season: autoSeason,
      timezone: "Africa/Cairo",
    });
    return data.response ?? [];
  }

  // No specific league: fetch each day individually using /fixtures?date=
  const results: ApiFixture[] = [];
  const end = new Date(to);
  for (let d = new Date(from); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const data = await apiFetch("/fixtures", { date: dateStr, timezone: "Africa/Cairo" });
    results.push(...(data.response ?? []));
  }
  return results;
}

/** Get fixtures for a specific league */
export async function getFixturesByLeague(
  leagueId: number,
  season?: number,
  daysAhead: number = 30
): Promise<ApiFixture[]> {
  const from = new Date().toISOString().split("T")[0];
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + daysAhead);
  const to = toDate.toISOString().split("T")[0];
  // Auto-detect season: Jan-Jul = previous year's season, Aug-Dec = current year
  const now = new Date();
  const autoSeason = season ?? (now.getMonth() < 7 ? now.getFullYear() - 1 : now.getFullYear());
  return getFixturesByDate(from, to, leagueId, autoSeason);
}

/** Get today + next N days fixtures across all leagues */
export async function getUpcomingFixtures(daysAhead: number = 7): Promise<ApiFixture[]> {
  const from = new Date().toISOString().split("T")[0];
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + daysAhead);
  const to = toDate.toISOString().split("T")[0];
  return getFixturesByDate(from, to);
}

/** Convert API-Football status → Matchkoo Match status */
export function toMatchStatus(short: string): "UPCOMING" | "LIVE" | "COMPLETED" {
  if (["NS", "TBD", "PST"].includes(short)) return "UPCOMING";
  if (["1H", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"].includes(short)) return "LIVE";
  return "COMPLETED"; // FT, AET, PEN, ABD, AWD, WO
}

/** Map API-Football league ID to a friendly continent/region */
export const LEAGUE_CONTINENT_MAP: Record<number, string> = {
  // Europe
  39: "europe",   // Premier League
  40: "europe",   // Championship
  41: "europe",   // League One
  135: "europe",  // Serie A
  140: "europe",  // La Liga
  78: "europe",   // Bundesliga
  61: "europe",   // Ligue 1
  94: "europe",   // Primeira Liga
  88: "europe",   // Eredivisie
  144: "europe",  // Jupiler Pro League
  2: "europe",    // UEFA Champions League
  3: "europe",    // UEFA Europa League
  848: "europe",  // UEFA Conference League
  // Africa
  12: "africa",   // CAF Champions League
  20: "africa",   // CAF Confederation Cup
  233: "africa",  // Egyptian Premier League
  // Asia
  307: "asia",    // Saudi Pro League
  // Americas
  253: "americas", // MLS
  71: "americas",  // Brazil Serie A
  // World
  1: "world",      // World Cup
  15: "world",     // FIFA Club World Cup
};
