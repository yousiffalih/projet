import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { DashboardLayoutComponent } from './pages/dashboard-layout/dashboard-layout.component';
import { OverviewComponent } from './pages/overview/overview.component';
import { PatientsComponent } from './pages/patients/patients.component';
import { AppointmentsComponent } from './pages/appointments/appointments.component';
import { DoctorsComponent } from './pages/doctors/doctors.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { authGuard, guestGuard } from './guards/auth.guard';

// Super Admin
import { SuperadminLoginComponent } from './pages/superadmin-login/superadmin-login.component';
import { SuperadminLayoutComponent } from './pages/superadmin-layout/superadmin-layout.component';
import { SuperadminDashboardComponent } from './pages/superadmin-dashboard/superadmin-dashboard.component';
import { SuperadminClinicsComponent } from './pages/superadmin-clinics/superadmin-clinics.component';
import { superAdminGuard, superAdminGuestGuard } from './guards/super-admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  
  // جميع صفحات لوحة التحكم داخل الهيكل المشترك (Layout)
  {
    path: 'dashboard',
    component: DashboardLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: OverviewComponent },
      { path: 'patients', component: PatientsComponent },
      { path: 'appointments', component: AppointmentsComponent },
      { path: 'doctors', component: DoctorsComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'settings', component: SettingsComponent }
    ]
  },

  // ── Super Admin ──────────────────────────────────────────────────────────
  { path: 'superadmin/login', component: SuperadminLoginComponent, canActivate: [superAdminGuestGuard] },
  {
    path: 'superadmin',
    component: SuperadminLayoutComponent,
    canActivate: [superAdminGuard],
    children: [
      { path: '', redirectTo: 'clinics', pathMatch: 'full' },
      { path: 'dashboard', component: SuperadminDashboardComponent },
      { path: 'clinics',   component: SuperadminClinicsComponent   },
    ]
  },

  { path: '**', redirectTo: 'login' }
];

