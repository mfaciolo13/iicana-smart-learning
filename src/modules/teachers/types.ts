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
}
