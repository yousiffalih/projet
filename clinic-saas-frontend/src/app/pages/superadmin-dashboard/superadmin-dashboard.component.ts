import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SuperAdminService, PlatformStats, ClinicRow } from '../../services/super-admin.service';

@Component({
  selector: 'app-superadmin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './superadmin-dashboard.component.html',
  styleUrl: './superadmin-dashboard.component.scss'
})
export class SuperadminDashboardComponent implements OnInit {
  stats: PlatformStats | null = null;
  recentClinics: ClinicRow[] = [];
  isLoading = true;
  error = '';

  constructor(
    private sa: SuperAdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.sa.getStats().subscribe({
      next: (data) => {
        this.stats = data.stats;
        this.recentClinics = data.recent_clinics || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.error || 'فشل تحميل الإحصائيات';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  getPlanBadge(plan: string): string {
    switch (plan) {
      case 'Pro':        return 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
      case 'Enterprise': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default:           return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  }

  getStatusBadge(status: string): string {
    return status === 'Active'
      ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
      : 'bg-red-500/10 text-red-400 border border-red-500/20';
  }
}
