import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  selectedPlan = 'Basic';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.registerForm = this.fb.group({
      clinic_name: ['', [Validators.required, Validators.minLength(3)]],
      full_name:   ['', [Validators.required, Validators.minLength(3)]],
      email:       ['', [Validators.required, Validators.email]],
      password:    ['', [Validators.required, Validators.minLength(6)]],
      phone:       [''],
      address:     [''],
      subscription_plan: ['Basic']
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const plan = params['plan'];
      if (['Basic', 'Pro', 'Enterprise'].includes(plan)) {
        this.selectedPlan = plan;
        this.registerForm.patchValue({ subscription_plan: plan });
        this.cdr.detectChanges();
      }
    });
  }

  get clinic_name() { return this.registerForm.get('clinic_name')!; }
  get full_name()   { return this.registerForm.get('full_name')!; }
  get email()       { return this.registerForm.get('email')!; }
  get password()    { return this.registerForm.get('password')!; }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.authService.registerClinic(this.registerForm.value).subscribe({
      next: (res) => {
        this.authService.saveSession(res.token, res.user);
        this.isLoading = false;
        this.cdr.detectChanges();
        this.router.navigate(['/dashboard/overview']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'حدث خطأ أثناء إنشاء حساب العيادة. يرجى المحاولة مرة أخرى.';
        this.cdr.detectChanges();
      }
    });
  }
}
