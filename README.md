# Wouter's Bachelor Planner 🐴

Realtime gedeelde planner voor het vrijgezellenfeest op Texel (13–14 juni 2026).

- React + Vite frontend
- Supabase backend (Postgres + Realtime + Storage)
- Deployment op Vercel
- Iedereen met de link kan editen — wijzigingen zijn meteen live bij alle anderen

---

## Quick start

### 1. Supabase project aanmaken
1. Ga naar [supabase.com](https://supabase.com) → New project
2. Naam: `wouter-bachelor` · Region: `Frankfurt` of `London`
3. Wacht tot de DB klaar is (~1 min)

### 2. Database schema laden
1. Open de Supabase dashboard → **SQL Editor** → **New query**
2. Plak de inhoud van `supabase/schema.sql` → **Run**
3. Maak een tweede query → plak `supabase/seed.sql` → **Run**

Klaar. Dit maakt:
- `slots` tabel (planning items)
- `gear` tabel (mee te nemen)
- `party-photos` storage bucket (foto's)
- Realtime enabled op beide tabellen
- Open RLS policies (één party, link = sleutel)

### 3. API credentials kopiëren
Supabase dashboard → **Project Settings → API**:
- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` key → `VITE_SUPABASE_ANON_KEY`

### 4. Lokaal draaien (optioneel)
```bash
cp .env.example .env
# vul VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY in
npm install
npm run dev
```
→ open http://localhost:5173

### 5. Deploy naar Vercel
**Optie A — via GitHub:**
1. Push repo naar GitHub
2. Ga naar [vercel.com](https://vercel.com) → New Project → import repo
3. Bij **Environment Variables** voeg toe:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

**Optie B — via Vercel CLI:**
```bash
npm i -g vercel
vercel
# zet de env vars in: vercel env add VITE_SUPABASE_URL etc.
vercel --prod
```

Je krijgt een URL terug zoals `wouter-bachelor.vercel.app` — die deel je in de groep.

---

## Hoe werkt het

- Eén gedeelde party (`party_id = 'wouter-2026-texel'`)
- Geen login, geen accounts — link delen = toegang
- Bij eerste bezoek kies je je naam (Yahya/Jef/Roy/Max) — wordt lokaal opgeslagen
- Alle wijzigingen syncen direct via Supabase Realtime (`postgres_changes`)
- Foto's via Supabase Storage (public bucket, gratis tot 1GB)

## Features

- ✅ 3 dagen (12 jun prep / 13 jun ontvoering / 14 jun activiteiten)
- ✅ Afvinken, notities toevoegen, items bewerken/verwijderen
- ✅ Foto upload per item (camera op mobiel werkt direct)
- ✅ Gear-lijst met wie wat regelt
- ✅ Live sync indicator
- ✅ Dark mode, mobile-first

## Aanpassen

- **Andere party / opnieuw beginnen:** wijzig `PARTY_ID` in `src/lib/supabase.js` en run `seed.sql` met die nieuwe ID
- **Meer crew leden:** pas `CREW` aan in `src/lib/seed.js`
- **Andere dagen:** pas `DAYS` array aan in `src/lib/seed.js` + update seed.sql

## Kosten

Gratis tot deze party voorbij is — Supabase free tier is ruim genoeg (500MB DB, 1GB storage, 200 concurrent realtime connections).
