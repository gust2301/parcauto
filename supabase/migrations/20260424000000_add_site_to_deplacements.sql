ALTER TABLE public.deplacements
  ADD COLUMN IF NOT EXISTS site text;
