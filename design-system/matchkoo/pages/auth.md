# Page Override: Auth Pages

> Rules here **override** MASTER.md for Login, Register, Forgot Password, Reset Password, Verify Email pages.

---

## Layout Pattern

**Type:** Centered Card on Dark Background  
**Files:** `src/app/login/`, `src/app/register/`, etc.  
**Stack:** Next.js page + Tailwind CSS

### Layout
```
[Full-screen dark bg with subtle grid/pattern]
        [Centered auth card — max-width: 440px]
            [Logo]
            [Heading]
            [Form]
            [CTA Button]
            [Footer links]
```

---

## Page-Specific Colors

| Element | Color | Notes |
|---------|-------|-------|
| Page background | `#0A0A0F` | Full dark |
| Subtle bg pattern | `rgba(124,58,237,0.03)` grid | Low-opacity dot/grid |
| Auth card | `#111128` | `border: 1px solid #2D2D4E` |
| Card border | `#2D2D4E` | |
| Submit button | Purple gradient `#7C3AED → #6D28D9` | Not green (no success connotation yet) |
| Error text | `#EF4444` | |
| Success message | `#22C55E` | Email verified, etc. |
| Link color | `#A78BFA` | Hover: `#7C3AED` |

---

## Typography Overrides

- Page title (H1): Russo One, `28px`, centered
- Form labels: Chakra Petch 500, `13px`, `color: #94A3B8`, uppercase tracking
- Input text: Chakra Petch 400, `15px`, `color: #F1F5F9`
- Error messages: Chakra Petch 400, `13px`, `color: #EF4444`
- Helper links: Chakra Petch 400, `13px`, `color: #A78BFA`

---

## Card Animation

- On mount: `opacity: 0 → 1`, `translateY(20px → 0)`, duration `300ms`
- Input focus: border-color transition + ring glow (`rgba(124,58,237,0.15)`)

---

## Register-Specific

- League preference selector: Multi-select pill buttons
  - Unselected: `border: 1px solid #2D2D4E`, `bg: #1A1A35`
  - Selected: `border: 1px solid #7C3AED`, `bg: rgba(124,58,237,0.15)`, text: `#A78BFA`
- Progress indicator for multi-step form if applicable
