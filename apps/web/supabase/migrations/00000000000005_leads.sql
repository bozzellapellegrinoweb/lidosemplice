-- =====================
-- LEADS — Stabilimenti balneari da Google Maps
-- =====================

CREATE TABLE IF NOT EXISTS leads (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  scraped_at   timestamptz NOT NULL DEFAULT now(),
  nome         text,
  indirizzo    text,
  citta        text,
  cap          text,
  telefono     text,
  email        text,
  sito_web     text,
  rating       numeric,
  recensioni   integer,
  categoria    text,
  google_maps_url text
);

-- Indice per la ricerca testuale
CREATE INDEX IF NOT EXISTS leads_nome_idx     ON leads (nome);
CREATE INDEX IF NOT EXISTS leads_citta_idx    ON leads (citta);
CREATE INDEX IF NOT EXISTS leads_scraped_idx  ON leads (scraped_at DESC);

-- Solo i super admin possono leggere/scrivere leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_leads" ON leads
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
        AND u.email = ANY(string_to_array(current_setting('app.super_admin_emails', true), ','))
    )
  );
