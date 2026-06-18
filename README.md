# Wedding Carnival™ 🎪

> Interactive wedding entertainment platform — turn wedding guests into players, competitors, and memory-makers.

Wedding Carnival™ is a mobile-first, browser-based experience that guests access by scanning a QR code. No app download required. Each wedding gets a personalized, fully branded version running on the same core platform — guests play games, earn points, climb a live leaderboard, win prizes, and leave messages for the couple.

This repository currently contains the **demo/landing site** — a lively, animated preview of the experience.

---

## ✨ Features (Demo)

- **Animated hero** with rotating headline, floating phone mockup, and count-up stats
- **Interactive live demos** you can actually play:
  - 🗳️ **Bride vs Groom** — live voting with animated result bars
  - 🎰 **Spin the Wheel** — real spin animation landing on a prize
  - 🏆 **Live Leaderboard** — scores tick up and rows re-sort in real time
  - 🪙 **Scratch & Win** — canvas scratch-off card with confetti reveal
- **Game showcase** — all 12 carnival games
- **Guest Wall**, **3-tier packages**, and an animated call-to-action band
- Fully **responsive** and respects `prefers-reduced-motion`

---

## 🎨 Brand & Theme

Palette pulled directly from the logo (Pac-Man / arcade "WC" mark):

| Color | Hex | Use |
|-------|-----|-----|
| Hot Pink | `#FB4FA8` | Primary |
| Deep Magenta | `#D62E7E` | Accents / text |
| Lemon | `#F4D71E` | Highlights |
| Lilac | `#D98FDD` | Secondary |
| Grape | `#8B3FB0` | Gradients |

Typography mixes an elegant serif (**Playfair Display**) for the "Wedding" feel with a rounded, playful font (**Fredoka**) for the "Carnival" energy.

---

## 📁 Project Structure

```
wedding-carnival/
├── index.html      # Page structure & content
├── styles.css      # Styling + animations
├── script.js       # Interactive demos (vote, wheel, leaderboard, scratch)
├── logo.jpeg       # Brand logo
└── README.md
```

---

## 🚀 Running Locally

This is a static site — no build step required.

**Option 1 — open directly**

Just open `index.html` in your browser.

**Option 2 — local server** (recommended, so the scratch canvas behaves identically to production)

```bash
# Python
python -m http.server 8000

# or Node
npx serve
```

Then visit `http://localhost:8000`.

---

## 🛠️ Planned Tech Stack (Full Product)

| Layer | Choice |
|-------|--------|
| Frontend | Next.js (React) + TypeScript, PWA |
| Hosting | Cloudflare Pages |
| Backend / DB | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Leaderboard cache | Upstash Redis (sorted sets) |
| Real-time | Supabase Realtime (broadcast + Postgres changes) |

Multi-tenant: one platform serves many weddings, isolated per `wedding_id` with branding/content driven by config.

---

## 📄 License

© 2026 Wedding Carnival™. All rights reserved.
