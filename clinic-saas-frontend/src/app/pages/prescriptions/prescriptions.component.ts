import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { PrescriptionService, Prescription, MedicineItem } from '../../services/prescription.service';
import { PatientService, Patient } from '../../services/patient.service';
import { AppointmentService, Doctor } from '../../services/appointment.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-prescriptions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './prescriptions.component.html',
  styleUrl: './prescriptions.component.scss'
})
export class PrescriptionsComponent implements OnInit {
  prescriptions: Prescription[] = [];
  patients: Patient[] = [];
  doctors: Doctor[] = [];
  user: any = null;

  isLoading = true;
  error = '';
  searchQuery = '';
  successMsg = '';

  // ── Modal State: Create/Edit ──
  showFormModal = false;
  isEditing = false;
  editingId: number | null = null;
  rxForm!: FormGroup;
  isSubmitting = false;
  formError = '';

  // ── Modal State: View & Print ──
  showPrintModal = false;
  selectedRx: Prescription | null = null;

  constructor(
    private rxService: PrescriptionService,
    private patientService: PatientService,
    private apptService: AppointmentService,
    private authService: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.loadPrescriptions();
    this.loadDropdowns();
  }

  initForm(): void {
    this.rxForm = this.fb.group({
      patient_id: ['', Validators.required],
      doctor_id: [''],
      diagnosis: ['', Validators.required],
      notes: [''],
      medicines: this.fb.array([])
    });
    this.addMedicineRow(); // default 1 row
  }

  get medicines(): FormArray {
    return this.rxForm.get('medicines') as FormArray;
  }

  createMedicineRow(med?: Partial<MedicineItem>): FormGroup {
    return this.fb.group({
      name: [med?.name || '', Validators.required],
      dosage: [med?.dosage || '', Validators.required],
      frequency: [med?.frequency || '3 مرات يومياً بعد الأكل', Validators.required],
      duration: [med?.duration || '7 أيام', Validators.required],
      instructions: [med?.instructions || '']
    });
  }

  addMedicineRow(med?: Partial<MedicineItem>): void {
    this.medicines.push(this.createMedicineRow(med));
    this.cdr.detectChanges();
  }

  removeMedicineRow(index: number): void {
    if (this.medicines.length > 1) {
      this.medicines.removeAt(index);
      this.cdr.detectChanges();
    }
  }

  loadPrescriptions(): void {
    this.isLoading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.rxService.getAll({ search: this.searchQuery || undefined }).subscribe({
      next: (data) => {
        this.prescriptions = data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.error || 'فشل تحميل الوصفات الطبية';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadDropdowns(): void {
    this.patientService.patients$.subscribe(data => {
      this.patients = data || [];
      this.cdr.detectChanges();
    });
    this.patientService.load();

    this.apptService.getDoctors().subscribe({
      next: (d) => {
        this.doctors = d || [];
        this.cdr.detectChanges();
      },
      error: () => this.doctors = []
    });
  }

  onSearch(): void {
    this.loadPrescriptions();
  }

  // ── Open Create Modal ──
  openCreateModal(preselectedPatientId?: number): void {
    this.isEditing = false;
    this.editingId = null;
    this.formError = '';
    this.rxForm.reset({
      patient_id: preselectedPatientId || '',
      doctor_id: this.user?.id || '',
      diagnosis: '',
      notes: ''
    });
    this.medicines.clear();
    this.addMedicineRow();
    this.showFormModal = true;
    this.cdr.detectChanges();
  }

  // ── Open Edit Modal ──
  openEditModal(rx: Prescription): void {
    this.isEditing = true;
    this.editingId = rx.id;
    this.formError = '';
    this.rxForm.patchValue({
      patient_id: rx.patient_id,
      doctor_id: rx.doctor_id || '',
      diagnosis: rx.diagnosis,
      notes: rx.notes || ''
    });
    this.medicines.clear();
    if (rx.medicines && rx.medicines.length > 0) {
      rx.medicines.forEach(m => this.addMedicineRow(m));
    } else {
      this.addMedicineRow();
    }
    this.showFormModal = true;
    this.cdr.detectChanges();
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.editingId = null;
    this.cdr.detectChanges();
  }

  // ── Submit Prescription ──
  submitForm(): void {
    if (this.rxForm.invalid) {
      this.rxForm.markAllAsTouched();
      this.cdr.detectChanges();
      return;
    }

    this.isSubmitting = true;
    this.formError = '';
    this.cdr.detectChanges();

    const formVal = this.rxForm.value;

    if (this.isEditing && this.editingId) {
      this.rxService.update(this.editingId, {
        doctor_id: formVal.doctor_id || null,
        diagnosis: formVal.diagnosis,
        medicines: formVal.medicines,
        notes: formVal.notes
      }).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.closeFormModal();
          this.showSuccess('تم تحديث الوصفة الطبية بنجاح');
          this.loadPrescriptions();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.formError = err.error?.error || 'حدث خطأ أثناء حفظ التعديلات';
          this.cdr.detectChanges();
        }
      });
    } else {
      this.rxService.create({
        patient_id: formVal.patient_id,
        doctor_id: formVal.doctor_id || null,
        diagnosis: formVal.diagnosis,
        medicines: formVal.medicines,
        notes: formVal.notes
      }).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.closeFormModal();
          this.showSuccess('تم إنشاء الوصفة الطبية بنجاح');
          this.loadPrescriptions();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.formError = err.error?.error || 'حدث خطأ أثناء حفظ الوصفة';
          this.cdr.detectChanges();
        }
      });
    }
  }

  // ── Print Modal ──
  openPrintModal(rx: Prescription): void {
    this.rxService.getById(rx.id).subscribe({
      next: (fullRx) => {
        this.selectedRx = fullRx;
        this.showPrintModal = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.selectedRx = rx;
        this.showPrintModal = true;
        this.cdr.detectChanges();
      }
    });
  }

  closePrintModal(): void {
    this.showPrintModal = false;
    this.selectedRx = null;
    this.cdr.detectChanges();
  }

  printPrescription(): void {
    window.print();
  }

  // ── Delete ──
  deleteRx(rx: Prescription): void {
    if (!confirm(`هل أنت متأكد من حذف هذه الوصفة الطبية للمريض "${rx.patient_name}"؟`)) return;

    this.rxService.delete(rx.id).subscribe({
      next: () => {
        this.prescriptions = this.prescriptions.filter(p => p.id !== rx.id);
        this.showSuccess('تم حذف الوصفة الطبية بنجاح');
        this.cdr.detectChanges();
      },
      error: (err) => {
        alert(err.error?.error || 'فشل حذف الوصفة');
      }
    });
  }

  private showSuccess(msg: string): void {
    this.successMsg = msg;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.successMsg = '';
      this.cdr.detectChanges();
    }, 4000);
  }

  readonly skeletons = Array(4).fill(0);
}
