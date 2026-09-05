import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface Patient {
  id?: number;
  clinic_id?: number;
  full_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  medical_history?: string;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class PatientService {
  private readonly apiUrl = 'http://localhost:5001/api/patients';

  // ─── Cache ────────────────────────────────────────────────
  private _patients$ = new BehaviorSubject<Patient[]>([]);
  private _loaded = false; // هل سبق جلب البيانات؟

  /** البيانات المخزنة مؤقتاً — تُقرأ فوراً */
  readonly patients$ = this._patients$.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * يُرجع البيانات من الـ cache فوراً إن وُجدت،
   * ويُحدّث الـ cache من الخادم في الخلفية دائماً.
   */
  load(): void {
    this.http.get<Patient[]>(this.apiUrl).subscribe({
      next: (data) => {
        this._patients$.next(data);
        this._loaded = true;
      },
      error: (err) => {
        // لا نمسح البيانات القديمة عند الخطأ
        console.error('[PatientService] fetch error:', err);
        if (!this._loaded) {
          // لا توجد بيانات مخزنة — نُطلق خطأ
          this._patients$.error(err);
          // إعادة إنشاء الـ Subject حتى يمكن إعادة المحاولة
          this._patients$ = new BehaviorSubject<Patient[]>([]);
        }
      }
    });
  }

  /** يُجبر إعادة التحميل الكامل من الخادم */
  refresh(): void {
    this._loaded = false;
    this.load();
  }

  getAll(): Observable<Patient[]> {
    return this.http.get<Patient[]>(this.apiUrl);
  }

  getById(id: number): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/${id}`);
  }

  create(patient: Patient): Observable<{ message: string; patient: Patient }> {
    return this.http.post<{ message: string; patient: Patient }>(this.apiUrl, patient).pipe(
      tap((res) => {
        if (res && res.patient) {
          const current = this._patients$.getValue();
          this._patients$.next([res.patient, ...current.filter(p => p.id !== res.patient.id)]);
        }
      })
    );
  }

  update(id: number, patient: Patient): Observable<{ message: string; patient: Patient }> {
    return this.http.put<{ message: string; patient: Patient }>(`${this.apiUrl}/${id}`, patient).pipe(
      tap((res) => {
        if (res && res.patient) {
          const current = this._patients$.getValue();
          this._patients$.next(current.map(p => p.id === id ? res.patient : p));
        }
      })
    );
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        // حذف فوري من الـ cache بدون انتظار الخادم
        const updated = this._patients$.getValue().filter(p => p.id !== id);
        this._patients$.next(updated);
      })
    );
  }

  /** هل البيانات محمّلة مسبقاً؟ */
  get isLoaded(): boolean { return this._loaded; }
}
