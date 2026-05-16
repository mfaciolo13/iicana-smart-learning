export type StudentStatus = "active" | "inactive" | "suspended" | "graduated";
export type Level =
  | "beginner"
  | "elementary"
  | "pre_intermediate"
  | "intermediate"
  | "upper_intermediate"
  | "advanced";

export interface StudentWithProfile {
  id: string;
  dni: string;
  birthDate: string;
  level: Level | null;
  placementTestScore: number | null;
  status: StudentStatus;
  profileId: string;
  createdAt: Date;
  updatedAt: Date;
  profile: {
    fullName: string;
    email: string;
    phone: string | null;
  };
}

export interface StudentListItem {
  id: string;
  fullName: string;
  email: string;
  dni: string;
  level: Level | null;
  status: StudentStatus;
}
