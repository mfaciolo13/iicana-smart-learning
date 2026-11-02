export interface TeacherWithProfile {
  id: string;
  dni: string;
  specialization: string | null;
  profileId: string;
  createdAt: Date;
  profile: {
    fullName: string;
    email: string;
    phone: string | null;
  };
}

export interface TeacherListItem {
  id: string;
  fullName: string;
  email: string;
  dni: string;
  specialization: string | null;
  /** Dado de baja: su cuenta está bloqueada pero se conservan sus evaluaciones. */
  deactivated?: boolean;
}
