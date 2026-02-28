export interface User {
  id: string;
  phoneNumber: string;
  email?: string;
  name?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  msg: string;
  user?: User;
  token?: string;
}

export interface LoginRequest {
  phoneNumber: string;
  userName: string;
}

export interface RegisterRequest {
  phoneNumber: string;
  name?: string;
}

