import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface ClinicResult {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  specialty?: string;
  description?: string;
  working_hours?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  subscription_plan?: string;
  created_at?: string;
  distance?: number;
}

@Component({
  selector: 'app-find-doctor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './find-doctor.component.html',
  styleUrl: './find-doctor.component.scss'
})
export class FindDoctorComponent implements OnInit {
  clinics: ClinicResult[] = [];
  filteredClinics: ClinicResult[] = [];
  isLoading = true;
  error = '';

  searchQuery = '';
  selectedCity = '';
  selectedSpecialty = '';
  userLat: number | null = null;
  userLng: number | null = null;
  locationEnabled = false;
  locationLoading = false;
  locationError = '';

  specialties = [
    'طب عام', 'طب الأطفال', 'أمراض القلب', 'طب الأسنان',
    'طب العيون', 'الجلدية والتجميل', 'جراحة العظام',
    'أنف وأذن وحنجرة', 'أمراض الباطنة', 'طب الطوارئ',
    'النساء والولادة', 'طب المسالك البولية', 'أمراض الأعصاب'
  ];

  cities = ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'أبها', 'تبوك'];

  // ─── Booking Modal State ──────────────────────────────────────────────────
  showBookingModal = false;
  selectedClinicForBooking: ClinicResult | null = null;
  doctorsInClinic: any[] = [];
  bookedTimeSlots: string[] = [];

  availableTimeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
  ];

  minDate = new Date().toISOString().split('T')[0];

  bookingForm = {
    doctor_id: null as number | null,
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '',
    patient_name: '',
    patient_phone: '',
    patient_email: '',
    type: 'كشف جديد',
    notes: ''
  };

  bookingLoading = false;
  bookingError = '';
  bookingSuccess = false;
  bookingSuccessData: any = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.tryGetLocation();
    this.loadClinics();
  }

  tryGetLocation(): void {
    if ('geolocation' in navigator) {
      this.locationLoading = true;
      this.cdr.detectChanges();
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.userLat = pos.coords.latitude;
          this.userLng = pos.coords.longitude;
          this.locationEnabled = true;
          this.locationLoading = false;
          this.loadClinics(); // reload with distance
          this.cdr.detectChanges();
        },
        () => {
          this.locationLoading = false;
          this.locationError = 'تعذر الوصول إلى موقعك. يمكنك البحث يدوياً بالمدينة أو التخصص.';
          this.cdr.detectChanges();
        }
      );
    }
  }

  loadClinics(): void {
    this.isLoading = true;
    this.error = '';
    this.cdr.detectChanges();

    const params: Record<string, string> = {};
    if (this.searchQuery) params['search'] = this.searchQuery;
    if (this.selectedCity) params['city'] = this.selectedCity;
    if (this.selectedSpecialty) params['specialty'] = this.selectedSpecialty;
    if (this.userLat !== null) params['lat'] = this.userLat.toString();
    if (this.userLng !== null) params['lng'] = this.userLng.toString();

    this.http.get<ClinicResult[]>('http://localhost:5001/api/public/clinics', { params }).subscribe({
      next: (data) => {
        if (this.userLat !== null && this.userLng !== null) {
          data = data.map(c => ({
            ...c,
            distance: c.latitude && c.longitude
              ? this.calcDistance(this.userLat!, this.userLng!, c.latitude, c.longitude)
              : undefined
          }));
        }
        this.clinics = data;
        this.filteredClinics = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'تعذر تحميل قائمة العيادات. تأكد من اتصالك بالإنترنت.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearch(): void {
    this.loadClinics();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCity = '';
    this.selectedSpecialty = '';
    this.loadClinics();
  }

  calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a = Math.sin(dLat/2)**2 +
              Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
              Math.sin(dLng/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return parseFloat((R * c).toFixed(1));
  }

  deg2rad(deg: number): number { return deg * (Math.PI / 180); }

  getSpecialtyIcon(specialty?: string): string {
    const map: Record<string, string> = {
      'طب عام': '🏥', 'طب الأطفال': '👶', 'أمراض القلب': '❤️',
      'طب الأسنان': '🦷', 'طب العيون': '👁️', 'الجلدية والتجميل': '✨',
      'جراحة العظام': '🦴', 'أنف وأذن وحنجرة': '👂', 'أمراض الباطنة': '🩺',
      'طب الطوارئ': '🚑', 'النساء والولادة': '🤱', 'أمراض الأعصاب': '🧠'
    };
    return map[specialty || ''] || '🏨';
  }

  openWhatsApp(phone?: string, clinicName?: string): void {
    if (!phone) return;
    const msg = encodeURIComponent(`مرحباً، أود حجز موعد في ${clinicName || 'عيادتكم'}. هل يمكنكم المساعدة؟`);
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${msg}`, '_blank');
  }

  openInMaps(clinic: ClinicResult): void {
    if (clinic.latitude && clinic.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${clinic.latitude},${clinic.longitude}`, '_blank');
    } else if (clinic.address) {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(clinic.address)}`, '_blank');
    }
  }

  // ─── BOOKING MODAL LOGIC ──────────────────────────────────────────────────
  openBookingModal(clinic: ClinicResult): void {
    this.selectedClinicForBooking = clinic;
    this.bookingSuccess = false;
    this.bookingSuccessData = null;
    this.bookingError = '';
    this.bookingForm = {
      doctor_id: null,
      appointment_date: new Date().toISOString().split('T')[0],
      appointment_time: '',
      patient_name: '',
      patient_phone: '',
      patient_email: '',
      type: 'كشف أونلاين',
      notes: ''
    };
    this.showBookingModal = true;
    this.cdr.detectChanges();

    this.fetchBookingInfo();
  }

  closeBookingModal(): void {
    this.showBookingModal = false;
    this.selectedClinicForBooking = null;
    this.cdr.detectChanges();
  }

  isDayOff = false;
  dayOffNotice = '';

  fetchBookingInfo(): void {
    if (!this.selectedClinicForBooking) return;
    const clinicId = this.selectedClinicForBooking.id;
    const date = this.bookingForm.appointment_date;

    this.http.get<any>(`http://localhost:5001/api/public/clinics/${clinicId}/booking-info`, {
      params: { date }
    }).subscribe({
      next: (res) => {
        this.doctorsInClinic = res.doctors || [];
        this.bookedTimeSlots = (res.bookedSlots || []).map((b: any) => (b.appointment_time || '').slice(0, 5));

        if (res.availability) {
          this.generateTimeSlots(res.availability, date);
        }
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  generateTimeSlots(avail: any, dateStr: string): void {
    const dayCodes = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const d = new Date(dateStr + 'T00:00:00');
    const dayCode = dayCodes[d.getDay()];

    const workingDays: string[] = avail.working_days || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
    if (!workingDays.includes(dayCode)) {
      this.isDayOff = true;
      this.dayOffNotice = '⚠️ الطبيب / العيادة في إجازة في هذا اليوم. يرجى اختيار يوم آخر.';
      this.availableTimeSlots = [];
      return;
    }

    this.isDayOff = false;
    this.dayOffNotice = '';

    const startStr = avail.start_time || '09:00';
    const endStr = avail.end_time || '17:00';
    const step = parseInt(avail.slot_duration, 10) || 30;

    const [startH, startM] = startStr.split(':').map(Number);
    const [endH, endM] = endStr.split(':').map(Number);

    let currentMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    const slots: string[] = [];
    while (currentMins < endMins) {
      const h = Math.floor(currentMins / 60).toString().padStart(2, '0');
      const m = (currentMins % 60).toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
      currentMins += step;
    }

    this.availableTimeSlots = slots.length > 0 ? slots : ['09:00', '09:30', '10:00', '10:30', '11:00'];
  }

  onBookingDateChange(): void {
    this.bookingForm.appointment_time = '';
    this.fetchBookingInfo();
  }

  isSlotBooked(slot: string): boolean {
    return this.bookedTimeSlots.includes(slot);
  }

  selectTimeSlot(slot: string): void {
    if (this.isSlotBooked(slot)) return;
    this.bookingForm.appointment_time = slot;
    this.cdr.detectChanges();
  }

  submitBooking(): void {
    if (!this.selectedClinicForBooking) return;
    this.bookingError = '';

    if (!this.bookingForm.patient_name.trim()) {
      this.bookingError = 'يرجى كتابة الاسم الكامل';
      this.cdr.detectChanges();
      return;
    }

    if (!this.bookingForm.patient_phone.trim()) {
      this.bookingError = 'يرجى كتابة رقم الهاتف للتواصل والـ WhatsApp';
      this.cdr.detectChanges();
      return;
    }

    if (!this.bookingForm.appointment_date) {
      this.bookingError = 'يرجى اختيار تاريخ الموعد';
      this.cdr.detectChanges();
      return;
    }

    if (!this.bookingForm.appointment_time) {
      this.bookingError = 'يرجى اختيار التوقيت المناسب من القائمة';
      this.cdr.detectChanges();
      return;
    }

    this.bookingLoading = true;
    this.cdr.detectChanges();

    const payload = {
      clinic_id: this.selectedClinicForBooking.id,
      doctor_id: this.bookingForm.doctor_id,
      patient_name: this.bookingForm.patient_name,
      patient_phone: this.bookingForm.patient_phone,
      patient_email: this.bookingForm.patient_email,
      appointment_date: this.bookingForm.appointment_date,
      appointment_time: this.bookingForm.appointment_time,
      type: this.bookingForm.type,
      notes: this.bookingForm.notes
    };

    this.http.post<any>('http://localhost:5001/api/public/appointments', payload).subscribe({
      next: (res) => {
        this.bookingLoading = false;
        this.bookingSuccess = true;
        this.bookingSuccessData = res;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.bookingLoading = false;
        this.bookingError = err.error?.error || 'حدث خطأ أثناء إجراء الحجز، يرجى اختيار وقت آخر.';
        this.cdr.detectChanges();
      }
    });
  }

  readonly skeletons = Array(6).fill(0);
}
