import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PlatformStats {
  total_clinics: number;
  active_clinics: number;
  inactive_clinics: number;
  total_patients: number;
  total_appointments: number;
  confirmed_appointments: number;
  total_doctors: number;
  basic_plan: number;
  pro_plan: number;
  enterprise_plan: number;
}

export interface ClinicRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  subscription_plan: 'Basic' | 'Pro' | 'Enterprise';
  subscription_status: 'Active' | 'Inactive';
  created_at: string;
  admins_count: number;
  doctors_count: number;
  patients_count: number;
  appointments_count: number;
  confirmed_count: number;
}

export interface SuperAdminUser {
  id: number;
  full_name: string;
  email: string;
  role: 'SUPER_ADMIN';
}

@Injectable({ providedIn: 'root' })
export class SuperAdminService {
  private readonly base = 'http://localhost:5001/api/superadmin';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<{ token: string; user: SuperAdminUser }> {
    return this.http.post<{ token: string; user: SuperAdminUser }>(`${this.base}/login`, { email, password });
  }

  getStats(): Observable<{ stats: PlatformStats; recent_clinics: ClinicRow[] }> {
    return this.http.get<{ stats: PlatformStats; recent_clinics: ClinicRow[] }>(`${this.base}/stats`);
  }

  getClinics(filters?: { search?: string; plan?: string; status?: string }): Observable<ClinicRow[]> {
    let params: Record<string, string> = {};
    if (filters?.search)  params['search'] = filters.search;
    if (filters?.plan)    params['plan']   = filters.plan;
    if (filters?.status)  params['status'] = filters.status;
    return this.http.get<ClinicRow[]>(`${this.base}/clinics`, { params });
  }

  getClinicDetails(clinicId: number): Observable<any> {
    return this.http.get(`${this.base}/clinics/${clinicId}/details`);
  }

  createClinic(payload: {
    name: string;
    owner_name: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
    subscription_plan?: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/clinics`, payload);
  }

  updateClinicFull(clinicId: number, payload: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    subscription_plan?: string;
    subscription_status?: string;
    new_password?: string;
  }): Observable<any> {
    return this.http.put(`${this.base}/clinics/${clinicId}`, payload);
  }

  updatePlan(clinicId: number, plan: string): Observable<any> {
    return this.http.patch(`${this.base}/clinics/${clinicId}/plan`, { plan });
  }

  toggleStatus(clinicId: number): Observable<any> {
    return this.http.patch(`${this.base}/clinics/${clinicId}/status`, {});
  }

  impersonate(clinicId: number): Observable<{ message: string; token: string; user: any }> {
    return this.http.post<{ message: string; token: string; user: any }>(
      `${this.base}/clinics/${clinicId}/impersonate`,
      {}
    );
  }

  deleteClinic(clinicId: number): Observable<any> {
    return this.http.delete(`${this.base}/clinics/${clinicId}`);
  }

  // ── Session helpers ──────────────────────────────────
  saveSession(token: string, user: SuperAdminUser): void {
    localStorage.setItem('sa_token', token);
    localStorage.setItem('sa_user', JSON.stringify(user));
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('sa_token') || localStorage.getItem('token');
  }

  getUser(): SuperAdminUser | null {
    if (typeof window === 'undefined') return null;
    const u = localStorage.getItem('sa_user') || localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  }

  isLoggedIn(): boolean {
    const user = this.getUser();
    return !!this.getToken() && user?.role === 'SUPER_ADMIN';
  }

  logout(): void {
    localStorage.removeItem('sa_token');
    localStorage.removeItem('sa_user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}
