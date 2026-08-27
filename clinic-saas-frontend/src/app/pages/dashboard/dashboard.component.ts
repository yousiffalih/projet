import { Component, OnInit, OnDestroy, signal, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { PatientService } from '../../services/patient.service';
import { AppointmentService, Appointment } from '../../services/appointment.service';
import { DoctorService } from '../../services/doctor.service';
import { Subscription, forkJoin } from 'rxjs';

interface StatCard {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  bg: string;
  trend: string;
  trendUp: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  user: ReturnType<AuthService['getUser']> = null;
  sidebarOpen = signal(true);
  currentTime = new Date();

  // ─── Real Data ───────────────────────────────────────────
  todayAppointments: Appointment[] = [];
  isStatsLoading = true;

  stats: StatCard[] = [
    { label: 'إجمالي المرضى',    value: '—', icon: 'patients', color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   trend: 'جارٍ التحميل...',  trendUp: true },
    { label: 'مواعيد اليوم',     value: '—', icon: 'calendar', color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/20',   trend: 'جارٍ التحميل...',  trendUp: true },
    { label: 'الأطباء النشطون',  value: '—', icon: 'doctors',  color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', trend: 'جارٍ التحميل...', trendUp: true },
    { label: 'نسبة الإنجاز',     value: '—', icon: 'revenue',  color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20',  trend: 'جارٍ التحميل...',  trendUp: true },
  ];

  // Clinic completion bar data
  confirmedPct = 0;
  pendingPct   = 0;
  cancelledPct = 0;

  navItems = [
    { label: 'لوحة التحكم', icon: 'dashboard', active: true },
    { label: 'المرضى',      icon: 'patients',  active: false },
    { label: 'المواعيد',    icon: 'calendar',  active: false },
    { label: 'الأطباء',     icon: 'doctors',   active: false },
    { label: 'التقارير',    icon: 'reports',   active: false },
    { label: 'الإعدادات',   icon: 'settings',  active: false },
  ];

  private subs: Subscription[] = [];
  private timeInterval?: ReturnType<typeof setInterval>;

  constructor(
    private authService: AuthService,
    private router: Router,
    private patientService: PatientService,
    private appointmentService: AppointmentService,
    private doctorService: DoctorService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.timeInterval = setInterval(() => this.currentTime = new Date(), 60000);
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    if (this.timeInterval) clearInterval(this.timeInterval);
  }

  private loadDashboardData(): void {
    const token = this.authService.getToken ? this.authService.getToken() : localStorage.getItem('token');
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    // جلب تقرير الإحصائيات من نقطة النهاية الموجودة
    const reportsSub = this.http.get<any>('http://localhost:5001/api/dashboard/reports', { headers }).subscribe({
      next: (data) => {
        const kpi = data.kpi;
        const totalAppts = kpi.total_appointments || 1;

        // تحديث بطاقات الإحصائيات بالبيانات الحقيقية
        this.stats = [
          {
            label: 'إجمالي المرضى',
            value: kpi.total_patients,
            icon: 'patients',
            color: 'text-blue-400',
            bg: 'bg-blue-500/10 border-blue-500/20',
            trend: `${kpi.total_patients} مريض مسجل`,
            trendUp: kpi.total_patients > 0
          },
          {
            label: 'إجمالي المواعيد',
            value: kpi.total_appointments,
            icon: 'calendar',
            color: 'text-teal-400',
            bg: 'bg-teal-500/10 border-teal-500/20',
            trend: `${kpi.confirmed_appointments} موعد مؤكد`,
            trendUp: kpi.confirmed_appointments > 0
          },
          {
            label: 'الأطباء النشطون',
            value: kpi.total_doctors,
            icon: 'doctors',
            color: 'text-violet-400',
            bg: 'bg-violet-500/10 border-violet-500/20',
            trend: kpi.total_doctors > 0 ? 'طاقم نشط' : 'لا يوجد أطباء بعد',
            trendUp: kpi.total_doctors > 0
          },
          {
            label: 'نسبة الإنجاز',
            value: `${kpi.completion_rate}%`,
            icon: 'revenue',
            color: 'text-amber-400',
            bg: 'bg-amber-500/10 border-amber-500/20',
            trend: `${kpi.confirmed_appointments} من ${kpi.total_appointments} موعد`,
            trendUp: kpi.completion_rate >= 50
          }
        ];

        // شرائط التقدم
        this.confirmedPct = Math.round((kpi.confirmed_appointments / totalAppts) * 100) || 0;
        this.pendingPct   = Math.round((kpi.pending_appointments   / totalAppts) * 100) || 0;
        this.cancelledPct = Math.round((kpi.cancelled_appointments  / totalAppts) * 100) || 0;

        this.isStatsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isStatsLoading = false;
        this.cdr.detectChanges();
      }
    });

    // جلب مواعيد اليوم
    const apptSub = this.appointmentService.appointments$.subscribe(all => {
      const todayStr = new Date().toISOString().split('T')[0];
      this.todayAppointments = all
        .filter(a => a.appointment_date === todayStr || (a.appointment_date || '').startsWith(todayStr))
        .slice(0, 6);
      this.cdr.detectChanges();
    });

    this.subs.push(reportsSub, apptSub);
    this.appointmentService.load();
  }

  toggleSidebar(): void {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getStatusClass(status: string | undefined): string {
    switch (status) {
      case 'confirmed': return 'bg-teal-500/10 text-teal-400 border border-teal-500/20';
      case 'pending':   return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default: return '';
    }
  }

  getStatusLabel(status: string | undefined): string {
    switch (status) {
      case 'confirmed': return 'مؤكد';
      case 'pending':   return 'معلق';
      case 'cancelled': return 'ملغي';
      default: return '';
    }
  }

  getPatientAvatar(name: string | undefined | null): string {
    return name ? name.charAt(0) : '؟';
  }
}
