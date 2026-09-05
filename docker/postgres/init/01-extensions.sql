-- Extensions available both in stock PostgreSQL and in managed providers
-- (Supabase, Neon), so local and hosted databases behave identically.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Trigram similarity search, used by the customer lookup.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
