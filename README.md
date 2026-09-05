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

## Getting started

Requires Node 22+ and Docker.

```bash
cp .env.example .env                  # docker compose variables
cp backend/.env.example backend/.env  # API configuration
npm install
npm run db:up        # start PostgreSQL and Adminer
npm run db:migrate   # apply migrations
```

Each package owns its `.env`; the root one only feeds docker compose.
PostgreSQL is published on port **5434** to avoid clashing with a host
PostgreSQL install, and Adminer is available at <http://localhost:8080>.

## Conventions

- Atomic commits following [Conventional Commits](https://www.conventionalcommits.org/):
  `type(scope): description`, where the scope is the package (`backend`,
  `frontend`, `repo`).
- The backend domain and use cases depend on no framework: persistence is
  reached through ports, so replacing the Docker PostgreSQL with a managed one
  (Supabase, Neon) leaves the business logic untouched.
- Everything in the repository is written in English. Spanish is reserved for
  user-facing copy in the frontend.
