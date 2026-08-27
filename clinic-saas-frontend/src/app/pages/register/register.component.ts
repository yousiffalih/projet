import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      clinic_name: ['', [Validators.required, Validators.minLength(3)]],
      full_name:   ['', [Validators.required, Validators.minLength(3)]],
      email:       ['', [Validators.required, Validators.email]],
      password:    ['', [Validators.required, Validators.minLength(6)]],
      phone:       [''],
      address:     ['']
    });
  }

  get clinic_name() { return this.registerForm.get('clinic_name')!; }
  get full_name()   { return this.registerForm.get('full_name')!; }
  get email()       { return this.registerForm.get('email')!; }
  get password()    { return this.registerForm.get('password')!; }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.registerClinic(this.registerForm.value).subscribe({
      next: (res) => {
        this.authService.saveSession(res.token, res.user);
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;
        this.errorMessage = err.error?.error || 'حدث خطأ أثناء إنشاء حساب العيادة. يرجى المحاولة مرة أخرى.';
      }
    });
  }
}
