import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterClinicPayload {
  clinic_name: string;
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: number;
    full_name: string;
    role: string;
    clinic_id: number;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = 'http://localhost:5001/api/users';

  constructor(private http: HttpClient) {}

  login(payload: LoginPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, payload);
  }

  registerClinic(payload: RegisterClinicPayload): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/register-clinic`, payload);
  }

  saveSession(token: string, user: LoginResponse['user']): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): LoginResponse['user'] | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}
