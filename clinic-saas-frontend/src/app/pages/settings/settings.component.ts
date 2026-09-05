import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SettingsService, ClinicInfo, UserProfile, AvailabilityConfig } from '../../services/settings.service';

type ActiveTab = 'clinic' | 'profile' | 'password' | 'availability';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit, OnDestroy {

  activeTab: ActiveTab = 'clinic';

  // ─── State ──────────────────────────────────────────────────────────
  isLoadingClinic  = true;
  isLoadingProfile = true;
  isLoadingAvailability = true;

  isSavingClinic   = false;
  isSavingProfile  = false;
  isSavingPassword = false;
  isSavingAvailability = false;

  clinicError   = '';
  profileError  = '';
  passwordError = '';
  availabilityError = '';

  clinicSuccess   = '';
  profileSuccess  = '';
  passwordSuccess = '';
  availabilitySuccess = '';

  clinic:  ClinicInfo  | null = null;
  profile: UserProfile | null = null;

  availabilityConfig: AvailabilityConfig = {
    working_days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
    start_time: '09:00',
    end_time: '17:00',
    slot_duration: 30
  };

  weekDays = [
    { code: 'Sun', label: 'الأحد' },
    { code: 'Mon', label: 'الإثنين' },
    { code: 'Tue', label: 'الثلاثاء' },
    { code: 'Wed', label: 'الأربعاء' },
    { code: 'Thu', label: 'الخميس' },
    { code: 'Fri', label: 'الجمعة' },
    { code: 'Sat', label: 'السبت' }
  ];

  showCurrentPassword = false;
  showNewPassword     = false;
  showConfirmPassword = false;

  // ─── Forms ──────────────────────────────────────────────────────────
  clinicForm:   FormGroup;
  profileForm:  FormGroup;
  passwordForm: FormGroup;

  private subs: Subscription[] = [];

  constructor(
    private settingsService: SettingsService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.clinicForm = this.fb.group({
      name:    ['', Validators.required],
      address: [''],
      phone:   [''],
      email:   ['', Validators.email]
    });

    this.profileForm = this.fb.group({
      full_name: ['', Validators.required],
      phone:     ['']
    });

    this.passwordForm = this.fb.group({
      current_password: ['', Validators.required],
      new_password:     ['', [Validators.required, Validators.minLength(6)]],
      confirm_password: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.loadClinic();
    this.loadProfile();
    this.loadAvailability();
  }

  loadAvailability(): void {
    this.isLoadingAvailability = true;
    const sub = this.settingsService.getAvailability().subscribe({
      next: (data) => {
        if (data) {
          this.availabilityConfig = {
            working_days: data.working_days || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
            start_time: data.start_time || '09:00',
            end_time: data.end_time || '17:00',
            slot_duration: data.slot_duration || 30
          };
        }
        this.isLoadingAvailability = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingAvailability = false;
        this.cdr.detectChanges();
      }
    });
    this.subs.push(sub);
  }

  isDayWorking(code: string): boolean {
    return this.availabilityConfig.working_days.includes(code);
  }

  toggleWorkingDay(code: string): void {
    const days = [...this.availabilityConfig.working_days];
    const idx = days.indexOf(code);
    if (idx > -1) {
      days.splice(idx, 1);
    } else {
      days.push(code);
    }
    this.availabilityConfig.working_days = days;
    this.cdr.detectChanges();
  }

  saveAvailability(): void {
    this.isSavingAvailability = true;
    this.availabilityError = '';
    this.availabilitySuccess = '';
    this.cdr.detectChanges();

    const sub = this.settingsService.updateAvailability(this.availabilityConfig).subscribe({
      next: (res) => {
        this.isSavingAvailability = false;
        this.availabilitySuccess = res.message || 'تم حفظ أوقات العمل بنجاح';
        this.cdr.detectChanges();
        setTimeout(() => { this.availabilitySuccess = ''; this.cdr.detectChanges(); }, 4000);
      },
      error: (err) => {
        this.isSavingAvailability = false;
        this.availabilityError = err.error?.error || 'فشل حفظ أوقات العمل';
        this.cdr.detectChanges();
      }
    });
    this.subs.push(sub);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ─── Tab ────────────────────────────────────────────────────────────
  setTab(tab: ActiveTab): void {
    this.activeTab = tab;
    this.clearMessages();
  }

  clearMessages(): void {
    this.clinicError = this.clinicSuccess = '';
    this.profileError = this.profileSuccess = '';
    this.passwordError = this.passwordSuccess = '';
  }

  // ─── Clinic ─────────────────────────────────────────────────────────
  loadClinic(): void {
    this.isLoadingClinic = true;
    const sub = this.settingsService.getClinic().subscribe({
      next: (data) => {
        this.clinic = data;
        this.clinicForm.patchValue({
          name:    data.name    || '',
          address: data.address || '',
          phone:   data.phone   || '',
          email:   data.email   || ''
        });
        this.isLoadingClinic = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.clinicError = 'فشل تحميل بيانات العيادة';
        this.isLoadingClinic = false;
        this.cdr.detectChanges();
      }
    });
    this.subs.push(sub);
  }

  saveClinic(): void {
    if (this.clinicForm.invalid || this.isSavingClinic) return;
    this.isSavingClinic  = true;
    this.clinicError     = '';
    this.clinicSuccess   = '';

    const sub = this.settingsService.updateClinic(this.clinicForm.value).subscribe({
      next: (res) => {
        this.clinic = res.clinic;
        this.clinicSuccess  = res.message;
        this.isSavingClinic = false;
        this.cdr.detectChanges();
        setTimeout(() => (this.clinicSuccess = ''), 4000);
      },
      error: (err) => {
        this.clinicError    = err?.error?.error || 'فشل حفظ بيانات العيادة';
        this.isSavingClinic = false;
        this.cdr.detectChanges();
      }
    });
    this.subs.push(sub);
  }

  // ─── Profile ────────────────────────────────────────────────────────
  loadProfile(): void {
    this.isLoadingProfile = true;
    const sub = this.settingsService.getProfile().subscribe({
      next: (data) => {
        this.profile = data;
        this.profileForm.patchValue({
          full_name: data.full_name || '',
          phone:     data.phone     || ''
        });
        this.isLoadingProfile = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.profileError     = 'فشل تحميل بيانات الملف الشخصي';
        this.isLoadingProfile = false;
        this.cdr.detectChanges();
      }
    });
    this.subs.push(sub);
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.isSavingProfile) return;
    this.isSavingProfile  = true;
    this.profileError     = '';
    this.profileSuccess   = '';

    const sub = this.settingsService.updateProfile(this.profileForm.value).subscribe({
      next: (res) => {
        this.profile = res.user;
        this.profileSuccess  = res.message;
        this.isSavingProfile = false;
        setTimeout(() => (this.profileSuccess = ''), 4000);
      },
      error: (err) => {
        this.profileError    = err?.error?.error || 'فشل حفظ الملف الشخصي';
        this.isSavingProfile = false;
      }
    });
    this.subs.push(sub);
  }

  // ─── Password ───────────────────────────────────────────────────────
  savePassword(): void {
    if (this.passwordForm.invalid || this.isSavingPassword) return;
    this.isSavingPassword  = true;
    this.passwordError     = '';
    this.passwordSuccess   = '';

    const { current_password, new_password } = this.passwordForm.value;
    const sub = this.settingsService.changePassword({ current_password, new_password }).subscribe({
      next: (res) => {
        this.passwordSuccess  = res.message;
        this.isSavingPassword = false;
        this.passwordForm.reset();
        setTimeout(() => (this.passwordSuccess = ''), 5000);
      },
      error: (err) => {
        this.passwordError    = err?.error?.error || 'فشل تغيير كلمة المرور';
        this.isSavingPassword = false;
      }
    });
    this.subs.push(sub);
  }

  // ─── Helpers ────────────────────────────────────────────────────────
  passwordMatchValidator(group: AbstractControl) {
    const newPwd     = group.get('new_password')?.value;
    const confirmPwd = group.get('confirm_password')?.value;
    return newPwd === confirmPwd ? null : { mismatch: true };
  }

  getPlanBadgeClass(plan: string): string {
    const p = (plan || '').toLowerCase();
    if (p === 'premium') return 'badge-premium';
    if (p === 'pro')     return 'badge-pro';
    return 'badge-basic';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ar-SA', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }
}
