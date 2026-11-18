CREATE SCHEMA IF NOT EXISTS jj;
REVOKE ALL ON SCHEMA jj FROM PUBLIC;

CREATE TABLE IF NOT EXISTS jj.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('candidate', 'company', 'admin')),
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash text NOT NULL,
  name text NOT NULL,
  profile jsonb NOT NULL DEFAULT '{}',
  consent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jj.sessions (
  token_hash text PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES jj.accounts ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON jj.sessions(expires_at);

CREATE TABLE IF NOT EXISTS jj.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES jj.accounts ON DELETE CASCADE,
  title text NOT NULL,
  details jsonb NOT NULL,
  status text NOT NULL DEFAULT 'triagem' CHECK (status IN ('triagem','sent','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_company ON jj.jobs(company_id);

CREATE TABLE IF NOT EXISTS jj.interests (
  job_id uuid NOT NULL REFERENCES jj.jobs ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES jj.accounts ON DELETE CASCADE,
  PRIMARY KEY (job_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS jj.selections (
  job_id uuid NOT NULL REFERENCES jj.jobs ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES jj.accounts ON DELETE CASCADE,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 5),
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 100),
  stage text NOT NULL DEFAULT 'Pré-selecionado' CHECK (stage IN ('Pré-selecionado','Entrevista','Contratado','Não selecionado')),
  PRIMARY KEY (job_id, candidate_id),
  UNIQUE (job_id, position)
);
CREATE INDEX IF NOT EXISTS selections_candidate ON jj.selections(candidate_id);

CREATE TABLE IF NOT EXISTS jj.notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES jj.accounts ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX IF NOT EXISTS notices_candidate ON jj.notices(candidate_id, created_at DESC);
