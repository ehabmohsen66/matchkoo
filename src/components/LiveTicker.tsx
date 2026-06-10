'use client';

import { useEffect, useRef } from 'react';

// Fallback static matches when no live events
const FALLBACK_ITEMS = [
  { home: 'Man United',   score: '1 – 2', away: 'Arsenal',   status: 'LIVE', time: "67'" },
  { home: 'Real Madrid',  score: '2 – 0', away: 'Barcelona', status: 'LIVE', time: "34'" },
  { home: 'Bayern Munich',score: '3 – 1', away: 'Dortmund',  status: 'FT',   time: null },
  { home: 'PSG',          score: '1 – 1', away: 'Lyon',      status: 'LIVE', time: "78'" },
  { home: 'Al Ahly',      score: '2 – 0', away: 'Wydad',     status: 'FT',   time: null },
  { home: 'AC Milan',     score: '0 – 1', away: 'Juventus',  status: 'LIVE', time: "52'" },
];

function buildFallbackHTML(): string {
  const items = FALLBACK_ITEMS.map(m => {
    const statusEl = m.status === 'LIVE'
      ? `<span style="display:inline-flex;align-items:center;gap:4px;color:#F21B3F;font-weight:900;font-size:0.7rem;letter-spacing:1px"><span style="width:6px;height:6px;border-radius:50%;background:#F21B3F;display:inline-block;animation:live-pulse 1.4s ease-in-out infinite"></span>LIVE</span>`
      : `<span style="color:#ABFF4F;font-weight:800;font-size:0.72rem;letter-spacing:1px">FT</span>`;
    const timeEl = m.time
      ? `<span style="color:rgba(255,255,255,0.45);font-size:0.78rem">${m.time}</span>`
      : '';
    return `<span class="lt-item"><strong>${m.home}</strong> <span class="lt-score">${m.score}</span> <strong>${m.away}</strong> ${statusEl} ${timeEl}<span class="lt-sep">|</span></span>`;
  }).join('');
  return items + items;
}

async function buildLiveHTML(): Promise<string | null> {
  try {
    const res = await fetch('/api/live-events');
    if (!res.ok) return null;
    const data = await res.json();
    const events: Array<{
      type: string; detail: string; playerName: string; teamName: string;
      time: string; homeTeam: string; score: string; awayTeam: string;
    }> = data.events || [];
    if (events.length === 0) return null;

    const items = events.map(evt => {
      const icon = evt.type === 'Goal' ? '⚽' : '🟥';
      const extra = evt.detail === 'Penalty' ? ' <span style="font-size:0.7rem;opacity:0.6">(P)</span>'
                  : evt.detail === 'Own Goal' ? ' <span style="font-size:0.7rem;opacity:0.6">(OG)</span>'
                  : '';
      const player = evt.playerName || evt.teamName || '';
      const score = `${evt.homeTeam} <span class="lt-score">${evt.score}</span> ${evt.awayTeam}`;
      return `<span class="lt-item">${icon} <strong>${player}</strong>${extra} <span style="opacity:0.45">${evt.time}'</span> · ${score}<span class="lt-sep">|</span></span>`;
    }).join('');

    return items + items;
  } catch {
    return null;
  }
}

export default function LiveTicker() {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const track = trackRef.current;
      if (!track) return;
      const liveHTML = await buildLiveHTML();
      track.innerHTML = liveHTML ?? buildFallbackHTML();
      if (liveHTML) {
        // Adjust speed based on content
        const count = (liveHTML.match(/lt-item/g) || []).length / 2;
        const dur = Math.max(18, Math.min(60, count * 5));
        track.style.animationDuration = `${dur}s`;
      }
    };
    init();
    const interval = setInterval(async () => {
      const liveHTML = await buildLiveHTML();
      if (liveHTML && trackRef.current) {
        trackRef.current.innerHTML = liveHTML;
      }
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
          <span style={{ color: 'rgba(255,255,255,0.4)', padding: '0 16px', fontSize: '0.85rem' }}>Loading…</span>
        </div>
      </div>
    </div>
  );
}
