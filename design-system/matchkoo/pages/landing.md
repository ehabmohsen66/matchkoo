# Page Override: Landing Page

> Rules here **override** MASTER.md for the root landing page (`src/app/page.tsx`).

---

## Layout Pattern

**Type:** Hero-Centric + Social Proof  
**File:** `src/app/page.tsx`, `src/app/landing.css`  
**Stack:** Next.js Server Component + Tailwind CSS v4

### Section Order
1. **Floating Navbar** — Logo + CTA buttons (Login / Sign Up)
2. **Hero** — Bold headline + animated football visual + primary CTA
3. **How It Works** — 3-step visual flow (Predict → Earn XP → Climb)
4. **Features Grid** — Key features in bento-style cards
5. **Leagues** — Supported leagues (EPL, La Liga, UCL, etc.)
6. **Leaderboard Teaser** — Top 3 users with XP display
7. **CTA Section** — Final conversion push
8. **Footer** — Links + social

---

## Page-Specific Colors

| Element | Color | Notes |
|---------|-------|-------|
| Hero background | `#0A0A0F` | Full dark |
| Hero headline | `#F1F5F9` | With purple gradient on keyword |
| CTA button | `#22C55E` gradient | High visibility green |
| Navbar background | `rgba(10,10,15,0.8)` + blur | Glassmorphism |
| Feature cards | `#111128` border `#2D2D4E` | Standard surface |
| League logos | Full color, white bg pill | `border-radius: 12px` |

---

## Typography Overrides

- Hero H1: `font-size: clamp(40px, 6vw, 72px)`, Russo One, line-height: 1.1
- Hero subtitle: `font-size: 18px`, Chakra Petch 400, `color: #94A3B8`
- Section headings: `font-size: 32px`, Russo One
- Feature card titles: `font-size: 18px`, Chakra Petch 600

---

## Navbar Specifics (Floating Style)

```css
.navbar {
  position: fixed;
  top: 16px;
  left: 16px;
  right: 16px;
  border-radius: 14px;
  background: rgba(17, 17, 40, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(45,45,78,0.8);
  z-index: 100;
}
```

## Animation Notes

- Hero entrance: Framer Motion `fadeInUp` with 200ms stagger
- Stats counters: Count-up animation on scroll into view
- League logos: Horizontal scroll marquee (infinite)
