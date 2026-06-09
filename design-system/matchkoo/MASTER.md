# Design System Master File — Matchkoo

> **LOGIC:** When building a specific page, first check `design-system/matchkoo/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Matchkoo  
**Category:** Football Prediction / Sports Gamification Web App  
**Stack:** Next.js (App Router) + Tailwind CSS v4 + Framer Motion  
**Generated:** 2026-06-09  

---

## Project Context

Matchkoo is a **dark-themed football prediction platform** with strong gamification mechanics (XP, leaderboards, badges, weekly challenges). The UI should feel like a premium sports app — energetic but polished, dark-first, with clear data hierarchy and smooth micro-animations.

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#7C3AED` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Primary Light | `#A78BFA` | `--color-primary-light` |
| Secondary | `#3B82F6` | `--color-secondary` |
| Accent/CTA | `#22C55E` | `--color-accent` |
| Gold | `#F59E0B` | `--color-gold` |
| Background | `#0A0A0F` | `--color-background` |
| Surface | `#111128` | `--color-surface` |
| Surface 2 | `#1A1A35` | `--color-surface-2` |
| Foreground | `#F1F5F9` | `--color-foreground` |
| Muted Text | `#94A3B8` | `--color-muted` |
| Border | `#2D2D4E` | `--color-border` |
| Destructive | `#EF4444` | `--color-destructive` |
| Ring | `#7C3AED` | `--color-ring` |

**Color Notes:**
- Deep dark navy background (`#0A0A0F`) for OLED-friendly dark mode
- Violet purple (`#7C3AED`) as brand primary — energetic yet premium
- Emerald green (`#22C55E`) for positive outcomes, correct predictions, XP gains
- Amber gold (`#F59E0B`) for XP points, leaderboard rank badges, achievements
- Red (`#EF4444`) for wrong predictions, alerts, destructive actions

### Typography

- **Heading Font:** Russo One (bold, gaming/sports personality)
- **Body Font:** Chakra Petch (clean, technical, sports dashboard feel)
- **Mood:** Bold, competitive, energetic, esports-ready
- **Google Fonts:** [Russo One + Chakra Petch](https://fonts.google.com/share?selection.family=Chakra+Petch:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400|Russo+One)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Russo+One&display=swap');
```

**Font Usage:**
- `h1, h2, h3`: Russo One, uppercase encouraged
- `body, p, span, td`: Chakra Petch 400/500
- `labels, captions`: Chakra Petch 300, muted color
- `numbers/XP/stats`: Chakra Petch 700, primary or gold color

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps, icon spacing |
| `--space-sm` | `8px` / `0.5rem` | Inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Card padding |
| `--space-xl` | `32px` / `2rem` | Section padding |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `6px` | Small elements, tags |
| `--radius-md` | `10px` | Buttons, inputs |
| `--radius-lg` | `14px` | Cards |
| `--radius-xl` | `20px` | Modals, large panels |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Subtle lift |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` | Cards |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.5)` | Modals |
| `--shadow-glow` | `0 0 20px rgba(124,58,237,0.3)` | Brand glow on interactive elements |
| `--shadow-gold` | `0 0 16px rgba(245,158,11,0.3)` | XP/achievement glow |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: white;
  padding: 12px 24px;
  border-radius: 10px;
  font-family: 'Chakra Petch', sans-serif;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.5px;
  transition: all 200ms ease;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(124,58,237,0.4);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(124,58,237,0.5);
}

/* CTA / Accent Button */
.btn-accent {
  background: linear-gradient(135deg, #22C55E, #16A34A);
  color: white;
  padding: 14px 28px;
  border-radius: 10px;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.5px;
  transition: all 200ms ease;
  cursor: pointer;
}

/* Ghost Button */
.btn-ghost {
  background: transparent;
  color: #A78BFA;
  border: 1px solid #2D2D4E;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 500;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-ghost:hover {
  background: rgba(124,58,237,0.1);
  border-color: #7C3AED;
}
```

### Cards

```css
/* Standard Card */
.card {
  background: #111128;
  border: 1px solid #2D2D4E;
  border-radius: 14px;
  padding: 20px;
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  border-color: #7C3AED;
  box-shadow: 0 0 20px rgba(124,58,237,0.15);
  transform: translateY(-2px);
}

/* Match Card */
.match-card {
  background: #111128;
  border: 1px solid #2D2D4E;
  border-radius: 14px;
  padding: 16px;
  transition: border-color 200ms ease;
}

.match-card.predicted {
  border-color: rgba(34,197,94,0.4);
  background: rgba(34,197,94,0.05);
}

/* XP / Stat Card */
.stat-card {
  background: linear-gradient(135deg, rgba(124,58,237,0.2), rgba(59,130,246,0.1));
  border: 1px solid rgba(124,58,237,0.3);
  border-radius: 14px;
  padding: 20px;
}
```

### Inputs

```css
.input {
  background: #1A1A35;
  border: 1px solid #2D2D4E;
  border-radius: 10px;
  padding: 12px 16px;
  font-family: 'Chakra Petch', sans-serif;
  font-size: 15px;
  color: #F1F5F9;
  transition: border-color 200ms ease;
}

.input::placeholder {
  color: #64748B;
}

.input:focus {
  border-color: #7C3AED;
  outline: none;
  box-shadow: 0 0 0 3px rgba(124,58,237,0.15);
}
```

### XP / Badge Indicators

```css
/* XP Pill */
.xp-badge {
  background: rgba(245,158,11,0.15);
  border: 1px solid rgba(245,158,11,0.3);
  color: #F59E0B;
  font-family: 'Chakra Petch', sans-serif;
  font-weight: 700;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
}

/* Level Badge */
.level-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
}

/* Prediction Outcome */
.outcome-correct { color: #22C55E; }
.outcome-wrong   { color: #EF4444; }
.outcome-pending { color: #94A3B8; }
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
}

.modal {
  background: #111128;
  border: 1px solid #2D2D4E;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.7);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Dark Sports / Gamification  
**Mode:** Dark-first (no light mode requirement)  
**Keywords:** Bold, competitive, premium dark, neon accents, XP-driven, leaderboard energy

**Key Effects:**
- Subtle glows on active/hovered elements using `box-shadow` (no heavy blur)
- Framer Motion entrance animations: `fadeInUp` with 200-300ms stagger
- Smooth number count-up on XP/stats reveals
- `prefers-reduced-motion` respected — disable animations if set
- Card hover: `translateY(-2px)` + border-color transition (no layout shift)
- Loading states: skeleton shimmer (`#1A1A35` → `#2D2D4E`)

### Page Pattern

**Pattern Name:** Dashboard Hub  
- **Navigation:** Bottom tab bar (mobile) / Side nav (desktop)
- **Hierarchy:** Hero stats strip → Content sections → Action buttons
- **Section Order:** Live Matches → Upcoming → Leaderboard → Challenges

---

## Anti-Patterns (Do NOT Use)

- ❌ **Light backgrounds** — App is dark-mode only
- ❌ **Emojis as icons** — Use Lucide React or Heroicons SVGs
- ❌ **Inline red/green for everything** — Reserve `#22C55E` for success, `#EF4444` for errors only
- ❌ **Missing `cursor: pointer`** — All interactive elements need it
- ❌ **Layout-shifting hovers** — Use `translateY(-2px)` max; no width/height changes
- ❌ **Low contrast text** — `--color-muted` (`#94A3B8`) is the minimum for body text; never lower
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Use `box-shadow: 0 0 0 3px rgba(124,58,237,0.4)` on focus
- ❌ **AI purple gradient overuse** — Keep gradients subtle; don't apply everywhere
- ❌ **Hardcoded hex values in components** — Always use CSS variables

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] Dark background only (`#0A0A0F` or `#111128`)
- [ ] No emojis used as icons (use Lucide React / Heroicons SVGs)
- [ ] All icons from consistent icon set (Lucide)
- [ ] `cursor: pointer` on all clickable elements
- [ ] Hover states: `translateY(-2px)` + border/shadow transition only
- [ ] Smooth transitions 150-300ms
- [ ] XP numbers styled in gold (`#F59E0B`)
- [ ] Correct outcomes in green (`#22C55E`), wrong in red (`#EF4444`)
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
- [ ] Framer Motion used for page transitions and card reveals

---

## Project-Specific Rules

### XP Levels & Colors

| Level | Name | XP Required | Badge Color |
|-------|------|-------------|-------------|
| 🥉 | Bronze | 0 | `#CD7F32` |
| 🥈 | Silver | 1,000 | `#94A3B8` |
| 🥇 | Gold | 10,000 | `#F59E0B` |
| 💎 | Platinum | 20,000 | `#67E8F9` |
| 🏆 | Legend | 50,000 | `#7C3AED` |

### Match Status Colors

| Status | Color | Hex |
|--------|-------|-----|
| Upcoming | Blue | `#3B82F6` |
| Live | Green (pulsing) | `#22C55E` |
| Completed | Muted | `#94A3B8` |

### Confidence Slider

- 50% → Muted gray
- 75% → Blue
- 90%+ → Purple glow
- 100% → Gold glow

### Stack-Specific Notes (Next.js + Tailwind v4)

- Use Tailwind `dark:` variants where applicable (app is always dark, but consistent)
- Use `framer-motion` for all entrance animations (already installed)
- Prefer server components; hydrate with client for interactive XP counters
- Images: use `next/image` with correct `width`/`height`
- Icons: `lucide-react` (already in common use)
