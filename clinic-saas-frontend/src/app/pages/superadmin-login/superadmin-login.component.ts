import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SuperAdminService } from '../../services/super-admin.service';

@Component({
  selector: 'app-superadmin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './superadmin-login.component.html',
  styleUrl: './superadmin-login.component.scss'
})
export class SuperadminLoginComponent {
  form: FormGroup;
  isLoading = false;
  errorMsg  = '';
  showPass  = false;

  constructor(
    private fb: FormBuilder,
    private sa: SuperAdminService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isLoading = true;
    this.errorMsg  = '';

    const { email, password } = this.form.value;
    this.sa.login(email!, password!).subscribe({
      next: (res) => {
        this.sa.saveSession(res.token, res.user);
        this.router.navigate(['/superadmin/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg  = err.error?.error || 'بيانات الدخول غير صحيحة';
      }
    });
  }
}
