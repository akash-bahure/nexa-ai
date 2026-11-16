export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthData {
  user: User;
  accessToken: string;
}

export interface AuthResponse {
  success: boolean;
  data: AuthData;
  message?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}
