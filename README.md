# DailyDrop

Hyperlocal grocery marketplace for Kerala towns (Kothamangalam, Muvattupuzha, Thodupuzha, Paingottoor). Customers browse nearby stores, place orders, and track delivery. Merchants fulfil orders; delivery partners handle last-mile runs.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Backend | Python FastAPI (async), SQLAlchemy, Alembic |
| Database | PostgreSQL + PostGIS (Supabase) |
| Cache | Redis (store listings, products, search) |
| Auth | Supabase Auth (email magic link) |
| Chatbot v1 | Hugging Face Inference API (cloud LLM, not local transformers) |

## Roles

| Role | Dashboard | Responsibility |
|------|-----------|------------------|
| **Consumer** | Home, cart, orders | Browse stores, checkout, track orders |
| **Merchant** | `/merchant` | Accept → prepare → mark ready for pickup |
| **Delivery partner** | `/delivery` | Accept delivery → mark delivered |
| **Admin** | `/admin` | Platform stats and all orders |

## Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **Supabase** project (PostgreSQL + Auth enabled)
- Git

---

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Enable **PostGIS**: SQL Editor → `CREATE EXTENSION IF NOT EXISTS postgis;`
3. **Auth → Providers**: enable Email (magic link).
4. **Auth → URL configuration** → add redirect URLs:
   - `http://localhost:3000/**`
   - (Optional LAN) `http://YOUR_LAN_IP:3000/**`
5. Copy from **Settings → API**:
   - Project URL
   - Publishable (anon) key

### 2. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Copy env file and fill in your Supabase database + auth values:

```powershell
copy .env.example .env
```

Edit `backend/.env` — use split DB vars (recommended) or `DATABASE_URL`:

```env
user=postgres
password=your_password
host=db.your-project.supabase.co
port=5432
dbname=postgres

SUPABASE_URL=https://your-project.supabase.co
```

Run migrations and seed Kerala supermarket data:

```powershell
alembic upgrade head
python scripts/seed_kerala_region.py
```

Start the API:

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Verify: [http://127.0.0.1:8000/api/v1/stores](http://127.0.0.1:8000/api/v1/stores)  
Health (Redis): [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

### 3. Frontend

```powershell
cd frontend
npm install
copy .env.example .env.local
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Start the app:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Test accounts & role promotion

Sign in once with email (magic link) so the app creates a user row via `POST /api/v1/users/me`. Then promote roles from the backend folder:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1

# Link a user to the default seed store (Store 1, Kothamangalam)
python scripts/promote_merchant.py you@example.com

# Or pick a store explicitly
python scripts/promote_merchant.py --list-stores
python scripts/promote_merchant.py you@example.com --store-id 41000000-0000-4000-8000-000000000001

python scripts/promote_delivery_partner.py partner@example.com
python scripts/promote_admin.py admin@example.com

# Revert merchant / delivery partner back to consumer
python scripts/promote_merchant.py you@example.com --consumer
python scripts/promote_delivery_partner.py partner@example.com --consumer
```

**Tip:** use three email aliases (e.g. `you+consumer@gmail.com`, `you+merchant@gmail.com`, `you+delivery@gmail.com`) so you can switch roles in different browser profiles.

---

## Order lifecycle

```
pending
  → accepted          (merchant)
  → preparing         (merchant)
  → ready_for_pickup  (merchant)
  → picked_up         (delivery partner — on "Accept delivery")
  → delivered         (delivery partner)
```

Customer-facing labels: *Order placed → Store accepted → Preparing → Ready for pickup → Out for delivery → Delivered*.

---

## Demo walkthrough (~5 minutes)

Run backend and frontend before the demo. Have three browser windows ready (or three profiles): **Consumer**, **Merchant**, **Delivery partner**.

### Part 1 — Consumer places an order (~2 min)

1. Open **http://localhost:3000** as consumer (signed in).
2. Set delivery location (header) — pick **Kothamangalam** or allow GPS.
3. Scroll to **Stores near you** → open a store → add products to cart.
4. Go to **Cart** → **Checkout** → confirm address → pay with **Cash on delivery** (or mock card/UPI).
5. Note the order number (e.g. `DD-XXXXXXXX`) on the confirmation page.

PostGIS ranks stores by straight-line distance from the user's coordinates.

### Part 2 — Merchant fulfils (~1 min)

1. In the merchant window, go to **Account → Merchant dashboard** (`/merchant`).
2. Find the new order → **Accept order** → **Start preparing** → **Mark ready for pickup**.

The merchant stops at handoff. Marking the order delivered is the delivery partner's job.

### Part 3 — Delivery partner (~1 min)

1. In the delivery window, go to **Account → Delivery dashboard** (`/delivery`).
2. Under **Available**, click **Accept delivery** on the order.
3. Click **Mark delivered** (for COD, mention collecting payment on delivery).

Accepting the run also moves the order to "Out for delivery" for the customer.

### Part 4 — Consumer tracking (~30 sec)

1. Back in the consumer window, open **Orders** or the order detail page.
2. Show the status timeline updated through to **Delivered**.

### Optional extras (if asked)

- **Admin** (`/admin`): total orders, active orders, revenue-style stats.
- **Category-first browse**: home category grid → `/shop/[category]` → pick a store.
- **Global product search**: header search on home → `/search?q=…` with infinite scroll, grouped by store
- **Store search**: header search on a store page filters that store’s products

---

## Project structure

```
dailydrop/
├── backend/
│   ├── main.py              # FastAPI app entry
│   ├── routers/             # API routes (orders, merchant, delivery, admin)
│   ├── models/              # SQLAlchemy models + enums
│   ├── alembic/             # DB migrations
│   ├── chat/                # Drop memory, tools, Hugging Face service
│   ├── catalog/             # Store/product SQL + product CRUD
│   └── scripts/             # Seed, promote, one-off DB helpers
└── frontend/
    ├── app/                 # Next.js pages (App Router)
    ├── components/          # UI components
    ├── context/             # Auth, cart, location providers
    └── lib/                 # API client, order helpers, types
```

---

## LAN / phone testing (optional)

To demo on a phone on the same Wi‑Fi:

1. Add your PC's LAN IP to `frontend/next.config.ts` `allowedDevOrigins` and backend CORS in `main.py`.
2. Set `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://192.168.x.x:8000
   ```
3. Add `http://192.168.x.x:3000/**` to Supabase redirect URLs.
4. Start with host binding:
   ```powershell
   # Backend
   uvicorn main:app --reload --host 0.0.0.0 --port 8000

   # Frontend
   npm run dev -- -H 0.0.0.0 -p 3000
   ```

For production-style LAN builds, use `frontend/.env.production.local` and `npm run build` + `npm run start -- -H 0.0.0.0 -p 3000`.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Could not load stores" | Backend not running, or wrong `NEXT_PUBLIC_API_URL` |
| Magic link goes to wrong IP | Update Supabase redirect URLs; rebuild if using production mode |
| `No user found` when promoting | Sign in to the app once first |
| Empty store list after setup | Run `python scripts/seed_kerala_region.py` |
| Alembic enum error | Run `alembic upgrade head` from `backend/` |
| Stores far away | Set town/GPS in header to Kothamangalam area |
| Chat: `HF_TOKEN is missing` | Add `HF_TOKEN=hf_...` to `backend/.env`, then `docker compose restart backend` |
| Chat: `model_not_supported` | That model isn't served for your token. List yours with `curl -H "Authorization: Bearer $HF_TOKEN" https://router.huggingface.co/v1/models`, then set `HF_MODEL` in `backend/.env` |
| Chat: `No module named 'huggingface_hub'` | Rebuild the image: `docker compose up --build` |

---

## Tests

```powershell
# Frontend
cd frontend
npm test

# Backend
cd backend
pip install -r requirements-dev.txt
pytest
```

---

## API docs

With the backend running:

- Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## License

Demo project. Payments are mocked and are not processed.
