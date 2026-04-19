-- Ajout type_carburant et montant à la table carburant
ALTER TABLE carburant
  ADD COLUMN IF NOT EXISTS type_carburant TEXT DEFAULT 'Gasoil',
  ADD COLUMN IF NOT EXISTS montant INT DEFAULT 0;

-- Table chauffeurs
CREATE TABLE IF NOT EXISTS chauffeurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom_complet TEXT NOT NULL,
  matricule TEXT,
  grade TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table déplacements
CREATE TABLE IF NOT EXISTS deplacements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chauffeur_id UUID NOT NULL REFERENCES chauffeurs(id) ON DELETE CASCADE,
  vehicule_id UUID REFERENCES vehicules(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  nombre_jours INT DEFAULT 1,
  montant_journalier INT DEFAULT 0,
  status TEXT DEFAULT 'impaye',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ajout chauffeur_id aux contraventions
ALTER TABLE contraventions
  ADD COLUMN IF NOT EXISTS chauffeur_id UUID REFERENCES chauffeurs(id) ON DELETE SET NULL;
