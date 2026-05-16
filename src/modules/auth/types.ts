export type UserRole = "admin" | "profesor" | "alumno";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}
