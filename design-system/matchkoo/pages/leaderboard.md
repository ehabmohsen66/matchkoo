# Page Override: Leaderboard

> Rules here **override** MASTER.md for the leaderboard page inside the SPA (`#page-leaderboard`, `#page-league-detail`).

---

## Layout Pattern

**Type:** Rankings + Data Dense  
**Elements:** Podium (top 3) + rank rows + period filter tabs + mini-league switcher

---

## Page-Specific Colors

| Element | Color | Notes |
|---------|-------|-------|
| 1st place | `#F59E0B` gold | Glow effect `--shadow-gold` |
| 2nd place | `#94A3B8` silver | |
| 3rd place | `#CD7F32` bronze | |
| Rank row (current user) | `rgba(124,58,237,0.15)` | Purple highlight + left border |
| XP gain today | `#22C55E` | Arrow up icon + number |
| XP loss today | `#EF4444` | Arrow down icon + number |
| XP unchanged | `#64748B` | Dash icon |
| Period tab active | `#7C3AED` background | Pill style |

---

## Podium Specs

- 1st: Largest card, `border: 2px solid #F59E0B`, gold name color
- 2nd & 3rd: Smaller, slightly lower vertical position
- Avatar: Circular, `border: 2px solid` respective badge color

---

## Rank Row

```
[Rank#]  [Avatar] [Name]   [Level Badge]   [XP]   [+Today]
```
- Height: `52px`
- Hover: `background: rgba(124,58,237,0.05)`
- Current user row: `border-left: 3px solid #7C3AED`
