import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface Appointment {
  id?: number;
  clinic_id?: number;
  patient_id: number;
  doctor_id?: number | null;
  appointment_date: string;
  appointment_time: string;
  type?: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
  patient_name?: string;
  patient_phone?: string;
  doctor_name?: string;
  created_at?: string;
}

export interface Doctor {
  id: number;
  full_name: string;
  role: string;
  specialty?: string;
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly apiUrl    = 'http://localhost:5001/api/appointments';
  private readonly doctorsUrl = 'http://localhost:5001/api/users/doctors';

  // ─── Cache ────────────────────────────────────────────────
  private _appointments$ = new BehaviorSubject<Appointment[]>([]);
  private _loaded = false;

  readonly appointments$ = this._appointments$.asObservable();

  constructor(private http: HttpClient) {}

  /** تحميل/تحديث الـ cache من الخادم */
  load(): void {
    this.http.get<Appointment[]>(this.apiUrl).subscribe({
      next: (data) => { this._appointments$.next(data); this._loaded = true; },
      error: (err) => {
        console.error('[AppointmentService] fetch error:', err);
        if (!this._loaded) {
          this._appointments$.error(err);
          this._appointments$ = new BehaviorSubject<Appointment[]>([]);
        }
      }
    });
  }

  refresh(): void { this._loaded = false; this.load(); }

  get isLoaded(): boolean { return this._loaded; }

  /** مواعيد اليوم فقط */
  getToday(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.apiUrl}/today`);
  }

  /** للاستخدام المباشر (بدون cache) */
  getAll(): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(this.apiUrl);
  }

  getDoctors(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(this.doctorsUrl);
  }

  create(appt: Partial<Appointment>): Observable<{ message: string; appointment: Appointment }> {
    return this.http.post<{ message: string; appointment: Appointment }>(this.apiUrl, appt).pipe(
      tap((res) => {
        if (res && res.appointment) {
          const current = this._appointments$.getValue();
          this._appointments$.next([res.appointment, ...current.filter(a => a.id !== res.appointment.id)]);
        }
      })
    );
  }

  update(id: number, appt: Partial<Appointment>): Observable<{ message: string; appointment: Appointment }> {
    return this.http.put<{ message: string; appointment: Appointment }>(`${this.apiUrl}/${id}`, appt).pipe(
      tap((res) => {
        if (res && res.appointment) {
          const current = this._appointments$.getValue();
          this._appointments$.next(current.map(a => a.id === id ? res.appointment : a));
        }
      })
    );
  }

  updateStatus(id: number, status: 'pending' | 'confirmed' | 'cancelled'): Observable<{ message: string; appointment: Appointment }> {
    // تحديث فوري في الـ cache
    const updated = this._appointments$.getValue().map(a =>
      a.id === id ? { ...a, status } : a
    );
    this._appointments$.next(updated);

    return this.http.patch<{ message: string; appointment: Appointment }>(
      `${this.apiUrl}/${id}/status`, { status }
    );
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const updated = this._appointments$.getValue().filter(a => a.id !== id);
        this._appointments$.next(updated);
      })
    );
  }
}
