import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AppointmentService, Appointment, Doctor } from '../../services/appointment.service';
import { PatientService, Patient } from '../../services/patient.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss'
})
export class OverviewComponent implements OnInit, OnDestroy {
  user: ReturnType<AuthService['getUser']> = null;
  currentTime = new Date();

  isStatsLoading = true;
  todayAppointments: Appointment[] = [];

  stats = [
    { label: 'إجمالي المرضى',   value: '—', icon: 'patients', color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',    trend: 'جارٍ التحميل...', trendUp: true },
    { label: 'مواعيد اليوم',    value: '—', icon: 'calendar', color: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/20',    trend: 'جارٍ التحميل...', trendUp: true },
    { label: 'الأطباء النشطون', value: '—', icon: 'doctors',  color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', trend: 'جارٍ التحميل...', trendUp: true },
    { label: 'نسبة الإنجاز',    value: '—', icon: 'revenue',  color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20',  trend: 'جارٍ التحميل...', trendUp: true },
  ];

  confirmedPct = 0;
  pendingPct   = 0;
  cancelledPct = 0;

  // ── Modals State ──
  showApptModal    = false;
  showPatientModal = false;
  isSubmitting     = false;
  modalError       = '';

  apptForm:    FormGroup;
  patientForm: FormGroup;

  patients: Patient[] = [];
  doctors:  Doctor[]  = [];

  private subs: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private appointmentService: AppointmentService,
    private patientService: PatientService,
    private http: HttpClient,
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    const today = this.getLocalDateString();

    this.apptForm = this.fb.group({
      patient_id:       ['', Validators.required],
      doctor_id:        [''],
      appointment_date: [today, Validators.required],
      appointment_time: ['', Validators.required],
      type:             ['فحص عام', Validators.required],
      notes:            ['']
    });

    this.patientForm = this.fb.group({
      full_name:       ['', Validators.required],
      phone:           [''],
      gender:          [''],
      email:           ['', Validators.email],
      date_of_birth:   [''],
      address:         [''],
      medical_history: ['']
    });
  }

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.loadData();
    this.loadDropdowns();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private getLocalDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadData(): void {
    this.isStatsLoading = true;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });

    // ── 1. جلب KPIs من تقرير العيادة ──────────────────────
    const reportSub = this.http.get<any>('http://localhost:5001/api/dashboard/reports', { headers }).subscribe({
      next: (data) => {
        const kpi = data?.kpi || {
          total_patients: 0,
          total_appointments: 0,
          confirmed_appointments: 0,
          pending_appointments: 0,
          cancelled_appointments: 0,
          total_doctors: 0,
          completion_rate: 0
        };

        const totalAppts = kpi.total_appointments || 1;

        this.stats = [
          {
            label: 'إجمالي المرضى',
            value: (kpi.total_patients ?? 0).toString(),
            icon: 'patients',
            color: 'text-blue-400',
            bg: 'bg-blue-500/10 border-blue-500/20',
            trend: `${kpi.total_patients ?? 0} مريض مسجل`,
            trendUp: (kpi.total_patients ?? 0) > 0
          },
          {
            label: 'مواعيد اليوم',
            value: this.todayAppointments.length.toString(),
            icon: 'calendar',
            color: 'text-teal-400',
            bg: 'bg-teal-500/10 border-teal-500/20',
            trend: `${kpi.confirmed_appointments ?? 0} موعد مؤكد`,
            trendUp: (kpi.confirmed_appointments ?? 0) > 0
          },
          {
            label: 'الأطباء النشطون',
            value: (kpi.total_doctors ?? 0).toString(),
            icon: 'doctors',
            color: 'text-violet-400',
            bg: 'bg-violet-500/10 border-violet-500/20',
            trend: (kpi.total_doctors ?? 0) > 0 ? 'طاقم نشط بالعيادة' : 'لا يوجد أطباء',
            trendUp: (kpi.total_doctors ?? 0) > 0
          },
          {
            label: 'نسبة الإنجاز',
            value: `${kpi.completion_rate ?? 0}%`,
            icon: 'revenue',
            color: 'text-amber-400',
            bg: 'bg-amber-500/10 border-amber-500/20',
            trend: `${kpi.confirmed_appointments ?? 0} من ${kpi.total_appointments ?? 0} موعد`,
            trendUp: (kpi.completion_rate ?? 0) >= 50
          }
        ];

        this.confirmedPct = Math.round(((kpi.confirmed_appointments || 0) / totalAppts) * 100) || 0;
        this.pendingPct   = Math.round(((kpi.pending_appointments   || 0) / totalAppts) * 100) || 0;
        this.cancelledPct = Math.round(((kpi.cancelled_appointments || 0) / totalAppts) * 100) || 0;

        this.isStatsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isStatsLoading = false;
        this.cdr.detectChanges();
      }
    });

    // ── 2. جلب مواعيد اليوم ───────────────────────────────
    const todaySub = this.appointmentService.getToday().subscribe({
      next: (todayList) => {
        this.todayAppointments = todayList || [];
        const calStat = this.stats.find(s => s.icon === 'calendar');
        if (calStat) {
          calStat.value = this.todayAppointments.length.toString();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        // Fallback to cache filter
        const todayStr = this.getLocalDateString();
        const apptSub = this.appointmentService.appointments$.subscribe(all => {
          this.todayAppointments = (all || []).filter(a => {
            const dateStr = (a.appointment_date || '').toString().split('T')[0];
            return dateStr === todayStr;
          }).slice(0, 8);
          this.cdr.detectChanges();
        });
        this.subs.push(apptSub);
      }
    });

    this.subs.push(reportSub, todaySub);
    this.appointmentService.load();
  }

  private loadDropdowns(): void {
    this.patientService.patients$.subscribe(data => {
      this.patients = data || [];
      this.cdr.detectChanges();
    });
    this.patientService.load();

    this.appointmentService.getDoctors().subscribe({
      next: (d) => {
        this.doctors = d || [];
        this.cdr.detectChanges();
      },
      error: () => this.doctors = []
    });
  }

  // ── Quick Modal Actions ──
  openNewApptModal(): void {
    this.showApptModal = true;
    this.modalError = '';
    this.apptForm.reset({
      appointment_date: this.getLocalDateString(),
      type: 'فحص عام'
    });
  }

  closeApptModal(): void {
    this.showApptModal = false;
  }

  submitAppt(): void {
    if (this.apptForm.invalid) {
      this.apptForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.modalError = '';

    const payload = { ...this.apptForm.value };
    if (!payload.doctor_id) payload.doctor_id = null;
    if (payload.notes) payload.notes = payload.notes.trim();

    this.appointmentService.create(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeApptModal();
        this.loadData();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.modalError = err?.error?.error || 'حدث خطأ أثناء جدولة الموعد';
        this.cdr.detectChanges();
      }
    });
  }

  openNewPatientModal(): void {
    this.showPatientModal = true;
    this.modalError = '';
    this.patientForm.reset();
  }

  closePatientModal(): void {
    this.showPatientModal = false;
  }

  submitPatient(): void {
    if (this.patientForm.invalid) {
      this.patientForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.modalError = '';

    const payload = { ...this.patientForm.value };
    Object.keys(payload).forEach(key => {
      if (typeof payload[key] === 'string') {
        payload[key] = payload[key].trim();
      }
    });

    this.patientService.create(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closePatientModal();
        this.loadData();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.modalError = err?.error?.error || 'حدث خطأ أثناء إضافة المريض';
        this.cdr.detectChanges();
      }
    });
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      confirmed: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
      pending:   'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      cancelled: 'bg-red-500/10 text-red-400 border border-red-500/20',
    };
    return map[status] || 'bg-slate-500/10 text-slate-400';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { confirmed: 'مؤكد', pending: 'معلق', cancelled: 'ملغي' };
    return map[status] || '—';
  }

  getAvatar(name: string | undefined | null): string {
    return name ? name.charAt(0) : '؟';
  }
}
