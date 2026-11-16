import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  User,
} from "../types/auth";
import type { APIResponse } from "../types/chat";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";

async function authRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      result?.message || "Authentication failed. Please try again."
    );
  }

  return result as T;
}

export async function loginApi(input: LoginInput): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function registerApi(input: RegisterInput): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function refreshApi(): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/auth/refresh", {
    method: "POST",
  });
}

export async function logoutApi(): Promise<{ success: boolean; message: string }> {
  return authRequest<{ success: boolean; message: string }>("/auth/logout", {
    method: "POST",
  });
}

export async function getMeApi(token: string): Promise<APIResponse<User>> {
  return authRequest<APIResponse<User>>("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
