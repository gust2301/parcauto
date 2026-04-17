CREATE TABLE assurances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id UUID REFERENCES vehicules(id) ON DELETE CASCADE,
  date_debut DATE NOT NULL,
  date_echeance DATE NOT NULL,
  montant INT DEFAULT 0,
  assureur TEXT,
  numero_police TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
