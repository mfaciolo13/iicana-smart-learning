export type UserRole = "director" | "administrativo" | "profesor" | "alumno";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}
