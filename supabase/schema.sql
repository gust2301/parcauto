-- PARCAUTO - Schéma de base de données
-- À exécuter dans l'éditeur SQL de Supabase

CREATE TABLE vehicules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  immatriculation TEXT NOT NULL,
  marque TEXT,
  modele TEXT,
  annee INT,
  kilometrage INT DEFAULT 0,
  statut TEXT DEFAULT 'actif' CHECK (statut IN ('actif','panne','reforme')),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE entretiens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id UUID REFERENCES vehicules(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type_intervention TEXT,
  pieces TEXT,
  cout INT DEFAULT 0,
  garage TEXT,
  kilometrage INT,
  commentaire TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE dotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id UUID REFERENCES vehicules(id) ON DELETE CASCADE,
  periode TEXT NOT NULL, -- ex: "2026-04"
  litres_alloues NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE carburant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id UUID REFERENCES vehicules(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  litres NUMERIC NOT NULL,
  kilometrage INT,
  station TEXT,
  reference_bon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id UUID REFERENCES vehicules(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('assurance','visite_technique','vignette')),
  date_realisation DATE,
  date_echeance DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE contraventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id UUID REFERENCES vehicules(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  lieu TEXT,
  conducteur TEXT,
  nature TEXT,
  montant INT DEFAULT 0,
  statut TEXT DEFAULT 'en_attente' CHECK (statut IN ('payee','en_attente','contestee')),
  justificatif_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies (activer si nécessaire)
-- ALTER TABLE vehicules ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE entretiens ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dotations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE carburant ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contraventions ENABLE ROW LEVEL SECURITY;
