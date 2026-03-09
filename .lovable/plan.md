

# QR Digital Restaurant Menu — Implementation Plan

## Overview
A QR-code-powered digital menu for a single restaurant. Customers scan a QR code and instantly see the menu. The owner logs in via a top-right icon to manage categories and items in real-time. Modern glass-style design with smooth interactions.

---

## Phase 1: Customer Menu (Public-Facing)

### Restaurant Header
- Restaurant name, logo, and tagline displayed at the top
- Clean, modern glass design (glassmorphism cards, subtle gradients, backdrop blur effects)

### Category Navigation
- Sticky horizontal tab bar at the top that scrolls with the user
- Tabs auto-highlight as the user scrolls past each category section
- Tapping a tab smoothly scrolls to that section

### Menu Item Display
- Items grouped under category headings, sorted by category `order_index`
- Each item card shows: image, name, price, and availability status
- Available items displayed normally; sold-out items greyed out with a "Sold Out" badge
- Tapping an item opens a detail drawer/modal showing a larger image, full description, and price

### Responsive Design
- Fully mobile-first layout (optimized for phone screens since customers scan QR)
- Works well on tablets and desktop too

---

## Phase 2: Owner Authentication

### Login
- Small login icon in the top-right corner of the page
- Opens a login modal with email/password fields
- Authenticated via Supabase Auth
- On successful login, the admin panel becomes accessible

### Logout
- Logout button visible when logged in, returns to customer view

---

## Phase 3: Admin Panel (Owner Dashboard)

### Category Management
- Add, edit, rename, and delete categories
- Drag or reorder categories (change `order_index`)

### Menu Item Management
- Add new items with: name, description, price, category, and image upload
- Edit existing items inline or via a form modal
- Upload item images (stored in Supabase Storage)
- Toggle item availability (available / sold out) with a simple switch
- Delete items with confirmation

### Instant Updates
- All changes save to Supabase and reflect immediately on the customer menu — no page reload or redeploy needed

---

## Phase 4: Backend (Supabase)

### Database Tables
- **categories** — id, name, order_index, created_at
- **menu_items** — id, name, description, price, available, image_url, category_id (FK), created_at, updated_at

### Authentication
- Supabase Auth for owner login (email/password)
- No separate "owners" table needed — Supabase Auth handles credentials securely

### Storage
- `menu-images` bucket for item photos
- Public read access for customers, authenticated write access for the owner

### Security
- Row Level Security: public read for categories and menu items, write restricted to authenticated owner

---

## Phase 5: QR Code & Branding

### QR Code Generation
- A page or section in the admin panel to view/download a QR code pointing to the menu URL
- Owner can print and place on tables

---

## Design Direction
- **Modern Glass** style: glassmorphism cards with backdrop blur, subtle gradients, semi-transparent surfaces
- Clean typography, smooth transitions and animations
- Warm, appetizing color palette suitable for a restaurant

