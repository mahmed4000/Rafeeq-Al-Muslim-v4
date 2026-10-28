# رفيق المسلم (Almosala Pro 2026) 🕌✨

تطبيق إسلامي شامل ومتكامل للهواتف الذكية مبني بتقنيات **React Native (Expo)**، مصمم ليكون الرفيق اليومي الهادئ للمسلم في عباداته اليومية بدون إعلانات وبأعلى معايير الخصوصية والجودة البصرية.

---

## 🌟 أبرز المميزات (Features)

### 1. 🕋 مواقيت الصلاة والأذان التفاعلي
- حساب دقيق لمواقيت الصلوات الخمس والشروق لكافة دول ومدن العالم.
- تنبيهات الأذان والتنبيه المسبق قبل دخول الوقت.
- بطاقة العد التنازلي الحي للصلاة القادمة.

### 2. 📖 المصحف الشريف والتلاوات الصوتية
- عرض صفحات وسور المصحف بالرسم العثماني المعتمد.
- **تكبير وتصغير الآيات بإصبعين (Pinch to Zoom)** بسلاسة تامة مع حماية منبثق التفسير.
- التفسير الميسر المباشر لكل آية بنقرة واحدة.
- مشغل صوتي متقدم لتلاوات كبار القراء، مع دعم التشغيل في الخلفية.
- بطاقات مشاركة الآيات القرآنية بتصاميم أندلسية وإسلامية راقية.

### 3. 📿 حصن المسلم والأذكار اليومية
- أذكار الصباح والمساء الصحيحة المكتملة بالترتيب الشرعي.
- نظام تنقل تفاعلي بالسحب (Swipe) يميناً ويساراً مع عداد تفاعلي ورجات حسية (Haptic Feedback).
- أذكار ما بعد الصلاة، أذكار النوم، وأدعية المناسبات.

### 4. 🎙️ دروس وكراسي الحرمين الشريفين (المكي والنبوي)
- **دروس المسجد الحرام بمكة المكرمة 🕋:** كراسي كبار أئمة وعلماء الحرم المكي (معالي الشيخ د. عبد الرحمن السديس، معالي الشيخ د. صالح بن حميد، الشيخ د. عبد الله الجهني، الشيخ د. فيصل غزاوي، الشيخ د. بندر بليلة، الشيخ د. حسن بخاري).
- **دروس المسجد النبوي الشريف 🕌:** كراسي الحرم النبوي (الشيخ د. عبد المحسن القاسم، الشيخ د. عبد الله البخاري، وغيرهم).
- **صفحة الدرس المستقلة:** مشغل صوتي متكامل، التحكم بالسرعات (1.0x, 1.25x, 1.5x, 2.0x)، التقديم والتأخير 15 ثانية، التحميل والاستماع أوفلاين، وتدوين الوقفات والفوائد العلمية مع التوقيت.

### 5. 🧭 بوصلة اتجاه القبلة
- تحديد فوري ودقيق لاتجاه الكعبة المشرفة اعتماداً على مستشعرات البوصلة ونظام تحديد المواقع (GPS).

### 6. 📚 الموسوعة الإسلامية المتكاملة
- **الرقية الشرعية الكاملة** من القرآن الكريم والسنة النبوية الشريفة.
- **الأربعون النووية** مع نصوص الأحاديث وشرحها.
- **أسماء الله الحسنى** الـ 99 مع معانيها ودلالاتها الإيمانية.
- **حاسبة الزكاة الذكية** (زكاة المال، الذهب، والفضة).
- **إمساكية رمضان والتقويم الهجري.**

---

## 🛠️ التقنيات المستخدمة (Tech Stack)

- **Framework:** React Native (Expo SDK 57)
- **Language:** TypeScript
- **Architecture:** Modular Clean Architecture (Services, Context, Screens, Data)
- **Storage:** Unified `StorageService` (`@react-native-async-storage/async-storage` with safe web fallback)
- **Prayer Engine:** Astronomical Solar Engine & `adhan` library (100% offline precision)
- **Audio & Offline:** `expo-audio` + `expo-file-system` (Offline MP3 caching)
- **Notifications:** `expo-notifications` (Weekly automated 35-alert Adhan scheduler)
- **Sensors & Location:** `expo-sensors` (Magnetometer), `expo-location` (GPS Heading)
- **Styling:** Custom Andalusian Design System (Light & Dark Theme)
- **Typography:** `@expo-google-fonts/tajawal`, `@expo-google-fonts/amiri`

---

## 📁 الهيكلية البرمجية للمشروع (Project Structure)

```text
src/
├── components/          # المكونات المشتركة
│   └── common/          # Header, TextUI, MoorishArchFrame, SafeErrorBoundary
├── constants/           # الثوابت والألوان والمدن
│   ├── tokens.ts        # نظام التصميم الأندلسي والألوان
│   ├── cities.ts        # إحداثيات المدن العالمية وزوايا القبلة
│   └── screens.ts       # معرّفات الشاشات
├── context/             # إدارة الحالة المركزية
│   └── AppContext.tsx   # التفضيلات، المواقيت، والسمة
├── data/                # قواعد البيانات النصية المفصولة
│   ├── azkarData.ts     # أذكار الصباح والمساء وحصن المسلم
│   ├── haramainData.ts  # دروس وكراسي المسجد الحرام والمسجد النبوي
│   ├── hadith40Data.ts  # الأربعون النووية وشرحها
│   ├── allahNamesData.ts# أسماء الله الحسنى ومعانيها
│   └── ruqyahData.ts    # الرقية الشرعية من الكتاب والسنة
├── navigation/          # شريط التنقل السفلي والمسارات
│   └── MainNavigator.tsx
├── screens/             # الشاشات المستقلة
│   ├── HomeScreen.tsx
│   ├── PrayerTimesScreen.tsx
│   ├── ImsakiahScreen.tsx
│   ├── QiblaScreen.tsx
│   ├── QuranIndexScreen.tsx
│   ├── QuranReaderScreen.tsx
│   ├── AzkarCategoriesScreen.tsx
│   ├── AzkarSessionScreen.tsx
│   ├── HaramainLessonsScreen.tsx
│   ├── Hadith40Screen.tsx
│   ├── AllahNamesScreen.tsx
│   ├── RuqyahScreen.tsx
│   ├── DownloadsScreen.tsx # إدارة التنزيلات والملفات الصوتية أوفلاين
│   ├── ZakatScreen.tsx
│   └── SettingsScreen.tsx
└── services/            # المنطق البرمجي والخدمات
    ├── storage.ts       # خدمة التخزين المحلي الآمنة
    ├── prayerCalculation.ts # محرك حساب مواقيت الصلاة الفلكي
    ├── notificationService.ts # جدولة أذان الصلوات الأسبوعي
    ├── audioService.ts  # تنزيل الصوتيات أوفلاين
    ├── quranAudioService.ts # بث تلاوات كبار القراء عبر السحابة
    ├── quranParser.ts   # معالجة آيات وسور المصحف
    └── qiblaService.ts  # حساب زاوية القبلة والمسافة للكعبة
```

---

## 🚀 التشغيل والتطوير (Development & Preview)

### 1. المعاينة السريعة عبر المتصفح (Web Live Preview):
التطبيق مزود بواجهة ويب تفاعلية فائقة السرعة ومتوافقة مع جميع الأجهزة:
```bash
# تشغيل الخادم المحلي الفوري
python3 -m http.server 8080
# ثم افتح في المتصفح: http://localhost:8080
```

### 2. التشغيل عبر بيئة React Native (Expo):
```bash
# تثبيت الحزم
npm install

# تشغيل خادم التطوير
npx expo start
```
- للتشغيل على متصفح الويب: اضغط `w`.
- للتشغيل على أجهزة Android: مسح رمز الـ QR عبر تطبيق Expo Go.
- للتشغيل على أجهزة iOS: مسح رمز الـ QR بكاميرا الهاتف.

---

## 📦 حزمة البناء والإنتاج النهائي (Production Build)

تم ضبط ملفات المشروع (`eas.json`, `app.json`, `package.json`) لتكون مهيأة للإنتاج وبناء التطبيقات المستقلة:

### 1. بناء حزمة أندرويد المستقلة (Android APK & AAB):
```bash
# بناء ملف APK للتثبيت المباشر على الأجهزة للتجربة:
npx eas build --platform android --profile preview

# بناء حزمة الإنتاج لمتجر Google Play (AAB):
npx eas build --platform android --profile production
```

### 2. بناء حزمة آبل للآيفون والآيباد (iOS IPA):
```bash
# بناء حزمة المعاينة الداخلية (Ad-Hoc / TestFlight):
npx eas build --platform ios --profile preview

# بناء حزمة الإنتاج لمتجر App Store:
npx eas build --platform ios --profile production
```

### 3. تصدير حزمة الويب للإنتاج (Static Web Export):
```bash
npm run build:web
# ينتج مجلد dist/ الجاهز للنشر على Cloudflare Pages, Vercel, أو Netlify
```

---

## 📜 الترخيص والوقف (License)
هذا المشروع وقف لوجه الله تعالى، خالٍ تماماً من الإعلانات ومن أدوات التتبع، صُمم بأعلى معايير الإتقان الشرعي والبرمجي.
