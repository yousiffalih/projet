import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PatientService, Patient } from '../../services/patient.service';

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './patients.component.html',
  styleUrl: './patients.component.scss'
})
export class PatientsComponent implements OnInit, OnDestroy {
  patients: Patient[] = [];
  isLoading = true;
  showModal = false;
  isSubmitting = false;
  searchQuery = '';
  errorMessage = '';
  loadError = '';
  selectedPatient: Patient | null = null;

  /** بطاقات skeleton أثناء التحميل */
  readonly skeletons = Array(6).fill(0);

  form: FormGroup;
  private sub?: Subscription;

  constructor(
    private patientService: PatientService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      full_name:       ['', Validators.required],
      email:           ['', Validators.email],
      phone:           [''],
      date_of_birth:   [''],
      gender:          [''],
      address:         [''],
      medical_history: ['']
    });
  }

  ngOnInit(): void {
    // إذا كانت البيانات محمّلة مسبقاً → تظهر فوراً
    if (this.patientService.isLoaded) {
      this.isLoading = false;
    }

    // الاشتراك في الـ cache stream
    this.sub = this.patientService.patients$.subscribe({
      next: (data) => {
        this.patients = data;
        if (this.patientService.isLoaded) {
          this.isLoading = false;
        }
        this.loadError = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.loadError = err?.error?.error || 'فشل تحميل بيانات المرضى، تحقق من الاتصال.';
        this.cdr.detectChanges();
      }
    });

    // تشغيل التحميل الفوري
    this.patientService.load();
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  get filteredPatients(): Patient[] {
    if (!this.searchQuery) return this.patients;
    const q = this.searchQuery.toLowerCase();
    return this.patients.filter(p =>
      p.full_name.toLowerCase().includes(q) ||
      (p.phone || '').includes(q) ||
      (p.email || '').toLowerCase().includes(q)
    );
  }

  editingPatientId: number | null = null;

  openModal(): void  {
    this.editingPatientId = null;
    this.showModal = true;
    this.form.reset();
    this.errorMessage = '';
  }

  openEditModal(patient: Patient): void {
    this.editingPatientId = patient.id || null;
    this.showModal = true;
    this.errorMessage = '';
    this.form.patchValue({
      full_name:       patient.full_name       || '',
      email:           patient.email           || '',
      phone:           patient.phone           || '',
      date_of_birth:   patient.date_of_birth ? patient.date_of_birth.split('T')[0] : '',
      gender:          patient.gender          || '',
      address:         patient.address         || '',
      medical_history: patient.medical_history || ''
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.editingPatientId = null;
  }

  openDetailModal(patient: Patient): void  { this.selectedPatient = patient; }
  closeDetailModal(): void { this.selectedPatient = null; }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSubmitting = true;
    this.errorMessage = '';

    const payload = { ...this.form.value };
    Object.keys(payload).forEach(key => {
      if (typeof payload[key] === 'string') {
        payload[key] = payload[key].trim();
      }
    });

    const request$ = this.editingPatientId
      ? this.patientService.update(this.editingPatientId, payload)
      : this.patientService.create(payload);

    request$.subscribe({
      next: (res) => {
        this.isSubmitting = false;
        if (this.selectedPatient && this.editingPatientId && res.patient) {
          this.selectedPatient = res.patient;
        }
        this.closeModal();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.error || (this.editingPatientId ? 'حدث خطأ أثناء تعديل بيانات المريض' : 'حدث خطأ أثناء إضافة المريض');
        this.cdr.detectChanges();
      }
    });
  }

  deletePatient(id: number): void {
    if (!confirm('هل أنت متأكد من حذف هذا المريض؟')) return;
    // الحذف فوري من الـ UI ثم يُرسَل للخادم
    this.patientService.delete(id).subscribe();
  }

  retryLoad(): void {
    this.loadError = '';
    this.isLoading = true;
    this.patientService.refresh();
  }

  getAvatarColor(name: string | undefined | null): string {
    if (!name) return 'from-slate-400 to-slate-500';
    const colors = ['from-blue-400 to-teal-400', 'from-violet-400 to-pink-400',
                    'from-amber-400 to-orange-400', 'from-teal-400 to-green-400'];
    return colors[name.charCodeAt(0) % colors.length];
  }

  getGenderLabel(g: string | undefined | null): string {
    if (!g) return '-';
    return g === 'male' ? 'ذكر' : g === 'female' ? 'أنثى' : '-';
  }

  onSearch(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }
}
