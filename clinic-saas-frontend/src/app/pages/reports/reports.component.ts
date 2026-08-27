import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ReportService, ReportAnalyticsResponse } from '../../services/report.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit, OnDestroy {
  analytics: ReportAnalyticsResponse | null = null;
  isLoading = true;
  loadError = '';

  private sub?: Subscription;

  constructor(
    private reportService: ReportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.reportService.isLoaded) {
      this.isLoading = false;
    }

    this.sub = this.reportService.analytics$.subscribe({
      next: (data) => {
        if (data) {
          this.analytics = data;
          this.isLoading = false;
          this.loadError = '';
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.loadError = err?.error?.error || 'فشل تحميل تقارير العيادة.';
        this.cdr.detectChanges();
      }
    });

    this.reportService.load();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  refreshData(): void {
    this.isLoading = true;
    this.loadError = '';
    this.reportService.refresh();
    this.cdr.detectChanges();
  }

  get maxMonthlyCount(): number {
    if (!this.analytics?.monthly_growth || this.analytics.monthly_growth.length === 0) return 1;
    return Math.max(...this.analytics.monthly_growth.map(m => m.patient_count), 1);
  }

  getDoctorAvatarColor(name: string): string {
    if (!name) return 'from-teal-400 to-blue-500';
    const colors = [
      'from-teal-400 to-emerald-500',
      'from-purple-400 to-indigo-500',
      'from-blue-400 to-cyan-500',
      'from-amber-400 to-orange-500'
    ];
    return colors[name.charCodeAt(0) % colors.length];
  }

  getTypeBadgeColor(index: number): string {
    const colors = ['bg-teal-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500'];
    return colors[index % colors.length];
  }

  getTypeBarColor(index: number): string {
    const colors = ['from-teal-500 to-emerald-400', 'from-blue-500 to-cyan-400', 'from-purple-500 to-violet-400', 'from-amber-500 to-yellow-400', 'from-pink-500 to-rose-400'];
    return colors[index % colors.length];
  }
}
