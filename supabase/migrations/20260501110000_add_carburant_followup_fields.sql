ALTER TABLE public.carburant
  ADD COLUMN IF NOT EXISTS agent_nom text,
  ADD COLUMN IF NOT EXISTS objet_mission text,
  ADD COLUMN IF NOT EXISTS observation text;
