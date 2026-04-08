-- Aggiunge flag per abilitare/disabilitare il servizio bar per ogni stabilimento
ALTER TABLE establishments
  ADD COLUMN IF NOT EXISTS bar_enabled BOOLEAN NOT NULL DEFAULT TRUE;
