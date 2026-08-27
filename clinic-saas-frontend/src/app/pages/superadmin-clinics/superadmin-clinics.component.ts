import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SuperAdminService, ClinicRow } from '../../services/super-admin.service';

@Component({
  selector: 'app-superadmin-clinics',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './superadmin-clinics.component.html',
  styleUrl: './superadmin-clinics.component.scss'
})
export class SuperadminClinicsComponent implements OnInit {
  clinics: ClinicRow[] = [];
  isLoading = true;
  error = '';

  // Filters
  searchQuery = '';
  filterPlan = 'all';
  filterStatus = 'all';

  // Action state
  actionLoading: number | null = null;
  successMsg = '';

  // ── Modal: Add Clinic ──
  showAddModal = false;
  addForm!: FormGroup;
  isAdding = false;
  addError = '';

  // ── Modal: Edit Clinic ──
  showEditModal = false;
  editForm!: FormGroup;
  editingClinicId: number | null = null;
  isEditing = false;
  editError = '';

  // ── Modal: Clinic Details Inspector ──
  showDetailsModal = false;
  selectedClinicDetails: any = null;
  isLoadingDetails = false;

  constructor(
    private sa: SuperAdminService,
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    this.loadClinics();
  }

  initForms(): void {
    this.addForm = this.fb.group({
      name: ['', Validators.required],
      owner_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      phone: [''],
      address: [''],
      subscription_plan: ['Basic']
    });

    this.editForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      address: [''],
      subscription_plan: ['Basic', Validators.required],
      subscription_status: ['Active', Validators.required],
      new_password: ['']
    });
  }

  loadClinics(): void {
    this.isLoading = true;
    this.error = '';
    this.cdr.detectChanges();
    this.sa.getClinics({
      search: this.searchQuery || undefined,
      plan: this.filterPlan !== 'all' ? this.filterPlan : undefined,
      status: this.filterStatus !== 'all' ? this.filterStatus : undefined
    }).subscribe({
      next: (data) => {
        this.clinics = data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.error || 'فشل تحميل العيادات';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearch(): void { this.loadClinics(); }
  clearFilters(): void {
    this.searchQuery = '';
    this.filterPlan = 'all';
    this.filterStatus = 'all';
    this.loadClinics();
  }

  // ── Create Clinic ─────────────────────────────────────────
  openAddModal(): void {
    this.addForm.reset({ subscription_plan: 'Basic' });
    this.addError = '';
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  submitAddClinic(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    this.isAdding = true;
    this.addError = '';
    this.cdr.detectChanges();

    this.sa.createClinic(this.addForm.value).subscribe({
      next: (res) => {
        this.isAdding = false;
        this.closeAddModal();
        this.showSuccess('تمت إضافة العيادة بنجاح!');
        this.loadClinics();
      },
      error: (err) => {
        this.isAdding = false;
        this.addError = err.error?.error || 'حدث خطأ أثناء إضافة العيادة';
        this.cdr.detectChanges();
      }
    });
  }

  // ── Edit Clinic ───────────────────────────────────────────
  openEditModal(clinic: ClinicRow): void {
    this.editingClinicId = clinic.id;
    this.editError = '';
    this.editForm.patchValue({
      name: clinic.name,
      email: clinic.email || '',
      phone: clinic.phone || '',
      address: clinic.address || '',
      subscription_plan: clinic.subscription_plan,
      subscription_status: clinic.subscription_status,
      new_password: ''
    });
    this.showEditModal = true;
    this.cdr.detectChanges();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingClinicId = null;
    this.cdr.detectChanges();
  }

  submitEditClinic(): void {
    if (this.editForm.invalid || !this.editingClinicId) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.isEditing = true;
    this.editError = '';
    this.cdr.detectChanges();

    this.sa.updateClinicFull(this.editingClinicId, this.editForm.value).subscribe({
      next: (res) => {
        this.isEditing = false;
        this.closeEditModal();
        this.showSuccess('تم تعديل بيانات العيادة بنجاح!');
        this.loadClinics();
      },
      error: (err) => {
        this.isEditing = false;
        this.editError = err.error?.error || 'حدث خطأ أثناء تعديل العيادة';
        this.cdr.detectChanges();
      }
    });
  }

  // ── View Clinic Details ───────────────────────────────────
  openDetailsModal(clinicId: number): void {
    this.showDetailsModal = true;
    this.isLoadingDetails = true;
    this.selectedClinicDetails = null;
    this.cdr.detectChanges();

    this.sa.getClinicDetails(clinicId).subscribe({
      next: (data) => {
        this.selectedClinicDetails = data;
        this.isLoadingDetails = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingDetails = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedClinicDetails = null;
    this.cdr.detectChanges();
  }

  // ── Impersonate / Login as Clinic ─────────────────────────
  loginAsClinic(clinic: ClinicRow): void {
    if (!confirm(`هل تريد الدخول المباشر إلى لوحة تحكم عيادة "${clinic.name}"؟`)) return;

    this.actionLoading = clinic.id;
    this.cdr.detectChanges();
    this.sa.impersonate(clinic.id).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.actionLoading = null;
        this.cdr.detectChanges();
        window.open('/dashboard/overview', '_blank');
      },
      error: (err) => {
        this.actionLoading = null;
        this.cdr.detectChanges();
        alert(err.error?.error || 'تعذر الدخول للعيادة');
      }
    });
  }

  // ── Toggle Status ─────────────────────────────────────────
  toggleStatus(clinic: ClinicRow): void {
    const action = clinic.subscription_status === 'Active' ? 'تعطيل' : 'تفعيل';
    if (!confirm(`هل أنت متأكد من ${action} عيادة "${clinic.name}"؟`)) return;

    this.actionLoading = clinic.id;
    this.cdr.detectChanges();
    this.sa.toggleStatus(clinic.id).subscribe({
      next: (res) => {
        const idx = this.clinics.findIndex(c => c.id === clinic.id);
        if (idx !== -1) this.clinics[idx].subscription_status = res.clinic.subscription_status;
        this.actionLoading = null;
        this.showSuccess(res.message);
        this.cdr.detectChanges();
      },
      error: () => {
        this.actionLoading = null;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Delete Clinic ─────────────────────────────────────────
  deleteClinic(clinic: ClinicRow): void {
    if (!confirm(`⚠️ تحذير: سيتم حذف عيادة "${clinic.name}" مع جميع مرضاها ومواعيدها وأطبائها نهائياً!\nهل أنت متأكد؟`)) return;

    this.actionLoading = clinic.id;
    this.cdr.detectChanges();
    this.sa.deleteClinic(clinic.id).subscribe({
      next: (res) => {
        this.clinics = this.clinics.filter(c => c.id !== clinic.id);
        this.actionLoading = null;
        this.showSuccess(res.message);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.actionLoading = null;
        this.error = err.error?.error || 'فشل حذف العيادة';
        this.cdr.detectChanges();
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────
  getPlanBadge(plan: string): string {
    switch (plan) {
      case 'Pro': return 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
      case 'Enterprise': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  }

  getStatusBadge(status: string): string {
    return status === 'Active'
      ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
      : 'bg-red-500/10 text-red-400 border border-red-500/20';
  }

  private showSuccess(msg: string): void {
    this.successMsg = msg;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.successMsg = '';
      this.cdr.detectChanges();
    }, 4000);
  }

  readonly skeletons = Array(5).fill(0);
}
