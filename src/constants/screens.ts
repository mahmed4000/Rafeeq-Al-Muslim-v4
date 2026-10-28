export const ALL_APP_SCREENS = [
  {
    categoryAr: 'مواقيت الصلاة والقبلة',
    categoryEn: 'Prayer & Qibla Services',
    icon: 'clock',
    items: [
      { id: 'Home', titleAr: 'الرئيسية والميقات القادم', titleEn: 'Home & Next Prayer', badge: 'رئيسية', icon: 'home' },
      { id: 'PrayerTimes', titleAr: 'جدول مواقيت الصلاة الكامل', titleEn: 'Full Prayer Timetable', badge: 'مواقيت', icon: 'clock' },
      { id: 'Imsakiah', titleAr: 'إمساكية الشهر والتقويم الشهري', titleEn: 'Monthly Prayer Timetable', badge: 'إمساكية', icon: 'calendar' },
      { id: 'PrayerTracker', titleAr: 'سجل الصلوات والسنن الرواتب اليومي', titleEn: 'Prayer & Sunnah Tracker', badge: 'سجل', icon: 'check-circle' },
      { id: 'Qibla', titleAr: 'بوصلة اتجاه القبلة المباشرة', titleEn: 'Direct Qibla Compass', badge: 'بوصلة', icon: 'compass' },
      { id: 'CalculationMethod', titleAr: 'طرق الحساب الفلكي والتقويم', titleEn: 'Calculation Methods', badge: 'فقهي', icon: 'sliders' },
      { id: 'LocationSettings', titleAr: 'المدينة وإحداثيات الموقع', titleEn: 'City & Location', badge: 'موقع', icon: 'map-pin' },
      { id: 'NotificationSettings', titleAr: 'تخصيص تنبيهات الأذان للصلوات', titleEn: 'Prayer Notifications', badge: 'تنبيهات', icon: 'bell' },
      { id: 'AdhanSettings', titleAr: 'أصوات مؤذني الحرمين الشريفين', titleEn: 'Adhan Reciters', badge: 'صوتيات', icon: 'volume-2' },
      { id: 'PrayerSettings', titleAr: 'إعدادات الصلاة الشاملة', titleEn: 'Prayer Settings', badge: 'إعدادات', icon: 'settings' }
    ]
  },
  {
    categoryAr: 'القرآن الكريم وتلاواته',
    categoryEn: 'Holy Quran & Recitations',
    icon: 'book-open',
    items: [
      { id: 'QuranIndex', titleAr: 'فهرس المصحف الشريف (١١٤ سورة)', titleEn: 'Quran Surah Index (114)', badge: 'فهرس', icon: 'book-open' },
      { id: 'QuranReader', titleAr: 'قارئ المصحف والآيات مع التفسير', titleEn: 'Quran Reader & Tafsir', badge: 'مصحف', icon: 'book' },
      { id: 'QuranKhatmah', titleAr: 'متتبع الختمة والورد القرآني اليومي', titleEn: 'Quran Khatmah Tracker', badge: 'ختمة', icon: 'award' },
      { id: 'ShareCard', titleAr: 'بطاقة مشاركة آية وتدبر', titleEn: 'Quran Verse Share Card', badge: 'مشاركة', icon: 'share-2' },
      { id: 'QuranBookmarks', titleAr: 'الإشارات المرجعية والمحفوظات', titleEn: 'Bookmarks & Saved Verses', badge: 'محفوظات', icon: 'bookmark' },
      { id: 'QuranAudio', titleAr: 'مشغل التلاوات الصوتية والقراء', titleEn: 'Audio Recitations Player', badge: 'تلاوة', icon: 'headphones' },
      { id: 'QuranSettings', titleAr: 'تخصيص حجم خط المصحف والتفسير', titleEn: 'Quran Font Settings', badge: 'خط', icon: 'type' }
    ]
  },
  {
    categoryAr: 'الأذكار والتسبيح',
    categoryEn: 'Azkar & Remembrance',
    icon: 'heart',
    items: [
      { id: 'AzkarCategories', titleAr: 'تصنيفات أذكار اليوم والليلة', titleEn: 'Azkar Categories', badge: 'أذكار', icon: 'heart' },
      { id: 'AzkarSession', titleAr: 'جلسة الذكر والعداد اللمسي التفاعلي', titleEn: 'Interactive Azkar Counter', badge: 'تسبيح', icon: 'activity' },
      { id: 'AzkarCompletion', titleAr: 'شاشة إتمام الورد والتقبل', titleEn: 'Dhikr Completion & Duas', badge: 'إتمام', icon: 'check-circle' },
      { id: 'AzkarSettings', titleAr: 'تفضيلات الاهتزاز وحفظ التقدم', titleEn: 'Haptic & Auto-Save Settings', badge: 'إعدادات', icon: 'smartphone' }
    ]
  },
  {
    categoryAr: 'جولة الترحيب والتهيئة الأولى',
    categoryEn: 'Onboarding & Initial Setup',
    icon: 'navigation',
    items: [
      { id: 'Welcome', titleAr: 'شاشة الترحيب بالمصلى', titleEn: 'Welcome Screen', badge: 'ترحيب', icon: 'smile' },
      { id: 'LocationPermission', titleAr: 'إذن تحديد الموقع الجغرافي', titleEn: 'Location Permission', badge: 'إذن', icon: 'map-pin' },
      { id: 'ManualLocation', titleAr: 'البحث واختيار المدينة يدوياً', titleEn: 'Manual City Selector', badge: 'مدن', icon: 'search' },
      { id: 'NotificationPermission', titleAr: 'إذن التنبيهات والأذان', titleEn: 'Notification Permission', badge: 'أذان', icon: 'bell' }
    ]
  },
  {
    categoryAr: 'الفرائض والتقويم الإسلامي',
    categoryEn: 'Islamic Duties & Hijri Calendar',
    icon: 'calendar',
    items: [
      { id: 'IslamicEvents', titleAr: 'المناسبات والتقويم الإسلامي السنوي', titleEn: 'Islamic Events & Calendar', badge: 'تقويم', icon: 'calendar' },
      { id: 'ZakatCalculator', titleAr: 'حاسبة الزكاة الشرعية الذكية', titleEn: 'Smart Zakat Calculator', badge: 'زكاة', icon: 'award' }
    ]
  },
  {
    categoryAr: 'الموسوعة والعلوم الشرعية',
    categoryEn: 'Islamic Encyclopedia & Hadith',
    icon: 'bookmark',
    items: [
      { id: 'Ruqyah', titleAr: 'الرقية الشرعية الكاملة من القرآن والسنة', titleEn: 'Comprehensive Legal Ruqyah', badge: 'شفاء', icon: 'shield' },
      { id: 'Hadith40', titleAr: 'الأربعون النووية مع الشرح والفوائد', titleEn: "An-Nawawi's 40 Hadiths", badge: 'حديث', icon: 'book' },
      { id: 'AllahNames', titleAr: 'أسماء الله الحسنى الـ ٩٩ ومعانيها', titleEn: '99 Beautiful Names of Allah', badge: 'أسماء', icon: 'award' },
      { id: 'ProphetLessons', titleAr: 'دروس وكراسي الحرمين الشريفين (المكي والنبوي)', titleEn: "Two Holy Mosques Lessons & Chairs", badge: 'الحرمين', icon: 'book-open' }
    ]
  },
  {
    categoryAr: 'المظهر والنظام والبيانات',
    categoryEn: 'Appearance, Trust & System',
    icon: 'settings',
    items: [
      { id: 'More', titleAr: 'قائمة المزيد والخدمات الشاملة', titleEn: 'More Services Hub', badge: 'دليل', icon: 'grid' },
      { id: 'Appearance', titleAr: 'المظهر والسمة (فاتح / داكن)', titleEn: 'Appearance (Light / Dark)', badge: 'مظهر', icon: 'sun' },
      { id: 'Language', titleAr: 'لغة التطبيق (العربية / English)', titleEn: 'App Language', badge: 'لغة', icon: 'globe' },
      { id: 'Privacy', titleAr: 'سياسة الخصوصية وأمان البيانات', titleEn: 'Privacy & Offline Guarantee', badge: 'أمان', icon: 'shield' },
      { id: 'Sources', titleAr: 'المصادر والاعتمادات الفلكية', titleEn: 'Sources & Approvals', badge: 'اعتماد', icon: 'award' },
      { id: 'About', titleAr: 'حول رفيق المسلم وإصدار التطبيق', titleEn: 'About Islamic Companion', badge: 'إصدار', icon: 'info' }
    ]
  }
];

