# Pantry & Recipe Management System

A culinary management application built with **React**, **Vite**, **Tailwind CSS**, and an authenticated **Node.js + Express + tRPC** backend supporting Oracle and relational database architectures.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                  │
│  - Generous whitespace, calm color palette (Emerald/Amber)  │
│  - 3-second comprehension rule for busy/tired cooks         │
│  - Mobile-first responsive layout (Navbar & Bottom Tab Bar) │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / tRPC Batch HTTP
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND (Node.js + Express + tRPC)             │
│  - Pantry CRUD & Expiry processing                          │
│  - Stored SQL matching first (Database primary path)        │
│  - Web recipe retrieval + AI fallback (DuckDuckGo + LLM)    │
│  - Proportional quantity adaptation & safety validation     │
│  - Atomic stock deduction & cooking transactions            │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL / Drizzle ORM
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                              │
│  - 11 normalized relational entities:                       │
│    users, categories, ingredients, pantry_items, suppliers, │
│    purchase_log, recipes, recipe_ingredients, cooking_log,  │
│    dietary_tags, waste_log                                  │
│  - Oracle deployment scripts: database/oracle/*.sql         │
└─────────────────────────────────────────────────────────────┘
```

---

## Features & Screens

1. **Login / Register**:
   - Minimal authentication form.
   - Cooking-level selector with interactive icon chips: 🍳 Beginner, 🔪 Intermediate, 👨‍🍳 Advanced.
   - 1-click test profiles for instant review.

2. **Pantry Dashboard**:
   - Live inventory summary cards: Total items, Fresh items (green), Expiring soon (amber, 1–3 days), Expired (red).
   - Card grid with ingredient quantities and units (kg, g, piece, ml).
   - Quick quantity stepper (`+` / `-`) and 1-click waste logging.
   - Category filtering & instant search.
   - Always-visible "Add Pantry Item" modal with auto-calculated shelf life.

3. **"What Can I Cook?" Screen**:
   - Prominent, glowing hero action CTA: *"Find What I Can Cook"*.
   - Collapsible filters for max cook time (≤15m, ≤25m, ≤35m) and dietary preferences (Vegetarian, High Protein, Gluten Free).
   - **Recommendation Source Distinction**:
     - 🛡️ **Verified Pantry Match (Database)**: Confident emerald badge for recipes matched via SQL against current pantry stock.
     - ✨ **AI Suggested Fallback**: Subtle indigo badge highlighting real web source attribution and proportional inventory scaling notes.
   - **Availability Indicators**:
     - 100% → *"Ready to Cook"*
     - 75–99% → *"Almost There"*, explicitly naming missing ingredients.

4. **Recipe Detail**:
   - Complete ingredient availability checklist (comparing required vs current in-stock quantities).
   - Numbered step-by-step instructions with interactive completion checkboxes.
   - Single prominent *"Cook This Recipe"* action.

5. **Cooking Confirmation**:
   - Post-cook celebration state.
   - Itemized breakdown of stock automatically deducted from the pantry.
   - Real-time inventory synchronization.

6. **Waste & Reports Dashboard**:
   - Key metrics: Total Waste Logged, Estimated Value Lost ($), and Rescue Efficiency Score (88%).
   - 3 clean, accessible SVG charts:
     1. Waste Over Time (monthly trend)
     2. Most-Wasted Ingredients (ranked comparison)
     3. Waste by Food Category (proportional loss)
   - Actionable waste prevention recommendations.

---

## Running the Application

This directory is the **only deployable application**. It contains the React client, Express/tRPC server, database schema, migrations, and recipe pipeline.

```bash
npm install
npm run dev
```

For production:

```bash
npm run check
npm run build
npm start
```

The Express server serves the integrated frontend and `/api/trpc` from the same origin. Use `GET /healthz` for a deployment health check. Configure the variables in `.env.example` before public hosting.
