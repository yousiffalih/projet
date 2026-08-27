import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface Doctor {
  id: number;
  clinic_id?: number;
  full_name: string;
  email: string;
  password?: string;
  role?: string;
  specialty?: string;
  phone?: string;
  appointment_count?: number;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class DoctorService {
  private readonly apiUrl = 'http://localhost:5001/api/users/doctors';

  // ─── Cache ────────────────────────────────────────────────
  private _doctors$ = new BehaviorSubject<Doctor[]>([]);
  private _loaded = false;

  readonly doctors$ = this._doctors$.asObservable();

  constructor(private http: HttpClient) {}

  /** تحميل أو تحديث الأطباء من الخادم */
  load(): void {
    this.http.get<Doctor[]>(this.apiUrl).subscribe({
      next: (data) => {
        this._doctors$.next(data);
        this._loaded = true;
      },
      error: (err) => {
        console.error('[DoctorService] fetch error:', err);
        if (!this._loaded) {
          this._doctors$.next([]);
        }
      }
    });
  }

  refresh(): void {
    this._loaded = false;
    this.load();
  }

  get isLoaded(): boolean {
    return this._loaded;
  }

  getAll(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(this.apiUrl);
  }

  create(doctor: Partial<Doctor>): Observable<{ message: string; doctor: Doctor }> {
    return this.http.post<{ message: string; doctor: Doctor }>(this.apiUrl, doctor).pipe(
      tap((res) => {
        if (res && res.doctor) {
          const current = this._doctors$.getValue();
          this._doctors$.next([res.doctor, ...current.filter(d => d.id !== res.doctor.id)]);
        }
      })
    );
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const current = this._doctors$.getValue();
        this._doctors$.next(current.filter(d => d.id !== id));
      })
    );
  }
}
