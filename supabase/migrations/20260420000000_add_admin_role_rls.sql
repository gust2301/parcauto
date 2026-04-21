-- Roles attendus dans les metadata Supabase Auth:
-- app_metadata.role = 'admin' pour les administrateurs.

-- Bootstrap: si aucun administrateur n'existe encore, le premier compte cree
-- devient admin pour eviter de verrouiller l'application apres activation RLS.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE raw_app_meta_data ->> 'role' = 'admin'
  ) THEN
    UPDATE auth.users
    SET
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
    WHERE id = (
      SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
    );
  END IF;
END $$;

-- Admin principal demande pour l'application.
UPDATE auth.users
SET
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
  raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
WHERE email = 'augustinjrvarore@gmail.com';

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    ''
  ) = 'admin';
$$;

ALTER TABLE public.vehicules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entretiens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carburant ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contraventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assurances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chauffeurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deplacements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated read vehicules" ON public.vehicules;
DROP POLICY IF EXISTS "admin write vehicules" ON public.vehicules;
CREATE POLICY "authenticated read vehicules" ON public.vehicules FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write vehicules" ON public.vehicules FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "authenticated read entretiens" ON public.entretiens;
DROP POLICY IF EXISTS "admin write entretiens" ON public.entretiens;
CREATE POLICY "authenticated read entretiens" ON public.entretiens FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write entretiens" ON public.entretiens FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "authenticated read dotations" ON public.dotations;
DROP POLICY IF EXISTS "admin write dotations" ON public.dotations;
CREATE POLICY "authenticated read dotations" ON public.dotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write dotations" ON public.dotations FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "authenticated read carburant" ON public.carburant;
DROP POLICY IF EXISTS "admin write carburant" ON public.carburant;
CREATE POLICY "authenticated read carburant" ON public.carburant FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write carburant" ON public.carburant FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "authenticated read documents" ON public.documents;
DROP POLICY IF EXISTS "admin write documents" ON public.documents;
CREATE POLICY "authenticated read documents" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write documents" ON public.documents FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "authenticated read contraventions" ON public.contraventions;
DROP POLICY IF EXISTS "admin write contraventions" ON public.contraventions;
CREATE POLICY "authenticated read contraventions" ON public.contraventions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write contraventions" ON public.contraventions FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "authenticated read assurances" ON public.assurances;
DROP POLICY IF EXISTS "admin write assurances" ON public.assurances;
CREATE POLICY "authenticated read assurances" ON public.assurances FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write assurances" ON public.assurances FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "authenticated read chauffeurs" ON public.chauffeurs;
DROP POLICY IF EXISTS "admin write chauffeurs" ON public.chauffeurs;
CREATE POLICY "authenticated read chauffeurs" ON public.chauffeurs FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write chauffeurs" ON public.chauffeurs FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "authenticated read deplacements" ON public.deplacements;
DROP POLICY IF EXISTS "admin write deplacements" ON public.deplacements;
CREATE POLICY "authenticated read deplacements" ON public.deplacements FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write deplacements" ON public.deplacements FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
