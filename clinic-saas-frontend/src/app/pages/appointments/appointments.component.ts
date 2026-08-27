import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AppointmentService, Appointment, Doctor } from '../../services/appointment.service';
import { PatientService, Patient } from '../../services/patient.service';

interface CalendarDay {
  date: Date;
  label: string;     // "الأحد"
  dayNum: number;    // 15
  isToday: boolean;
  appointments: Appointment[];
}

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.scss'
})
export class AppointmentsComponent implements OnInit, OnDestroy {
  appointments: Appointment[] = [];
  patients: Patient[] = [];
  doctors: Doctor[] = [];

  isLoading = true;
  loadError = '';
  showModal = false;
  isSubmitting = false;
  errorMessage = '';

  /** list = بطاقات | calendar = تقويم أسبوعي */
  viewMode: 'list' | 'calendar' = 'list';

  filterStatus: 'all' | 'pending' | 'confirmed' | 'cancelled' = 'all';

  /** Skeleton placeholders */
  readonly skeletons = Array(6).fill(0);

  form: FormGroup;
  private sub?: Subscription;

  // ─── إحصائيات ────────────────────────────────────────────
  get todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }
  get todayCount(): number {
    return this.appointments.filter(a => a.appointment_date === this.todayStr).length;
  }
  get confirmedCount(): number {
    return this.appointments.filter(a => a.status === 'confirmed').length;
  }
  get pendingCount(): number {
    return this.appointments.filter(a => a.status === 'pending').length;
  }
  get cancelledCount(): number {
    return this.appointments.filter(a => a.status === 'cancelled').length;
  }

  // ─── أيام الأسبوع (تقويم) ────────────────────────────────
  get calendarWeek(): CalendarDay[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // ابدأ من السبت (بداية الأسبوع العربي)
    const dayOfWeek = today.getDay(); // 0=Sun
    const startOffset = dayOfWeek === 6 ? 0 : -(dayOfWeek + 1);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + startOffset);

    const dayNames = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      return {
        date,
        label: dayNames[i],
        dayNum: date.getDate(),
        isToday: dateStr === this.todayStr,
        appointments: this.appointments.filter(a => a.appointment_date === dateStr)
      };
    });
  }

  constructor(
    private apptService: AppointmentService,
    private patientService: PatientService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      patient_id:       ['', Validators.required],
      doctor_id:        [''],
      appointment_date: ['', Validators.required],
      appointment_time: ['', Validators.required],
      type:             ['فحص عام', Validators.required],
      notes:            ['']
    });
  }

  ngOnInit(): void {
    if (this.apptService.isLoaded) {
      this.isLoading = false;
    }

    // الاشتراك في الـ cache
    this.sub = this.apptService.appointments$.subscribe({
      next: (data) => {
        this.appointments = data;
        if (this.apptService.isLoaded) {
          this.isLoading = false;
        }
        this.loadError = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.loadError = err?.error?.error || 'فشل تحميل المواعيد.';
        this.cdr.detectChanges();
      }
    });
    this.apptService.load();

    // جلب المرضى والأطباء للـ dropdown
    this.patientService.patients$.subscribe(data => {
      this.patients = data;
      this.cdr.detectChanges();
    });
    this.patientService.load();

    this.apptService.getDoctors().subscribe({
      next: (d) => {
        this.doctors = d;
        this.cdr.detectChanges();
      },
      error: () => this.doctors = []
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  // ─── Filters ─────────────────────────────────────────────
  get filteredAppointments(): Appointment[] {
    if (this.filterStatus === 'all') return this.appointments;
    return this.appointments.filter(a => a.status === this.filterStatus);
  }

  // ─── Modal ───────────────────────────────────────────────
  editingApptId: number | null = null;

  openModal(): void {
    this.editingApptId = null;
    this.showModal = true;
    this.form.reset({ type: 'فحص عام', appointment_date: this.todayStr });
    this.errorMessage = '';
  }

  openEditModal(appt: Appointment): void {
    this.editingApptId = appt.id || null;
    this.showModal = true;
    this.errorMessage = '';
    this.form.patchValue({
      patient_id:       appt.patient_id,
      doctor_id:        appt.doctor_id || '',
      appointment_date: appt.appointment_date ? appt.appointment_date.split('T')[0] : '',
      appointment_time: appt.appointment_time ? appt.appointment_time.slice(0, 5) : '',
      type:             appt.type || 'فحص عام',
      notes:            appt.notes || ''
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.editingApptId = null;
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting = true;
    this.errorMessage = '';

    const payload = { ...this.form.value };
    if (!payload.doctor_id) payload.doctor_id = null;
    if (payload.notes) payload.notes = payload.notes.trim();

    const request$ = this.editingApptId
      ? this.apptService.update(this.editingApptId, payload)
      : this.apptService.create(payload);

    request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeModal();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.error || (this.editingApptId ? 'حدث خطأ أثناء تعديل الموعد' : 'حدث خطأ أثناء جدولة الموعد');
        this.cdr.detectChanges();
      }
    });
  }

  // ─── Actions ─────────────────────────────────────────────
  updateStatus(id: number, status: 'pending' | 'confirmed' | 'cancelled'): void {
    this.apptService.updateStatus(id, status).subscribe();
  }

  deleteAppointment(id: number): void {
    if (!confirm('هل أنت متأكد من إلغاء وحذف هذا الموعد نهائياً؟')) return;
    this.apptService.delete(id).subscribe();
  }

  retryLoad(): void { this.loadError = ''; this.isLoading = true; this.apptService.refresh(); }

  // ─── Helpers ─────────────────────────────────────────────
  getStatusClass(status: string): string {
    switch (status) {
      case 'confirmed': return 'bg-teal-500/10 text-teal-400 border border-teal-500/20';
      case 'pending':   return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'confirmed': return 'مؤكد';
      case 'pending':   return 'معلق';
      case 'cancelled': return 'ملغي';
      default: return '';
    }
  }

  getAvatarInitial(name: string | undefined): string {
    return name ? name.charAt(0) : 'م';
  }

  formatTime(t: string): string {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = +h;
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'م' : 'ص'}`;
  }
}
