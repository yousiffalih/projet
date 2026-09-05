import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { PatientService, Patient } from '../../services/patient.service';
import { PrescriptionService, Prescription } from '../../services/prescription.service';
import { AppointmentService } from '../../services/appointment.service';

interface Appointment {
  id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  doctor_name?: string;
  notes?: string;
  type?: string;
}

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patient-profile.component.html',
  styleUrl: './patient-profile.component.scss'
})
export class PatientProfileComponent implements OnInit {
  patient: Patient | null = null;
  prescriptions: Prescription[] = [];
  appointments: Appointment[] = [];

  isLoading = true;
  activeTab: 'info' | 'prescriptions' | 'appointments' | 'history' = 'info';
  error = '';
  successMsg = '';

  // Edit mode
  isEditing = false;
  editData: Partial<Patient> = {};
  isSaving = false;

  // Print selected Rx
  selectedRx: Prescription | null = null;
  showPrintModal = false;

  patientId = 0;

  constructor(
    private route: ActivatedRoute,
    private patientService: PatientService,
    private rxService: PrescriptionService,
    private apptService: AppointmentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.patientId = +params['id'];
      this.loadPatient();
    });
  }

  loadPatient(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    this.patientService.getById(this.patientId).subscribe({
      next: (p) => {
        this.patient = p;
        this.loadPrescriptions();
        this.loadAppointments();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'لم يتم العثور على المريض';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadPrescriptions(): void {
    this.rxService.getAll({ patient_id: this.patientId }).subscribe({
      next: (data) => {
        this.prescriptions = data;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  loadAppointments(): void {
    this.apptService.getAll({ patient_id: this.patientId }).subscribe({
      next: (data: any[]) => {
        this.appointments = data;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  setTab(tab: 'info' | 'prescriptions' | 'appointments' | 'history'): void {
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  startEdit(): void {
    if (!this.patient) return;
    this.editData = { ...this.patient };
    this.isEditing = true;
    this.cdr.detectChanges();
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editData = {};
    this.cdr.detectChanges();
  }

  saveEdit(): void {
    if (!this.patient) return;
    this.isSaving = true;
    this.cdr.detectChanges();

    this.patientService.update(this.patient.id!, this.editData as Patient).subscribe({
      next: (res: any) => {
        this.patient = res.patient || { ...this.patient, ...this.editData };
        this.isEditing = false;
        this.isSaving = false;
        this.showSuccess('تم تحديث بيانات المريض بنجاح');
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.error = err.error?.error || 'فشل حفظ التعديلات';
        this.cdr.detectChanges();
      }
    });
  }

  openRxPrint(rx: Prescription): void {
    this.selectedRx = rx;
    this.showPrintModal = true;
    this.cdr.detectChanges();
  }

  closePrintModal(): void {
    this.showPrintModal = false;
    this.selectedRx = null;
    this.cdr.detectChanges();
  }

  printRx(): void { window.print(); }

  getStatusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'confirmed') return 'bg-teal-500/10 text-teal-400 border border-teal-500/20';
    if (s === 'cancelled') return 'bg-red-500/10 text-red-400 border border-red-500/20';
    return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = { confirmed: 'مؤكد', cancelled: 'ملغي', pending: 'معلق' };
    return map[status] || status;
  }

  getAge(dob?: string): string {
    if (!dob) return '—';
    const age = new Date().getFullYear() - new Date(dob).getFullYear();
    return `${age} سنة`;
  }

  getGenderLabel(g?: string): string {
    if (g === 'male') return '🧑 ذكر';
    if (g === 'female') return '👩 أنثى';
    return '—';
  }

  private showSuccess(msg: string): void {
    this.successMsg = msg;
    this.cdr.detectChanges();
    setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 4000);
  }

  readonly skeletonRows = Array(4).fill(0);
}
