-- SCRUM-209: Bloqueo por morosidad — campo access_restricted en students
ALTER TABLE students
  ADD COLUMN access_restricted BOOLEAN NOT NULL DEFAULT false;
