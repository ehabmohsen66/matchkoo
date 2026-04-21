/**
 * KICKOFF — FRAMER MOTION GAMING ORCHESTRATION
 * Advanced physics-based animations for a cyberpunk gaming platform
 */

import { animate, stagger, spring } from "framer-motion";

/* ─── EXPOSE TO GLOBAL ──────────────────────────────────────── */
window.framerAnimate = animate;
window.framerStagger = stagger;

/* ─── HUD ENTRANCE — Page-level staggered reveal ───────────── */
window.animatePageEnter = (pageElement) => {
  if (!pageElement) return;

  // Fade in the whole page
  animate(pageElement,
    { opacity: [0, 1], filter: ["blur(4px)", "blur(0px)"] },
    { duration: 0.25, ease: "easeOut" }
  );

  // Stagger-in all major cards with spring bounce
  const cards = pageElement.querySelectorAll(
    '.match-card, .fixture-row, .challenge-card, .mini-lb-row, ' +
    '.continent-card, .league-card, .pred-item, .stat-card, .boost-card, ' +
    '.league-tile, .trophy-item, .league-action-card'
  );

  if (cards.length > 0) {
    animate(cards,
      { opacity: [0, 1], y: [24, 0], scale: [0.96, 1] },
      {
        delay: stagger(0.045, { startDelay: 0.05 }),
        duration: 0.4,
        type: "spring",
        stiffness: 160,
        damping: 18
      }
    );
  }

  // Page title glitch-in
  const title = pageElement.querySelector('.page-title');
  if (title) {
    animate(title,
      { opacity: [0, 1], x: [-12, 0], filter: ["blur(3px)", "blur(0)"] },
      { duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }
    );
  }
};

/* ─── MODAL SPRING — Modal pop-in with spring physics ──────── */
window.animateModalEnter = (overlay, sheet) => {
  if (!overlay) return;
  overlay.classList.remove('hidden');

  // Backdrop fade
  animate(overlay,
    { opacity: [0, 1] },
    { duration: 0.2, ease: "easeOut" }
  );

  // Sheet pop-up with spring bounce
  if (sheet) {
    animate(sheet,
      { y: [40, 0], scale: [0.92, 1], opacity: [0, 1] },
      { type: "spring", stiffness: 280, damping: 24 }
    );
  }
};

/* ─── MODAL EXIT ────────────────────────────────────────────── */
window.animateModalExit = (overlay, sheet, callback) => {
  if (!overlay) { if (callback) callback(); return; }

  const done = () => {
    overlay.classList.add('hidden');
    if (callback) callback();
  };

  if (sheet) {
    animate(sheet,
      { y: [0, 30], scale: [1, 0.94], opacity: [1, 0] },
      { duration: 0.18, ease: "easeIn" }
    );
  }
  animate(overlay,
    { opacity: [1, 0] },
    { duration: 0.2, ease: "easeIn", onComplete: done }
  );
};

/* ─── NAV ITEM CLICK FEEDBACK ───────────────────────────────── */
window.animateNavClick = (element) => {
  if (!element) return;
  animate(element,
    { scale: [1, 0.95, 1.03, 1] },
    { duration: 0.25, ease: "easeOut" }
  );
};

/* ─── FIXTURE ROW HOVER ─────────────────────────────────────── */
window.animateRowIn = (rows) => {
  if (!rows || rows.length === 0) return;
  animate(rows,
    { opacity: [0, 1], x: [-10, 0] },
    { delay: stagger(0.03), duration: 0.25, ease: "easeOut" }
  );
};

/* ─── XP POP ANIMATION ──────────────────────────────────────── */
window.animateXPPop = (badge) => {
  if (!badge) return;
  animate(badge,
    { scale: [0, 1.2, 1], opacity: [0, 1] },
    { type: "spring", stiffness: 300, damping: 20 }
  );
};

/* ─── BUTTON CLICK RIPPLE ───────────────────────────────────── */
window.animateButtonClick = (btn) => {
  if (!btn) return;
  animate(btn,
    { scale: [1, 0.93, 1.04, 1] },
    { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }
  );
};

/* ─── PROGRESS BAR FILL ─────────────────────────────────────── */
window.animateProgressBar = (fill, targetPct) => {
  if (!fill) return;
  animate(fill,
    { scaleX: [0, targetPct / 100] },
    {
      duration: 0.8,
      ease: [0.34, 1.56, 0.64, 1],
      transformOrigin: "left center"
    }
  );
};

/* ─── SCORE COUNTER ─────────────────────────────────────────── */
window.animateCounter = (element, from, to) => {
  if (!element) return;
  const range = to - from;
  let startTime = null;
  const dur = 1200;

  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = Math.min(timestamp - startTime, dur);
    const eased = 1 - Math.pow(1 - elapsed / dur, 3);
    element.textContent = Math.round(from + range * eased).toLocaleString();
    if (elapsed < dur) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
};

console.log('[KickOff] Framer Motion gaming orchestration loaded ✓');
