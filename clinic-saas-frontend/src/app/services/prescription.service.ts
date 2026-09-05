import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MedicineItem {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  id: number;
  clinic_id: number;
  patient_id: number;
  doctor_id: number;
  diagnosis: string;
  medicines: MedicineItem[];
  notes?: string;
  created_at: string;
  patient_name?: string;
  patient_phone?: string;
  patient_gender?: string;
  patient_dob?: string;
  doctor_name?: string;
  doctor_specialty?: string;
  clinic_name?: string;
  clinic_phone?: string;
  clinic_address?: string;
  clinic_email?: string;
}

@Injectable({ providedIn: 'root' })
export class PrescriptionService {
  private readonly base = 'http://localhost:5001/api/prescriptions';

  constructor(private http: HttpClient) {}

  getAll(filters?: { search?: string; patient_id?: number }): Observable<Prescription[]> {
    let params: Record<string, string> = {};
    if (filters?.search) params['search'] = filters.search;
    if (filters?.patient_id) params['patient_id'] = filters.patient_id.toString();
    return this.http.get<Prescription[]>(this.base, { params });
  }

  getById(id: number): Observable<Prescription> {
    return this.http.get<Prescription>(`${this.base}/${id}`);
  }

  create(payload: {
    patient_id: number;
    doctor_id?: number | null;
    diagnosis: string;
    medicines: MedicineItem[];
    notes?: string;
  }): Observable<{ message: string; prescription: Prescription }> {
    return this.http.post<{ message: string; prescription: Prescription }>(this.base, payload);
  }

  update(id: number, payload: {
    doctor_id?: number | null;
    diagnosis: string;
    medicines: MedicineItem[];
    notes?: string;
  }): Observable<{ message: string; prescription: Prescription }> {
    return this.http.put<{ message: string; prescription: Prescription }>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }
}
