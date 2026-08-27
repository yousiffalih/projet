import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ClinicInfo {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  subscription_plan: string;
  subscription_status: string;
  created_at: string;
}

export interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  specialty: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly api = 'http://localhost:5001/api/settings';

  constructor(private http: HttpClient) {}

  getClinic(): Observable<ClinicInfo> {
    return this.http.get<ClinicInfo>(`${this.api}/clinic`);
  }

  updateClinic(data: Partial<ClinicInfo>): Observable<{ message: string; clinic: ClinicInfo }> {
    return this.http.put<{ message: string; clinic: ClinicInfo }>(`${this.api}/clinic`, data);
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.api}/profile`);
  }

  updateProfile(data: { full_name: string; phone: string }): Observable<{ message: string; user: UserProfile }> {
    return this.http.put<{ message: string; user: UserProfile }>(`${this.api}/profile`, data);
  }

  changePassword(data: { current_password: string; new_password: string }): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.api}/password`, data);
  }
}
