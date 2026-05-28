export type UserRole = "admin" | "administrativo" | "profesor" | "alumno";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}
