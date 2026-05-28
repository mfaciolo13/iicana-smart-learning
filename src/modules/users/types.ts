export type UserRole = "admin" | "administrativo" | "profesor" | "alumno";

export interface UserListItem {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone: string | null;
  createdAt: Date;
}

export interface UserDetail extends UserListItem {
  avatarUrl: string | null;
  updatedAt: Date;
  banned: boolean;
  emailConfirmed: boolean;
}
