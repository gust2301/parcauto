CREATE TABLE IF NOT EXISTS public.carburant_cartes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  libelle TEXT,
  seuil_alerte NUMERIC(12,2) DEFAULT 0,
  actif BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.carburant_carte_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carte_id UUID NOT NULL REFERENCES public.carburant_cartes(id) ON DELETE CASCADE,
  vehicule_id UUID REFERENCES public.vehicules(id) ON DELETE SET NULL,
  carburant_id UUID REFERENCES public.carburant(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('approvisionnement','consommation')),
  montant NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.carburant
  ADD COLUMN IF NOT EXISTS carte_carburant_id UUID REFERENCES public.carburant_cartes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_carburant_carte_transactions_carte_id
  ON public.carburant_carte_transactions(carte_id);
CREATE INDEX IF NOT EXISTS idx_carburant_carte_transactions_vehicule_id
  ON public.carburant_carte_transactions(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_carburant_carte_transactions_carburant_id
  ON public.carburant_carte_transactions(carburant_id);
CREATE INDEX IF NOT EXISTS idx_carburant_carte_transactions_date
  ON public.carburant_carte_transactions(date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.carburant_cartes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carburant_carte_transactions TO authenticated;

ALTER TABLE public.carburant_cartes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carburant_carte_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role read carburant cartes" ON public.carburant_cartes;
CREATE POLICY "role read carburant cartes" ON public.carburant_cartes
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin manage carburant cartes" ON public.carburant_cartes;
CREATE POLICY "admin manage carburant cartes" ON public.carburant_cartes
  FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "role read carburant carte tx" ON public.carburant_carte_transactions;
CREATE POLICY "role read carburant carte tx" ON public.carburant_carte_transactions
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin manage carburant carte tx" ON public.carburant_carte_transactions;
CREATE POLICY "admin manage carburant carte tx" ON public.carburant_carte_transactions
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (
    public.current_user_is_admin()
    AND (
      (type = 'approvisionnement' AND vehicule_id IS NULL AND carte_id IS NOT NULL)
      OR (type = 'consommation' AND vehicule_id IS NOT NULL AND carburant_id IS NOT NULL AND carte_id IS NOT NULL)
    )
  );

DROP POLICY IF EXISTS "chauffeur insert carburant carte tx" ON public.carburant_carte_transactions;
CREATE POLICY "chauffeur insert carburant carte tx" ON public.carburant_carte_transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() = 'chauffeur'
    AND type = 'consommation'
    AND vehicule_id IS NOT NULL
    AND carburant_id IS NOT NULL
    AND carte_id IS NOT NULL
    AND public.current_user_can_access_vehicle(vehicule_id)
    AND EXISTS (
      SELECT 1
      FROM public.carburant c
      WHERE c.id = carburant_id
        AND c.created_by = auth.uid()
        AND c.status = 'brouillon'
    )
  );

DROP POLICY IF EXISTS "chauffeur delete carburant carte tx" ON public.carburant_carte_transactions;
CREATE POLICY "chauffeur delete carburant carte tx" ON public.carburant_carte_transactions
  FOR DELETE TO authenticated
  USING (
    public.current_user_role() = 'chauffeur'
    AND type = 'consommation'
    AND EXISTS (
      SELECT 1
      FROM public.carburant c
      WHERE c.id = carburant_id
        AND c.created_by = auth.uid()
        AND c.status = 'brouillon'
    )
  );
