import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface ReportKPI {
  total_patients: number;
  total_appointments: number;
  confirmed_appointments: number;
  pending_appointments: number;
  cancelled_appointments: number;
  total_doctors: number;
  completion_rate: number;
}

export interface TypeBreakdown {
  name: string;
  count: number;
  percentage: number;
}

export interface StatusBreakdown {
  key: 'confirmed' | 'pending' | 'cancelled';
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface TopDoctor {
  id: number;
  full_name: string;
  specialty: string;
  completed_count: number;
}

export interface MonthlyGrowth {
  month_key: string;
  month_label: string;
  patient_count: number;
}

export interface ReportAnalyticsResponse {
  kpi: ReportKPI;
  by_type: TypeBreakdown[];
  by_status: StatusBreakdown[];
  top_doctors: TopDoctor[];
  monthly_growth: MonthlyGrowth[];
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly apiUrl = 'http://localhost:5001/api/dashboard/reports';

  // ─── Cache ────────────────────────────────────────────────
  private _analytics$ = new BehaviorSubject<ReportAnalyticsResponse | null>(null);
  private _loaded = false;

  readonly analytics$ = this._analytics$.asObservable();

  constructor(private http: HttpClient) {}

  load(): void {
    this.http.get<ReportAnalyticsResponse>(this.apiUrl).subscribe({
      next: (data) => {
        this._analytics$.next(data);
        this._loaded = true;
      },
      error: (err) => {
        console.error('[ReportService] fetch error:', err);
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

  getAnalytics(): Observable<ReportAnalyticsResponse> {
    return this.http.get<ReportAnalyticsResponse>(this.apiUrl);
  }
}
