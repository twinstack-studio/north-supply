-- Creates the role and database the app connects as.
-- Run once:  sudo -u postgres psql -f scripts/setup-db.sql
-- Safe to re-run; it skips anything that already exists.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'northsupply') THEN
    CREATE ROLE northsupply WITH LOGIN PASSWORD 'northsupply' CREATEDB;
  END IF;
END
$$;

SELECT 'CREATE DATABASE northsupply OWNER northsupply'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'northsupply')
\gexec

GRANT ALL PRIVILEGES ON DATABASE northsupply TO northsupply;
