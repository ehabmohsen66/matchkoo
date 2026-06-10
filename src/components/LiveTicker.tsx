'use client';

import { useEffect, useRef } from 'react';

interface LiveEvent {
  type: string;
  detail: string;
  playerName: string;
  teamName: string;
  time: string;
  homeTeam: string;
  score: string;
  awayTeam: string;
}

interface NewsItem {
  title: string;
  source: string;
  ageLabel?: string;
}

let _newsCache: { items: NewsItem[]; cachedAt: number } | null = null;
const NEWS_TTL = 30 * 60 * 1000; // 30 min

async function buildLiveEventsHTML(track: HTMLDivElement): Promise<boolean> {
  try {
    const res = await fetch('/api/live-events');
    if (!res.ok) return false;
    const data = await res.json();
    const events: LiveEvent[] = data.events || [];
    if (events.length === 0) return false;

    const items = events.map(evt => {
      const icon = evt.type === 'Goal' ? '⚽' : '🟥';
      const extra =
        evt.detail === 'Penalty' ? ' <span style="font-size:0.7rem;opacity:0.6">(P)</span>'
        : evt.detail === 'Own Goal' ? ' <span style="font-size:0.7rem;opacity:0.6">(OG)</span>'
        : '';
      const player = evt.playerName || evt.teamName || '';
      const score = `${evt.homeTeam} <span class="lt-score">${evt.score}</span> ${evt.awayTeam}`;
      return `<span class="lt-item">${icon} <strong>${player}</strong>${extra} <span style="opacity:0.45">${evt.time}'</span> · ${score}<span class="lt-sep">|</span></span>`;
    }).join('');

    track.innerHTML = items + items;
    const dur = Math.max(18, Math.min(60, events.length * 5));
    track.style.animationDuration = `${dur}s`;
    return true;
  } catch {
    return false;
  }
}

async function buildNewsHTML(track: HTMLDivElement): Promise<void> {
  try {
    if (!_newsCache || Date.now() - _newsCache.cachedAt > NEWS_TTL) {
      const res = await fetch('/api/football-news');
      if (!res.ok) throw new Error('No news');
      const data = await res.json();
      _newsCache = { items: data.news || [], cachedAt: Date.now() };
    }

    const news = _newsCache.items;
    if (!news.length) {
      track.innerHTML = '<span class="lt-no-live">📰 Football news unavailable right now</span>';
      return;
    }

    const items = news.map(n => {
      const age = n.ageLabel
        ? `<span style="opacity:0.45;font-size:0.75rem"> · ${n.ageLabel}</span>`
        : '';
      const src = `<span style="color:#08BDBD;font-size:0.75rem;opacity:0.8"> ${n.source}</span>`;
      return `<span class="lt-item">📰 <strong style="color:#fff">${n.title}</strong>${src}${age}<span class="lt-sep">|</span></span>`;
    }).join('');

    track.innerHTML = items + items;
    const dur = Math.max(40, news.length * 6);
    track.style.animationDuration = `${dur}s`;
  } catch {
    track.innerHTML = '<span class="lt-no-live">📰 No news right now — check back soon</span>';
  }
}

async function refreshTicker(track: HTMLDivElement) {
  // Priority 1: live match events
  const hasLive = await buildLiveEventsHTML(track);
  // Priority 2: real-time football news
  if (!hasLive) {
    await buildNewsHTML(track);
  }
}

export default function LiveTicker() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    refreshTicker(track);

    const interval = setInterval(() => {
      if (trackRef.current) refreshTicker(trackRef.current);
    }, 90000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="landing-ticker-wrap">
      {/* LIVE badge */}
      <div className="landing-ticker-badge">
        <span className="landing-live-dot"></span>
        <span className="landing-ticker-label">LIVE</span>
      </div>
      {/* Scrolling viewport */}
      <div className="landing-ticker-viewport">
        <div className="landing-ticker-track" ref={trackRef}>
          <span style={{ color: 'rgba(255,255,255,0.4)', padding: '0 16px', fontSize: '0.85rem' }}>
            Loading…
          </span>
        </div>
      </div>
    </div>
  );
}
