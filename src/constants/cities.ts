export const KAABA_LAT = 21.422487;
export const KAABA_LNG = 39.826206;

export const CITIES = [
  {
    id: 'makkah',
    nameAr: 'مكة المكرمة',
    nameEn: 'Makkah',
    country: 'السعودية',
    lat: '21.42° N',
    lng: '39.82° E',
    qiblaAngle: 0,
    qiblaTextAr: 'في رحاب الكعبة المشرفة',
    qiblaTextEn: 'At the Holy Kaaba',
    distanceToMakkah: '٠ كم',
    nextPrayerNameAr: 'صلاة العصر',
    nextPrayerNameEn: 'Asr',
    nextPrayerTime: '٠٣:٤٥ م',
    prayers: [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٤:٥٢ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٦:٠٨ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '١٢:١٨ م', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٣:٤٥ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٦:٢٨ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '٠٧:٥٨ م', isNext: false, icon: 'moon' }
    ]
  },
  {
    id: 'madinah',
    nameAr: 'المدينة المنورة',
    nameEn: 'Madinah',
    country: 'السعودية',
    lat: '24.46° N',
    lng: '39.61° E',
    qiblaAngle: 176,
    qiblaTextAr: '١٧٦° جنوب (South)',
    qiblaTextEn: '176° South',
    distanceToMakkah: '٤٢٠ كم',
    nextPrayerNameAr: 'صلاة العصر',
    nextPrayerNameEn: 'Asr',
    nextPrayerTime: '٠٣:٤٥ م',
    prayers: [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٤:٥٤ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٦:١٢ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '١٢:٢٠ م', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٣:٤٥ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٦:٢٩ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '٠٧:٥٩ م', isNext: false, icon: 'moon' }
    ]
  },
  {
    id: 'cairo',
    nameAr: 'القاهرة',
    nameEn: 'Cairo',
    country: 'مصر',
    lat: '30.04° N',
    lng: '31.23° E',
    qiblaAngle: 136,
    qiblaTextAr: '١٣٦° جنوب شرق (SE)',
    qiblaTextEn: '136° South-East',
    distanceToMakkah: '١,٢٩٠ كم',
    nextPrayerNameAr: 'صلاة العصر',
    nextPrayerNameEn: 'Asr',
    nextPrayerTime: '٠٣:٣٨ م',
    prayers: [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٤:١٢ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٥:٤٠ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '١٢:٠٥ م', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٣:٣٨ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٦:٢٢ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '٠٧:٥٢ م', isNext: false, icon: 'moon' }
    ]
  },
  {
    id: 'riyadh',
    nameAr: 'الرياض',
    nameEn: 'Riyadh',
    country: 'السعودية',
    lat: '24.71° N',
    lng: '46.67° E',
    qiblaAngle: 244,
    qiblaTextAr: '٢٤٤° جنوب غرب (SW)',
    qiblaTextEn: '244° South-West',
    distanceToMakkah: '٨٧٠ كم',
    nextPrayerNameAr: 'صلاة العصر',
    nextPrayerNameEn: 'Asr',
    nextPrayerTime: '٠٣:٢٢ م',
    prayers: [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٤:٣٢ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٥:٤٩ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '١١:٥٨ ص', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٣:٢٢ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٦:٠٧ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '٠٧:٣٧ م', isNext: false, icon: 'moon' }
    ]
  },
  {
    id: 'dubai',
    nameAr: 'دبي',
    nameEn: 'Dubai',
    country: 'الإمارات',
    lat: '25.20° N',
    lng: '55.27° E',
    qiblaAngle: 258,
    qiblaTextAr: '٢٥٨° جنوب غرب (SW)',
    qiblaTextEn: '258° South-West',
    distanceToMakkah: '١,٦٥٠ كم',
    nextPrayerNameAr: 'صلاة العصر',
    nextPrayerNameEn: 'Asr',
    nextPrayerTime: '٠٣:٤٦ م',
    prayers: [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٤:٤٥ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٦:٠١ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '١٢:٢٢ م', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٣:٤٦ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٦:٤٢ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '٠٨:٠٢ م', isNext: false, icon: 'moon' }
    ]
  },
  {
    id: 'amman',
    nameAr: 'عمان',
    nameEn: 'Amman',
    country: 'الأردن',
    lat: '31.95° N',
    lng: '35.93° E',
    qiblaAngle: 162,
    qiblaTextAr: '١٦٢° جنوب (South)',
    qiblaTextEn: '162° South',
    distanceToMakkah: '١,٢٣٠ كم',
    nextPrayerNameAr: 'صلاة العصر',
    nextPrayerNameEn: 'Asr',
    nextPrayerTime: '٠٣:٤٨ م',
    prayers: [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٤:٢٥ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٥:٥٢ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '١٢:١٢ م', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٣:٤٨ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٦:٣٢ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '٠٨:٠٢ م', isNext: false, icon: 'moon' }
    ]
  },
  {
    id: 'istanbul',
    nameAr: 'إسطنبول',
    nameEn: 'Istanbul',
    country: 'تركيا',
    lat: '41.00° N',
    lng: '28.97° E',
    qiblaAngle: 152,
    qiblaTextAr: '١٥٢° جنوب شرق (SE)',
    qiblaTextEn: '152° South-East',
    distanceToMakkah: '٢,٤١٠ كم',
    nextPrayerNameAr: 'صلاة العصر',
    nextPrayerNameEn: 'Asr',
    nextPrayerTime: '٠٤:٣٨ م',
    prayers: [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٤:٥٨ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٦:٣٥ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '٠١:٠٢ م', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٤:٣٨ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٧:٣٠ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '٠٩:٠٠ م', isNext: false, icon: 'moon' }
    ]
  },
  {
    id: 'london',
    nameAr: 'لندن',
    nameEn: 'London',
    country: 'المملكة المتحدة',
    lat: '51.50° N',
    lng: '0.12° W',
    qiblaAngle: 119,
    qiblaTextAr: '١١٩° جنوب شرق (SE)',
    qiblaTextEn: '119° South-East',
    distanceToMakkah: '٤,٧٩٠ كم',
    nextPrayerNameAr: 'صلاة العصر',
    nextPrayerNameEn: 'Asr',
    nextPrayerTime: '٠٥:١٥ م',
    prayers: [
      { id: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr', time: '٠٣:٤٥ ص', isNext: false, icon: 'sunrise' },
      { id: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise', time: '٠٥:٢٢ ص', isNext: false, icon: 'sun' },
      { id: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr', time: '٠١:٠٨ م', isNext: false, icon: 'sun' },
      { id: 'asr', nameAr: 'العصر', nameEn: 'Asr', time: '٠٥:١٥ م', isNext: true, icon: 'clock' },
      { id: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib', time: '٠٨:٥٥ م', isNext: false, icon: 'sunset' },
      { id: 'isha', nameAr: 'العشاء', nameEn: 'Isha', time: '١٠:٣٠ م', isNext: false, icon: 'moon' }
    ]
  }
];

