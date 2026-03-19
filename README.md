# 🍽️ MenuSnap (v1.0.0)
**Smart QR Menu & Analytics for Restaurants**

A high-performance, mobile-first digital menu solution built for speed and real-time management. 

## 🚀 Core Features
* **Dynamic Customer Menu:** QR-accessible, category-based navigation with real-time cart logic.
* **Stealth Admin Portal:** Hidden authentication entry (triple-tap logo) via Supabase Auth.
* **Live Management:** Instant CRUD for menu items, categories, and "Sold Out" status.
* **Analytics Dashboard:** 7-day scan tracking and system resource monitoring.

## 🛠️ Technical Stack
* **Frontend:** Vite + React 18 (TypeScript)
* **Styling:** Tailwind CSS + Radix UI + Framer Motion
* **Backend:** Supabase (PostgreSQL, Auth, Edge Functions)
* **State Management:** TanStack Query v5
* **Deployment:** Netlify

## ⚙️ Quick Start
1. **Install:** `npm install`
2. **Configure:** Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your `.env` or Netlify Environment Variables.
3. **Run:** `npm run dev`

---
*Developed as a lean MVP for rapid restaurant digitisation.*
