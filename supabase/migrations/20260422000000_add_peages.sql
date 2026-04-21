CREATE TABLE IF NOT EXISTS public.peage_cartes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id uuid REFERENCES public.vehicules(id) ON DELETE CASCADE,
  nom text,
  type text CHECK (type IN ('xeweull','rapido','autre')),
  seuil_alerte int DEFAULT 5000,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.peage_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id uuid REFERENCES public.vehicules(id) ON DELETE CASCADE,
  carte_id uuid REFERENCES public.peage_cartes(id) ON DELETE SET NULL,
  date date NOT NULL,
  type text CHECK (type IN ('passage_cash','passage_carte','rechargement')),
  montant int DEFAULT 0,
  axe text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_peage_cartes_vehicule_id ON public.peage_cartes(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_peage_transactions_vehicule_id ON public.peage_transactions(vehicule_id);
CREATE INDEX IF NOT EXISTS idx_peage_transactions_carte_id ON public.peage_transactions(carte_id);
CREATE INDEX IF NOT EXISTS idx_peage_transactions_date ON public.peage_transactions(date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.peage_cartes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.peage_transactions TO authenticated;

ALTER TABLE public.peage_cartes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peage_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role read peage cartes" ON public.peage_cartes;
DROP POLICY IF EXISTS "admin manage peage cartes" ON public.peage_cartes;
CREATE POLICY "role read peage cartes" ON public.peage_cartes FOR SELECT TO authenticated USING (public.current_user_can_access_vehicle(vehicule_id));
CREATE POLICY "admin manage peage cartes" ON public.peage_cartes FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "role read peage transactions" ON public.peage_transactions;
DROP POLICY IF EXISTS "admin manage peage transactions" ON public.peage_transactions;
CREATE POLICY "role read peage transactions" ON public.peage_transactions FOR SELECT TO authenticated USING (public.current_user_can_access_vehicle(vehicule_id));
CREATE POLICY "admin manage peage transactions" ON public.peage_transactions FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
