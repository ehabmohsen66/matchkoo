# Page Override: Dashboard (Main App SPA)

> Rules here **override** MASTER.md for the `/app` static SPA dashboard.

---

## Layout Pattern

**Type:** Dashboard Hub  
**Files:** `public/app.html` + `public/js/app.js`  
**Navigation:** Mobile bottom tab bar / Sidebar on desktop

### Section Order
1. **Top Bar** — Logo + user avatar + XP badge
2. **Today's Matches** — Live matches (pulsing green dot) + upcoming cards
3. **My Predictions** — Scrollable card list with status indicators
4. **Leaderboard Strip** — Compact rank + XP + movement
5. **Weekly Challenges** — Progress bars toward challenge goals
6. **Daily Spin** — Wheel CTA with cooldown timer

---

## Page-Specific Colors

| Element | Color | Notes |
|---------|-------|-------|
| Live match indicator | `#22C55E` + pulse animation | CSS keyframe pulse |
| Match predicted badge | `rgba(34,197,94,0.2)` border | Subtle green glow |
| Locked/Completed match | `#64748B` | Dimmed, no hover effect |
| Challenge progress bar | Gradient `#7C3AED → #22C55E` | Smooth fill animation |
| Daily spin button | Gold `#F59E0B` gradient | Eye-catching CTA |

---

## Key Interactions

- **Prediction tap** → Opens bottom sheet modal with score inputs
- **Match card hover** → `border-color: rgba(124,58,237,0.5)` + `translateY(-2px)`
- **XP earn animation** → Number counter + gold flash effect
- **Tab switch** → Instant (< 100ms), no fade — feels native

---

## Typography Overrides

- Match team names: `font-size: 15px`, `font-weight: 600`, `color: #F1F5F9`
- Score display: `font-size: 28px`, Russo One, `color: #F1F5F9`
- XP numbers: `font-size: 13px`, Chakra Petch 700, `color: #F59E0B`
- Live tag: `font-size: 11px`, Chakra Petch 600, uppercase, `color: #22C55E`
