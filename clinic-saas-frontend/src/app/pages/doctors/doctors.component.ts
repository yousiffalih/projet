import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DoctorService, Doctor } from '../../services/doctor.service';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './doctors.component.html',
  styleUrl: './doctors.component.scss'
})
export class DoctorsComponent implements OnInit, OnDestroy {
  doctors: Doctor[] = [];
  isLoading = true;
  loadError = '';
  showModal = false;
  isSubmitting = false;
  searchQuery = '';
  errorMessage = '';
  showPassword = false;

  readonly skeletons = Array(4).fill(0);
  form: FormGroup;
  private sub?: Subscription;

  constructor(
    private doctorService: DoctorService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      full_name: ['', Validators.required],
      email:     ['', [Validators.required, Validators.email]],
      password:  ['', [Validators.required, Validators.minLength(6)]],
      specialty: ['طبيب عام', Validators.required],
      phone:     ['']
    });
  }

  ngOnInit(): void {
    if (this.doctorService.isLoaded) {
      this.isLoading = false;
    }

    this.sub = this.doctorService.doctors$.subscribe({
      next: (data) => {
        this.doctors = data;
        if (this.doctorService.isLoaded) {
          this.isLoading = false;
        }
        this.loadError = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.loadError = err?.error?.error || 'فشل تحميل بيانات الأطباء، تحقق من الاتصال.';
        this.cdr.detectChanges();
      }
    });

    this.doctorService.load();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get filteredDoctors(): Doctor[] {
    if (!this.searchQuery) return this.doctors;
    const q = this.searchQuery.toLowerCase();
    return this.doctors.filter(d =>
      d.full_name.toLowerCase().includes(q) ||
      (d.specialty || '').toLowerCase().includes(q) ||
      (d.email || '').toLowerCase().includes(q) ||
      (d.phone || '').includes(q)
    );
  }

  get totalAppointments(): number {
    return this.doctors.reduce((acc, curr) => acc + (curr.appointment_count || 0), 0);
  }

  get specialtiesCount(): number {
    const specs = new Set(this.doctors.map(d => d.specialty || 'طبيب عام'));
    return specs.size;
  }

  openModal(): void {
    this.showModal = true;
    this.form.reset({ specialty: 'طبيب عام' });
    this.errorMessage = '';
    this.showPassword = false;
  }

  closeModal(): void {
    this.showModal = false;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.errorMessage = '';

    const payload = { ...this.form.value };
    Object.keys(payload).forEach(key => {
      if (typeof payload[key] === 'string') {
        payload[key] = payload[key].trim();
      }
    });

    this.doctorService.create(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.closeModal();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.error || 'حدث خطأ أثناء إضافة الطبيب';
        this.cdr.detectChanges();
      }
    });
  }

  deleteDoctor(id: number): void {
    if (!confirm('هل أنت متأكد من حذف هذا الطبيب من العيادة؟')) return;
    this.doctorService.delete(id).subscribe({
      next: () => this.cdr.detectChanges()
    });
  }

  retryLoad(): void {
    this.loadError = '';
    this.isLoading = true;
    this.doctorService.refresh();
  }

  getAvatarColor(name: string | undefined): string {
    if (!name) return 'from-teal-400 to-blue-500';
    const colors = [
      'from-teal-400 to-emerald-500',
      'from-blue-400 to-indigo-500',
      'from-purple-400 to-violet-500',
      'from-cyan-400 to-blue-600'
    ];
    return colors[name.charCodeAt(0) % colors.length];
  }

  onSearch(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
  }
}
