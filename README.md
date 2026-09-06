# Rifas

Raffle management system for the organizer: set the ticket price and the prize
list, track which numbers each customer reserved, and control who has paid.

The platform is an internal tool for the organizer. Buyers never sign in or
reserve tickets themselves.

## Structure

```
rifas/
├─ docker/             local infrastructure configuration
├─ docker-compose.yml
├─ backend/            @rifas/api  — REST API, domain, business rules and persistence
└─ frontend/           @rifas/web  — mobile-first admin panel (React + Vite)
```

The schema and migrations live in `backend/src/infrastructure/database`, next to
the code that owns them, so the API and its database ship as a single unit.

The backend follows a hexagonal layering: `domain` holds entities, value objects
and ports and depends on nothing; `application` holds one class per use case;
`infrastructure` implements the ports with Drizzle, argon2 and the system clock;
`presentation` exposes them over HTTP. `presentation/modules/core.module.ts` is
the single composition root that decides which implementation backs each port.

## Getting started

Requires Node 22+ and Docker.

```bash
cp .env.example .env                  # docker compose variables
cp backend/.env.example backend/.env  # API configuration
cp frontend/.env.example frontend/.env
npm install
npm run db:up        # start PostgreSQL and Adminer
npm run db:migrate   # apply migrations
npm run dev          # API on http://localhost:3000/api
npm run dev:web      # panel on http://localhost:5173
```

Each package owns its `.env`; the root one only feeds docker compose.
PostgreSQL is published on port **5434** to avoid clashing with a host
PostgreSQL install, Adminer is available at <http://localhost:8080> and the API
documents itself at <http://localhost:3000/api/docs>.

The panel is a PWA: `npm run build --workspace @rifas/web` emits a service
worker that precaches the app shell so it opens without a connection. API
requests are deliberately never cached — a board served from a stale cache
would show numbers as free that somebody had already taken, which is the one
mistake this system exists to prevent. The icons are drawn by
`frontend/scripts/generate-icons.mjs`, so no image toolchain is needed to
regenerate them.

## Tests

```bash
npm test                                  # domain and use cases, no database needed
npm run test:int --workspace @rifas/api   # requires the container to be running
```

The integration suite exists for one reason: the `(raffle_id, number)` unique
constraint is what makes double reservation impossible, and only a real
PostgreSQL can prove that two concurrent reservations of the same number leave
exactly one ticket behind.

## Conventions

- Atomic commits following [Conventional Commits](https://www.conventionalcommits.org/):
  `type(scope): description`, where the scope is the package (`backend`,
  `frontend`, `repo`).
- The backend domain and use cases depend on no framework: persistence is
  reached through ports, so replacing the Docker PostgreSQL with a managed one
  (Supabase, Neon) leaves the business logic untouched.
- Everything in the repository is written in English. Spanish is reserved for
  user-facing copy in the frontend.
