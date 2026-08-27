import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SuperAdminService, SuperAdminUser } from '../../services/super-admin.service';

@Component({
  selector: 'app-superadmin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './superadmin-layout.component.html',
  styleUrl: './superadmin-layout.component.scss'
})
export class SuperadminLayoutComponent implements OnInit {
  user: SuperAdminUser | null = null;
  sidebarOpen = signal(true);
  currentTime = new Date();

  navItems = [
    { label: 'لوحة التحكم', icon: 'dashboard', route: '/superadmin/dashboard' },
    { label: 'إدارة العيادات', icon: 'clinics',   route: '/superadmin/clinics'  },
  ];

  constructor(private sa: SuperAdminService, private router: Router) {}

  ngOnInit(): void {
    this.user = this.sa.getUser();
    setInterval(() => this.currentTime = new Date(), 60000);
  }

  toggleSidebar(): void { this.sidebarOpen.set(!this.sidebarOpen()); }

  logout(): void {
    this.sa.logout();
    this.router.navigate(['/superadmin/login']);
  }
}
