# ✦ Waku

**Waku** (from *waku waku* — the fluttery thrill of anticipation) is a cinematic
anime, manga & light-novel tracker with a signature **iOS-style Liquid Glass**
interface, a novel **Smart Rating** engine, personal **rankings**, and rich
**AniList** data.

> Deep-navy, glass everywhere, built to feel as joyful as the medium it tracks.

---

## ✨ Highlights

| Area | What you get |
| --- | --- |
| **Liquid Glass UI** | Translucent, refractive panels with specular edges, sheen streaks, hover lift & micro-animations — everywhere (nav, cards, modals, badges). |
| **Homepage** | Auto-rotating cinematic hero + rails for Trending / This Season / Popular / Top-rated across Anime, Manga & Light Novels. |
| **Discover** | Live search + **3-state filters** (click = include → exclude → clear) for genres, formats, year, season; smart sorting; infinite load. |
| **Media details** | Banner, cover, community score dial, synopsis, characters + VAs, relations, recommendations, live **next-episode countdown**. |
| **Library** | Grid & **Kanban** views across Watching / Rewatching / Completed / On-Hold / Planning / Dropped, with inline progress + rewatch tracking. |
| **Rating** | 0.0–10.0 tiered colour system (Terrible → **Peak**), animated **gold glow at 10/10**, rate-on-complete prompts. |
| **Smart Rating** | After 10 manual anchors, rate via **pairwise comparisons**. An Elo model + least-squares fit to your anchors computes each title's perfect score. |
| **Rankings** | Podium + leaderboard, All / Anime / Manga / LN, Top 10–100. |
| **Profile** | Letterboxd-style stats, **Otaku Levels**, ratings-distribution chart, Top-4 favourites, recently rated. |
| **Calendar** | 7-day airing schedule pulled from AniList. |

---

## 🧱 Tech stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** with a custom Liquid-Glass design system (`app/globals.css`)
- **graphql-request** against the public **AniList GraphQL** API
- **@tanstack/react-query** for client fetching/caching (Discover)
- **Zustand** (+ `persist`) for library, ratings, comparisons & profile
- **Framer Motion** animations · **lucide-react** icons

> **Data layer:** the MVP is fully functional on **localStorage** (no backend
> needed). Supabase env vars are scaffolded in `.env.local.example` for optional
> cloud sync — see *Roadmap*.

---

## 🚀 Getting started

```bash
# 1. install
npm install

# 2. (optional) configure env
cp .env.local.example .env.local   # AniList needs no key; Supabase is optional

# 3. run
npm run dev
# → http://localhost:3000
```

Build for production:

```bash
npm run build && npm run start
```

---

## 🗂 Project structure

```
app/
  layout.tsx            # root shell: fonts, providers, navbar, footer
  page.tsx              # homepage (hero + rails, server-rendered)
  discover/             # search + 3-state filters (client)
  library/              # tabs + kanban (client, store-backed)
  rankings/             # podium + leaderboard
  profile/              # stats, otaku levels, distribution
  calendar/             # 7-day airing schedule
  rate/                 # Smart Rating comparison flow
  media/[id]/           # media details
components/
  glass/                # GlassCard base surface
  layout/               # Navbar, Logo/WakuMark
  media/                # MediaCard, MediaRow, ScoreBadge, RatingDialog, MediaActions…
  home/                 # HeroCarousel
  discover/ rate/ library/
lib/
  anilist/              # GraphQL client, queries, types
  rating.ts             # tier definitions & colours
  smart-rating.ts       # Elo + anchor-fit engine
  store.ts              # Zustand persisted store
```

---

## 🎨 The Liquid Glass system

Core primitives live in `app/globals.css`:

- `.glass` — layered translucency + `backdrop-filter: blur/saturate`, specular
  top edge, inner shadow.
- `.glass-sheen` — diagonal refractive highlight streak (screen blend).
- `.glass-interactive` — hover lift + sharpening specular ring.
- `.glass-chrome` — denser variant for the floating navbar.

Palette: deep charcoal/navy bases (`abyss.*`) with a cohesive blue accent family
(`waku.*`). Rating tiers are defined once in `lib/rating.ts` and mirrored as CSS
vars. Contrast is tuned for **WCAG AA**.

---

## 🧠 How Smart Rating works

1. You manually rate ~10 titles → these become **anchors**.
2. Smart Rating unlocks: you answer *"which did you enjoy more?"* head-to-heads.
   Pairs are chosen to be maximally informative (close Elo, few prior meetings).
3. An **Elo** model ranks the whole library; a **least-squares fit** maps Elo
   onto the 0–10 scale, pinned exactly to your manual anchors — so a new title's
   score is inferred from where it lands among titles you already judged.

All comparison data persists locally to keep refining scores over time.

---

## ☁️ Enable cloud sync (Supabase)

Waku runs fully on localStorage, but you can turn on cross-device sync:

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql) (creates a
   `user_data` table with row-level security).
3. **Project Settings → API** → copy the Project URL + anon public key into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. Restart `npm run dev`. A sign-in card appears on the Profile page; once signed in,
   your library, ratings, comparisons and profile sync automatically (debounced), and
   merge across devices on login.

Without these keys the app still works — the Profile card simply shows "Cloud sync off".

## 🛣 Roadmap

- [x] Supabase auth + cloud sync
- [ ] Drag-and-drop manual reordering on Rankings
- [ ] Rank-history charts (peak / lowest over time)
- [ ] Reviews & activity feed
- [ ] Theme-colour switcher in Settings (architecture already tokenised)

---

*Media data & images courtesy of [AniList](https://anilist.co). Waku is a
fan project and is not affiliated with AniList.*
