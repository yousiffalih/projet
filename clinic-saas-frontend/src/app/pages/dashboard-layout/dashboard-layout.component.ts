import { Component, signal, OnInit } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard-layout.component.html',
  styleUrl: './dashboard-layout.component.scss'
})
export class DashboardLayoutComponent implements OnInit {
  user: ReturnType<AuthService['getUser']> = null;
  sidebarOpen = signal(true);

  navItems = [
    { label: 'لوحة التحكم',   icon: 'dashboard',     route: '/dashboard/overview' },
    { label: 'المرضى',         icon: 'patients',      route: '/dashboard/patients' },
    { label: 'المواعيد',       icon: 'calendar',      route: '/dashboard/appointments' },
    { label: 'الوصفات الطبية', icon: 'prescriptions', route: '/dashboard/prescriptions' },
    { label: 'الأطباء',        icon: 'doctors',       route: '/dashboard/doctors' },
    { label: 'التقارير',       icon: 'reports',       route: '/dashboard/reports' },
    { label: 'الإعدادات',      icon: 'settings',      route: '/dashboard/settings' },
  ];

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
  }

  toggleSidebar(): void { this.sidebarOpen.set(!this.sidebarOpen()); }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
