export type UserRole = "admin" | "profesor" | "alumno" | "tutor";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}
