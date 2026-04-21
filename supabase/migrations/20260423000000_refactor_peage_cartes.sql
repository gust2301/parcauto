DROP POLICY IF EXISTS "role read peage cartes" ON public.peage_cartes;
DROP POLICY IF EXISTS "admin manage peage cartes" ON public.peage_cartes;
DROP POLICY IF EXISTS "role read peage transactions" ON public.peage_transactions;
DROP POLICY IF EXISTS "admin manage peage transactions" ON public.peage_transactions;

DROP INDEX IF EXISTS public.idx_peage_cartes_vehicule_id;

ALTER TABLE public.peage_cartes
  DROP COLUMN IF EXISTS vehicule_id;

ALTER TABLE public.peage_transactions
  ALTER COLUMN vehicule_id DROP NOT NULL;

CREATE POLICY "role read peage cartes" ON public.peage_cartes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin manage peage cartes" ON public.peage_cartes
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "role read peage transactions" ON public.peage_transactions
  FOR SELECT TO authenticated
  USING (
    type = 'rechargement'
    OR public.current_user_can_access_vehicle(vehicule_id)
  );

CREATE POLICY "admin manage peage transactions" ON public.peage_transactions
  FOR ALL TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (
    public.current_user_is_admin()
    AND (
      (type = 'rechargement' AND vehicule_id IS NULL AND carte_id IS NOT NULL)
      OR (type = 'passage_cash' AND vehicule_id IS NOT NULL AND carte_id IS NULL)
      OR (type = 'passage_carte' AND vehicule_id IS NOT NULL AND carte_id IS NOT NULL)
    )
  );
