import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent {
  isAnnual = false;
  openFaqIndex: number | null = 0;
  activeFeatureTab = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  toggleBilling(annual: boolean): void {
    this.isAnnual = annual;
    this.cdr.detectChanges();
  }

  toggleFaq(index: number): void {
    this.openFaqIndex = this.openFaqIndex === index ? null : index;
    this.cdr.detectChanges();
  }

  setFeatureTab(index: number): void {
    this.activeFeatureTab = index;
    this.cdr.detectChanges();
  }

  faqs = [
    {
      q: 'هل أحتاج لإدخال بطاقة ائتمانية لبدء التجربة المجانية؟',
      a: 'لا على الإطلاق! يمكنك إنشاء حساب عيادتك والبدء فوراً بفترة تجريبية مجانية لمدة 14 يوماً بكامل المميزات دون الحاجة لأي بطاقة دفع.'
    },
    {
      q: 'هل بيانات المرضى وسجلات العيادة مشفرة وآمنة؟',
      a: 'نعم، نستخدم أعلى معايير التشفير (SSL/TLS 256-bit) مع عزل كامل لقواعد البيانات لكل عيادة، مع نسخ احتياطي يومي تلقائي لضمان سلامة بياناتك.'
    },
    {
      q: 'هل يمكنني تغيير خطة الاشتراك أو الترقية لاحقاً؟',
      a: 'بالتأكيد، يمكنك الترقية أو النزول بين الخطط (Basic, Pro, Enterprise) في أي وقت بضغطة زر مع احتساب الفارق تلقائياً.'
    },
    {
      q: 'هل يعمل النظام على أجهزة الجوال والتابلت؟',
      a: 'نعم، المنصة متجاوبة بالكامل بنسبة 100% وتعمل بسلاسة فائقة على متصفحات الهواتف الذكية، أجهزة الآيباد، وشاشات الحواسيب.'
    },
    {
      q: 'كيف يمكنني إضافة طاقم الأطباء والموظفين؟',
      a: 'من خلال لوحة تحكم العيادة، يمكنك إضافة عدد غير محدود من الأطباء والمساعدين وتحديد تخصصاتهم وصلاحياتهم بكل سهولة.'
    }
  ];

  testimonials = [
    {
      name: 'د. خالد المنصور',
      role: 'استشاري طب وجراحة العيون — عيادات النور',
      avatar: 'خ',
      comment: 'النظام أحدث نقلة نوعية في تنظيم مواعيدنا اليومية، انخفضت نسبة تغيب المرضى بأكثر من 40% بفضل سهولة الجدولة والمتابعة.',
      rating: 5
    },
    {
      name: 'د. سارة العمري',
      role: 'أخصائية جلدية وتجميل — مركز ريفا الطبي',
      avatar: 'س',
      comment: 'تصميم الواجهة مريح جداً وسريع الاستجابة. استغنينا تماماً عن السجلات الورقية وأصبح طاقم العمل ينجز المهام بنصف الوقت.',
      rating: 5
    },
    {
      name: 'د. طارق الحكيم',
      role: 'مدير مجمع الشفاء الطبي',
      avatar: 'ط',
      comment: 'التقارير التحليلية الفورية تساعدنا في اتخاذ قرارات دقيقة بشأن أداء الأطباء ونمو العيادة. أفضل استثمار رقمي قمنا به.',
      rating: 5
    }
  ];
}
