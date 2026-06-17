-- SCRUM-214: Detección de riesgo de abandono
CREATE TYPE risk_level AS ENUM ('none', 'low', 'medium', 'high');

CREATE TABLE student_risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  risk_level risk_level NOT NULL DEFAULT 'none',
  signals JSONB NOT NULL DEFAULT '[]',
  -- signals shape: { type: 'overdue' | 'low_attendance' | 'low_assessment', detail: string }[]
  assessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  intervened_at TIMESTAMP WITH TIME ZONE,
  intervened_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  intervention_note TEXT
);

CREATE INDEX idx_student_risk_student_id ON student_risk_assessments(student_id);
CREATE INDEX idx_student_risk_assessed_at ON student_risk_assessments(assessed_at DESC);
