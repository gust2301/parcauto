ALTER TABLE public.carburant
  ADD COLUMN IF NOT EXISTS chauffeur_id uuid REFERENCES public.chauffeurs(id) ON DELETE SET NULL;
