-- Gestion fine des droits:
-- admin: tout voir et tout modifier
-- viewer: tout voir, rien modifier
-- chauffeur: voir son profil et ses vehicules affectes, saisir ses pleins/deplacements

ALTER TABLE public.chauffeurs
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.vehicules
  ADD COLUMN IF NOT EXISTS nombre_places int,
  ADD COLUMN IF NOT EXISTS puissance int,
  ADD COLUMN IF NOT EXISTS affectation_lieu text;

CREATE TABLE IF NOT EXISTS public.chauffeur_vehicules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chauffeur_id uuid NOT NULL REFERENCES public.chauffeurs(id) ON DELETE CASCADE,
  vehicule_id uuid NOT NULL REFERENCES public.vehicules(id) ON DELETE CASCADE,
  date_debut date NOT NULL DEFAULT CURRENT_DATE,
  date_fin date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (chauffeur_id, vehicule_id, date_debut)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chauffeur_vehicules TO authenticated;

ALTER TABLE public.carburant
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'brouillon';

ALTER TABLE public.deplacements
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.contraventions
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    'viewer'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_user_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_read_all()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT public.current_user_role() IN ('admin', 'viewer');
$$;

CREATE OR REPLACE FUNCTION public.current_user_chauffeur_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.chauffeurs WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_access_vehicle(vehicle uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_can_read_all()
    OR EXISTS (
      SELECT 1
      FROM public.chauffeur_vehicules cv
      JOIN public.chauffeurs c ON c.id = cv.chauffeur_id
      WHERE c.user_id = auth.uid()
        AND cv.vehicule_id = vehicle
        AND cv.active = true
        AND (cv.date_fin IS NULL OR cv.date_fin >= CURRENT_DATE)
    );
$$;

ALTER TABLE public.chauffeur_vehicules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated read vehicules" ON public.vehicules;
DROP POLICY IF EXISTS "admin write vehicules" ON public.vehicules;
DROP POLICY IF EXISTS "role read vehicules" ON public.vehicules;
DROP POLICY IF EXISTS "admin manage vehicules" ON public.vehicules;
CREATE POLICY "role read vehicules" ON public.vehicules FOR SELECT TO authenticated USING (public.current_user_can_access_vehicle(id));
CREATE POLICY "admin manage vehicules" ON public.vehicules FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "authenticated read chauffeurs" ON public.chauffeurs;
DROP POLICY IF EXISTS "admin write chauffeurs" ON public.chauffeurs;
DROP POLICY IF EXISTS "role read chauffeurs" ON public.chauffeurs;
DROP POLICY IF EXISTS "admin manage chauffeurs" ON public.chauffeurs;
CREATE POLICY "role read chauffeurs" ON public.chauffeurs FOR SELECT TO authenticated USING (public.current_user_can_read_all() OR user_id = auth.uid());
CREATE POLICY "admin manage chauffeurs" ON public.chauffeurs FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "role read chauffeur vehicules" ON public.chauffeur_vehicules;
DROP POLICY IF EXISTS "admin manage chauffeur vehicules" ON public.chauffeur_vehicules;
CREATE POLICY "role read chauffeur vehicules" ON public.chauffeur_vehicules FOR SELECT TO authenticated USING (public.current_user_can_read_all() OR chauffeur_id = public.current_user_chauffeur_id());
CREATE POLICY "admin manage chauffeur vehicules" ON public.chauffeur_vehicules FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "authenticated read entretiens" ON public.entretiens;
DROP POLICY IF EXISTS "admin write entretiens" ON public.entretiens;
DROP POLICY IF EXISTS "role read entretiens" ON public.entretiens;
DROP POLICY IF EXISTS "admin manage entretiens" ON public.entretiens;
CREATE POLICY "role read entretiens" ON public.entretiens FOR SELECT TO authenticated USING (public.current_user_can_access_vehicle(vehicule_id));
CREATE POLICY "admin manage entretiens" ON public.entretiens FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "authenticated read dotations" ON public.dotations;
DROP POLICY IF EXISTS "admin write dotations" ON public.dotations;
DROP POLICY IF EXISTS "role read dotations" ON public.dotations;
DROP POLICY IF EXISTS "admin manage dotations" ON public.dotations;
CREATE POLICY "role read dotations" ON public.dotations FOR SELECT TO authenticated USING (public.current_user_can_access_vehicle(vehicule_id));
CREATE POLICY "admin manage dotations" ON public.dotations FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "authenticated read documents" ON public.documents;
DROP POLICY IF EXISTS "admin write documents" ON public.documents;
DROP POLICY IF EXISTS "role read documents" ON public.documents;
DROP POLICY IF EXISTS "admin manage documents" ON public.documents;
CREATE POLICY "role read documents" ON public.documents FOR SELECT TO authenticated USING (public.current_user_can_access_vehicle(vehicule_id));
CREATE POLICY "admin manage documents" ON public.documents FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "authenticated read assurances" ON public.assurances;
DROP POLICY IF EXISTS "admin write assurances" ON public.assurances;
DROP POLICY IF EXISTS "role read assurances" ON public.assurances;
DROP POLICY IF EXISTS "admin manage assurances" ON public.assurances;
CREATE POLICY "role read assurances" ON public.assurances FOR SELECT TO authenticated USING (public.current_user_can_access_vehicle(vehicule_id));
CREATE POLICY "admin manage assurances" ON public.assurances FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

DROP POLICY IF EXISTS "authenticated read carburant" ON public.carburant;
DROP POLICY IF EXISTS "admin write carburant" ON public.carburant;
DROP POLICY IF EXISTS "role read carburant" ON public.carburant;
DROP POLICY IF EXISTS "admin manage carburant" ON public.carburant;
DROP POLICY IF EXISTS "chauffeur create carburant" ON public.carburant;
DROP POLICY IF EXISTS "chauffeur update own carburant" ON public.carburant;
DROP POLICY IF EXISTS "chauffeur delete own carburant" ON public.carburant;
CREATE POLICY "role read carburant" ON public.carburant FOR SELECT TO authenticated USING (public.current_user_can_access_vehicle(vehicule_id));
CREATE POLICY "admin manage carburant" ON public.carburant FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "chauffeur create carburant" ON public.carburant FOR INSERT TO authenticated WITH CHECK (
  public.current_user_role() = 'chauffeur'
  AND created_by = auth.uid()
  AND public.current_user_can_access_vehicle(vehicule_id)
);
CREATE POLICY "chauffeur update own carburant" ON public.carburant FOR UPDATE TO authenticated USING (
  public.current_user_role() = 'chauffeur'
  AND created_by = auth.uid()
  AND status = 'brouillon'
) WITH CHECK (
  created_by = auth.uid()
  AND status = 'brouillon'
  AND public.current_user_can_access_vehicle(vehicule_id)
);
CREATE POLICY "chauffeur delete own carburant" ON public.carburant FOR DELETE TO authenticated USING (
  public.current_user_role() = 'chauffeur'
  AND created_by = auth.uid()
  AND status = 'brouillon'
);

DROP POLICY IF EXISTS "authenticated read deplacements" ON public.deplacements;
DROP POLICY IF EXISTS "admin write deplacements" ON public.deplacements;
DROP POLICY IF EXISTS "role read deplacements" ON public.deplacements;
DROP POLICY IF EXISTS "admin manage deplacements" ON public.deplacements;
DROP POLICY IF EXISTS "chauffeur create deplacements" ON public.deplacements;
DROP POLICY IF EXISTS "chauffeur update own deplacements" ON public.deplacements;
DROP POLICY IF EXISTS "chauffeur delete own deplacements" ON public.deplacements;
CREATE POLICY "role read deplacements" ON public.deplacements FOR SELECT TO authenticated USING (
  public.current_user_can_read_all()
  OR chauffeur_id = public.current_user_chauffeur_id()
);
CREATE POLICY "admin manage deplacements" ON public.deplacements FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
CREATE POLICY "chauffeur create deplacements" ON public.deplacements FOR INSERT TO authenticated WITH CHECK (
  public.current_user_role() = 'chauffeur'
  AND created_by = auth.uid()
  AND chauffeur_id = public.current_user_chauffeur_id()
  AND (vehicule_id IS NULL OR public.current_user_can_access_vehicle(vehicule_id))
);
CREATE POLICY "chauffeur update own deplacements" ON public.deplacements FOR UPDATE TO authenticated USING (
  public.current_user_role() = 'chauffeur'
  AND created_by = auth.uid()
  AND chauffeur_id = public.current_user_chauffeur_id()
) WITH CHECK (
  created_by = auth.uid()
  AND chauffeur_id = public.current_user_chauffeur_id()
  AND (vehicule_id IS NULL OR public.current_user_can_access_vehicle(vehicule_id))
);
CREATE POLICY "chauffeur delete own deplacements" ON public.deplacements FOR DELETE TO authenticated USING (
  public.current_user_role() = 'chauffeur'
  AND created_by = auth.uid()
  AND chauffeur_id = public.current_user_chauffeur_id()
);

DROP POLICY IF EXISTS "authenticated read contraventions" ON public.contraventions;
DROP POLICY IF EXISTS "admin write contraventions" ON public.contraventions;
DROP POLICY IF EXISTS "role read contraventions" ON public.contraventions;
DROP POLICY IF EXISTS "admin manage contraventions" ON public.contraventions;
CREATE POLICY "role read contraventions" ON public.contraventions FOR SELECT TO authenticated USING (
  public.current_user_can_read_all()
  OR chauffeur_id = public.current_user_chauffeur_id()
  OR public.current_user_can_access_vehicle(vehicule_id)
);
CREATE POLICY "admin manage contraventions" ON public.contraventions FOR ALL TO authenticated USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());
