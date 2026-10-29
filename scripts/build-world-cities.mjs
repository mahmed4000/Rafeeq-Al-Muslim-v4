// Builds src/data/worldCities.ts from GeoNames cities15000.txt (CC BY 4.0).
// Get the input from https://download.geonames.org/export/dump/cities15000.zip (not committed).
// Usage: node scripts/build-world-cities.mjs <cities15000.txt> src/data/worldCities.ts
// Each pick is [countryCode, GeoNames name (or alternate name), Arabic name, English name?].
import { readFileSync, writeFileSync } from 'node:fs';

const COUNTRIES = {
  SA: ['السعودية', 'Saudi Arabia'], EG: ['مصر', 'Egypt'], AE: ['الإمارات', 'UAE'], KW: ['الكويت', 'Kuwait'],
  QA: ['قطر', 'Qatar'], BH: ['البحرين', 'Bahrain'], OM: ['عُمان', 'Oman'], YE: ['اليمن', 'Yemen'],
  JO: ['الأردن', 'Jordan'], PS: ['فلسطين', 'Palestine'], LB: ['لبنان', 'Lebanon'], SY: ['سوريا', 'Syria'],
  IQ: ['العراق', 'Iraq'], SD: ['السودان', 'Sudan'], LY: ['ليبيا', 'Libya'], TN: ['تونس', 'Tunisia'],
  DZ: ['الجزائر', 'Algeria'], MA: ['المغرب', 'Morocco'], MR: ['موريتانيا', 'Mauritania'], SO: ['الصومال', 'Somalia'],
  DJ: ['جيبوتي', 'Djibouti'], KM: ['جزر القمر', 'Comoros'], TR: ['تركيا', 'Turkey'], IR: ['إيران', 'Iran'],
  PK: ['باكستان', 'Pakistan'], AF: ['أفغانستان', 'Afghanistan'], IN: ['الهند', 'India'], BD: ['بنغلاديش', 'Bangladesh'],
  LK: ['سريلانكا', 'Sri Lanka'], MV: ['جزر المالديف', 'Maldives'], ID: ['إندونيسيا', 'Indonesia'], MY: ['ماليزيا', 'Malaysia'],
  SG: ['سنغافورة', 'Singapore'], BN: ['بروناي', 'Brunei'], TH: ['تايلاند', 'Thailand'], PH: ['الفلبين', 'Philippines'],
  CN: ['الصين', 'China'], KZ: ['كازاخستان', 'Kazakhstan'], UZ: ['أوزبكستان', 'Uzbekistan'], TJ: ['طاجيكستان', 'Tajikistan'],
  KG: ['قيرغيزستان', 'Kyrgyzstan'], TM: ['تركمانستان', 'Turkmenistan'], AZ: ['أذربيجان', 'Azerbaijan'], RU: ['روسيا', 'Russia'],
  BA: ['البوسنة والهرسك', 'Bosnia and Herzegovina'], AL: ['ألبانيا', 'Albania'], XK: ['كوسوفو', 'Kosovo'], MK: ['مقدونيا الشمالية', 'North Macedonia'],
  NG: ['نيجيريا', 'Nigeria'], SN: ['السنغال', 'Senegal'], ML: ['مالي', 'Mali'], NE: ['النيجر', 'Niger'],
  TD: ['تشاد', 'Chad'], GN: ['غينيا', 'Guinea'], ET: ['إثيوبيا', 'Ethiopia'], KE: ['كينيا', 'Kenya'],
  TZ: ['تنزانيا', 'Tanzania'], ZA: ['جنوب أفريقيا', 'South Africa'], UG: ['أوغندا', 'Uganda'], GH: ['غانا', 'Ghana'],
  CI: ['ساحل العاج', 'Ivory Coast'], BF: ['بوركينا فاسو', 'Burkina Faso'], GB: ['المملكة المتحدة', 'United Kingdom'], IE: ['أيرلندا', 'Ireland'],
  FR: ['فرنسا', 'France'], BE: ['بلجيكا', 'Belgium'], NL: ['هولندا', 'Netherlands'], DE: ['ألمانيا', 'Germany'],
  AT: ['النمسا', 'Austria'], CH: ['سويسرا', 'Switzerland'], IT: ['إيطاليا', 'Italy'], ES: ['إسبانيا', 'Spain'],
  PT: ['البرتغال', 'Portugal'], SE: ['السويد', 'Sweden'], NO: ['النرويج', 'Norway'], DK: ['الدنمارك', 'Denmark'],
  FI: ['فنلندا', 'Finland'], GR: ['اليونان', 'Greece'], US: ['الولايات المتحدة', 'United States'], CA: ['كندا', 'Canada'],
  AU: ['أستراليا', 'Australia'], NZ: ['نيوزيلندا', 'New Zealand'], BR: ['البرازيل', 'Brazil'], AR: ['الأرجنتين', 'Argentina'],
  MX: ['المكسيك', 'Mexico'], JP: ['اليابان', 'Japan'], KR: ['كوريا الجنوبية', 'South Korea']
};

// [country, name to find in GeoNames, Arabic, English (defaults to the find name), GeoNames country if different]
const PICKS = [
  ['SA', 'Jeddah', 'جدة'], ['SA', 'Dammam', 'الدمام'], ['SA', 'Al Khobar', 'الخبر', 'Khobar'], ['SA', 'Ta’if', 'الطائف', 'Taif'],
  ['SA', 'Abha', 'أبها'], ['SA', 'Tabuk', 'تبوك'], ['SA', 'Buraydah', 'بريدة'], ['SA', 'Ha\'il', 'حائل', 'Hail'],
  ['SA', 'Jizan', 'جازان', 'Jazan'], ['SA', 'Najran', 'نجران'], ['SA', 'Al Hufuf', 'الهفوف', 'Hofuf'], ['SA', 'Yanbu', 'ينبع'],
  ['SA', 'Khamis Mushait', 'خميس مشيط'], ['SA', 'Al Jubayl', 'الجبيل', 'Jubail'], ['SA', 'Sakakah', 'سكاكا'], ['SA', 'Arar', 'عرعر'],
  ['SA', 'Al Bahah', 'الباحة', 'Al Bahah'], ['SA', 'Unaizah', 'عنيزة'], ['SA', 'Al Kharj', 'الخرج'], ['SA', 'Hafar Al-Batin', 'حفر الباطن'],
  ['EG', 'Alexandria', 'الإسكندرية'], ['EG', 'Giza', 'الجيزة'], ['EG', 'Port Said', 'بورسعيد'], ['EG', 'Suez', 'السويس'],
  ['EG', 'Mansoura', 'المنصورة'], ['EG', 'Tanta', 'طنطا'], ['EG', 'Asyut', 'أسيوط'], ['EG', 'Luxor', 'الأقصر'],
  ['EG', 'Aswan', 'أسوان'], ['EG', 'Ismailia', 'الإسماعيلية'], ['EG', 'Zagazig', 'الزقازيق'], ['EG', 'Damanhur', 'دمنهور'],
  ['EG', 'Al Fayyum', 'الفيوم', 'Faiyum'], ['EG', 'Minya', 'المنيا'], ['EG', 'Sohag', 'سوهاج'], ['EG', 'Hurghada', 'الغردقة'],
  ['EG', 'Qena', 'قنا'], ['EG', 'Beni Suef', 'بني سويف'],
  ['AE', 'Abu Dhabi', 'أبوظبي'], ['AE', 'Sharjah', 'الشارقة'], ['AE', 'Ajman', 'عجمان'], ['AE', 'Al Ain', 'العين'],
  ['AE', 'Ras al-Khaimah', 'رأس الخيمة'], ['AE', 'Fujairah', 'الفجيرة'],
  ['KW', 'Kuwait City', 'مدينة الكويت'], ['QA', 'Doha', 'الدوحة'], ['BH', 'Manama', 'المنامة'],
  ['OM', 'Muscat', 'مسقط'], ['OM', 'Salalah', 'صلالة'], ['OM', 'Sohar', 'صحار'], ['OM', 'Nizwa', 'نزوى'],
  ['YE', 'Sanaa', 'صنعاء'], ['YE', 'Aden', 'عدن'], ['YE', 'Taiz', 'تعز'], ['YE', 'Al Hudaydah', 'الحديدة', 'Hodeidah'], ['YE', 'Al Mukalla', 'المكلا', 'Mukalla'],
  ['JO', 'Zarqa', 'الزرقاء'], ['JO', 'Irbid', 'إربد'], ['JO', 'Aqaba', 'العقبة'],
  ['PS', 'Jerusalem', 'القدس', 'Jerusalem', 'IL'], ['PS', 'Gaza', 'غزة'], ['PS', 'Hebron', 'الخليل'], ['PS', 'Nablus', 'نابلس'], ['PS', 'Ramallah', 'رام الله'],
  ['LB', 'Beirut', 'بيروت'], ['LB', 'Tripoli', 'طرابلس'], ['LB', 'Sidon', 'صيدا'],
  ['SY', 'Damascus', 'دمشق'], ['SY', 'Aleppo', 'حلب'], ['SY', 'Homs', 'حمص'], ['SY', 'Latakia', 'اللاذقية'], ['SY', 'Hama', 'حماة'],
  ['IQ', 'Baghdad', 'بغداد'], ['IQ', 'Basrah', 'البصرة', 'Basra'], ['IQ', 'Mosul', 'الموصل'], ['IQ', 'Erbil', 'أربيل'],
  ['IQ', 'Najaf', 'النجف'], ['IQ', 'Karbala', 'كربلاء'], ['IQ', 'Kirkuk', 'كركوك'], ['IQ', 'Sulaymaniyah', 'السليمانية'],
  ['SD', 'Khartoum', 'الخرطوم'], ['SD', 'Omdurman', 'أم درمان'], ['SD', 'Port Sudan', 'بورتسودان'],
  ['LY', 'Tripoli', 'طرابلس'], ['LY', 'Benghazi', 'بنغازي'], ['LY', 'Misratah', 'مصراتة', 'Misrata'],
  ['TN', 'Tunis', 'تونس'], ['TN', 'Sfax', 'صفاقس'], ['TN', 'Sousse', 'سوسة'], ['TN', 'Kairouan', 'القيروان'],
  ['DZ', 'Algiers', 'الجزائر العاصمة'], ['DZ', 'Oran', 'وهران'], ['DZ', 'Constantine', 'قسنطينة'], ['DZ', 'Annaba', 'عنابة'],
  ['DZ', 'Setif', 'سطيف'], ['DZ', 'Batna', 'باتنة'], ['DZ', 'Blida', 'البليدة'], ['DZ', 'Tlemcen', 'تلمسان'],
  ['MA', 'Casablanca', 'الدار البيضاء'], ['MA', 'Rabat', 'الرباط'], ['MA', 'Fes', 'فاس'], ['MA', 'Marrakesh', 'مراكش'],
  ['MA', 'Tangier', 'طنجة'], ['MA', 'Agadir', 'أكادير'], ['MA', 'Meknes', 'مكناس'], ['MA', 'Oujda', 'وجدة'], ['MA', 'Tetouan', 'تطوان'],
  ['MR', 'Nouakchott', 'نواكشوط'], ['SO', 'Mogadishu', 'مقديشو'], ['SO', 'Hargeisa', 'هرجيسا'], ['DJ', 'Djibouti', 'جيبوتي'], ['KM', 'Moroni', 'موروني'],
  ['TR', 'Ankara', 'أنقرة'], ['TR', 'Izmir', 'إزمير'], ['TR', 'Bursa', 'بورصة'], ['TR', 'Konya', 'قونية'], ['TR', 'Antalya', 'أنطاليا'],
  ['TR', 'Gaziantep', 'غازي عنتاب'], ['TR', 'Sanliurfa', 'شانلي أورفا'], ['TR', 'Adana', 'أضنة'], ['TR', 'Trabzon', 'طرابزون'],
  ['IR', 'Tehran', 'طهران'], ['IR', 'Mashhad', 'مشهد'], ['IR', 'Isfahan', 'أصفهان'], ['IR', 'Tabriz', 'تبريز'], ['IR', 'Shiraz', 'شيراز'], ['IR', 'Qom', 'قم'],
  ['PK', 'Karachi', 'كراتشي'], ['PK', 'Lahore', 'لاهور'], ['PK', 'Islamabad', 'إسلام آباد'], ['PK', 'Rawalpindi', 'راولبندي'],
  ['PK', 'Faisalabad', 'فيصل آباد'], ['PK', 'Peshawar', 'بيشاور'], ['PK', 'Multan', 'ملتان'], ['PK', 'Quetta', 'كويتا'],
  ['AF', 'Kabul', 'كابل'], ['AF', 'Herat', 'هرات'], ['AF', 'Kandahar', 'قندهار'],
  ['IN', 'Delhi', 'دلهي'], ['IN', 'Mumbai', 'مومباي'], ['IN', 'Hyderabad', 'حيدر آباد'], ['IN', 'Kolkata', 'كولكاتا'],
  ['IN', 'Lucknow', 'لكناو'], ['IN', 'Srinagar', 'سريناغار'], ['IN', 'Bengaluru', 'بنغالور'], ['IN', 'Chennai', 'تشيناي'],
  ['BD', 'Dhaka', 'دكا'], ['BD', 'Chattogram', 'شيتاغونغ', 'Chittagong'], ['LK', 'Colombo', 'كولومبو'], ['MV', 'Male', 'ماليه'],
  ['ID', 'Jakarta', 'جاكرتا'], ['ID', 'Surabaya', 'سورابايا'], ['ID', 'Bandung', 'باندونغ'], ['ID', 'Medan', 'ميدان'],
  ['ID', 'Banda Aceh', 'باندا آتشيه'], ['ID', 'Makassar', 'ماكاسار'], ['ID', 'Yogyakarta', 'يوغياكارتا'],
  ['MY', 'Kuala Lumpur', 'كوالالمبور'], ['MY', 'Johor Bahru', 'جوهور بارو'], ['MY', 'George Town', 'جورج تاون'], ['MY', 'Kota Bharu', 'كوتا بارو'],
  ['SG', 'Singapore', 'سنغافورة'], ['BN', 'Bandar Seri Begawan', 'بندر سري بكاوان'], ['TH', 'Bangkok', 'بانكوك'], ['PH', 'Manila', 'مانيلا'],
  ['CN', 'Beijing', 'بكين'], ['CN', 'Urumqi', 'أورومتشي'],
  ['KZ', 'Almaty', 'ألماتي'], ['KZ', 'Astana', 'أستانا'], ['UZ', 'Tashkent', 'طشقند'], ['UZ', 'Samarkand', 'سمرقند'], ['UZ', 'Bukhara', 'بخارى'],
  ['TJ', 'Dushanbe', 'دوشنبه'], ['KG', 'Bishkek', 'بيشكيك'], ['TM', 'Ashgabat', 'عشق آباد'], ['AZ', 'Baku', 'باكو'],
  ['RU', 'Moscow', 'موسكو'], ['RU', 'Kazan', 'قازان'], ['RU', 'Grozny', 'غروزني'], ['RU', 'Makhachkala', 'محج قلعة'],
  ['BA', 'Sarajevo', 'سراييفو'], ['AL', 'Tirana', 'تيرانا'], ['XK', 'Pristina', 'بريشتينا'], ['MK', 'Skopje', 'سكوبيه'],
  ['NG', 'Lagos', 'لاغوس'], ['NG', 'Kano', 'كانو'], ['NG', 'Abuja', 'أبوجا'],
  ['SN', 'Dakar', 'داكار'], ['ML', 'Bamako', 'باماكو'], ['NE', 'Niamey', 'نيامي'], ['TD', 'N\'Djamena', 'نجامينا'], ['GN', 'Conakry', 'كوناكري'],
  ['ET', 'Addis Ababa', 'أديس أبابا'], ['KE', 'Nairobi', 'نيروبي'], ['KE', 'Mombasa', 'مومباسا'],
  ['TZ', 'Dar es Salaam', 'دار السلام'], ['TZ', 'Zanzibar', 'زنجبار'],
  ['ZA', 'Johannesburg', 'جوهانسبرغ'], ['ZA', 'Cape Town', 'كيب تاون'], ['ZA', 'Durban', 'ديربان'],
  ['UG', 'Kampala', 'كمبالا'], ['GH', 'Accra', 'أكرا'], ['CI', 'Abidjan', 'أبيدجان'], ['BF', 'Ouagadougou', 'واغادوغو'],
  ['GB', 'Manchester', 'مانشستر'], ['GB', 'Birmingham', 'برمنغهام'], ['GB', 'Leeds', 'ليدز'], ['GB', 'Bradford', 'برادفورد'],
  ['GB', 'Glasgow', 'غلاسكو'], ['GB', 'Leicester', 'ليستر'], ['IE', 'Dublin', 'دبلن'],
  ['FR', 'Paris', 'باريس'], ['FR', 'Marseille', 'مرسيليا'], ['FR', 'Lyon', 'ليون'], ['FR', 'Lille', 'ليل'], ['FR', 'Toulouse', 'تولوز'],
  ['BE', 'Brussels', 'بروكسل'], ['NL', 'Amsterdam', 'أمستردام'], ['NL', 'Rotterdam', 'روتردام'],
  ['DE', 'Berlin', 'برلين'], ['DE', 'Frankfurt am Main', 'فرانكفورت', 'Frankfurt'], ['DE', 'Hamburg', 'هامبورغ'], ['DE', 'Munich', 'ميونخ'], ['DE', 'Cologne', 'كولونيا'],
  ['AT', 'Vienna', 'فيينا'], ['CH', 'Zurich', 'زيورخ'], ['CH', 'Geneva', 'جنيف'], ['IT', 'Rome', 'روما'], ['IT', 'Milan', 'ميلانو'],
  ['ES', 'Madrid', 'مدريد'], ['ES', 'Barcelona', 'برشلونة'], ['ES', 'Granada', 'غرناطة'], ['ES', 'Cordoba', 'قرطبة'], ['PT', 'Lisbon', 'لشبونة'],
  ['SE', 'Stockholm', 'ستوكهولم'], ['SE', 'Malmo', 'مالمو'], ['NO', 'Oslo', 'أوسلو'], ['DK', 'Copenhagen', 'كوبنهاغن'], ['FI', 'Helsinki', 'هلسنكي'], ['GR', 'Athens', 'أثينا'],
  ['US', 'New York City', 'نيويورك', 'New York'], ['US', 'Washington', 'واشنطن'], ['US', 'Chicago', 'شيكاغو'], ['US', 'Los Angeles', 'لوس أنجلوس'],
  ['US', 'Houston', 'هيوستن'], ['US', 'Dallas', 'دالاس'], ['US', 'Detroit', 'ديترويت'], ['US', 'Dearborn', 'ديربورن'],
  ['US', 'San Francisco', 'سان فرانسيسكو'], ['US', 'Philadelphia', 'فيلادلفيا'], ['US', 'Atlanta', 'أتلانتا'], ['US', 'Miami', 'ميامي'], ['US', 'Minneapolis', 'مينيابوليس'],
  ['CA', 'Toronto', 'تورونتو'], ['CA', 'Montreal', 'مونتريال'], ['CA', 'Ottawa', 'أوتاوا'], ['CA', 'Mississauga', 'ميسيساغا'],
  ['CA', 'Calgary', 'كالغاري'], ['CA', 'Edmonton', 'إدمونتون'], ['CA', 'Vancouver', 'فانكوفر'],
  ['AU', 'Sydney', 'سيدني'], ['AU', 'Melbourne', 'ملبورن'], ['AU', 'Perth', 'بيرث'], ['AU', 'Brisbane', 'بريزبن'], ['NZ', 'Auckland', 'أوكلاند'],
  ['BR', 'Sao Paulo', 'ساو باولو', 'São Paulo'], ['AR', 'Buenos Aires', 'بوينس آيرس'], ['MX', 'Mexico City', 'مكسيكو سيتي'],
  ['JP', 'Tokyo', 'طوكيو'], ['KR', 'Seoul', 'سيول']
];

const [src, out] = process.argv.slice(2);
const rows = readFileSync(src, 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t'));
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`-]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();

const used = new Set(['makkah', 'madinah', 'cairo', 'riyadh', 'dubai', 'amman', 'istanbul', 'london']);
const lines = [];
const report = [];
for (const [cc, find, ar, en, geoCc] of PICKS) {
  const want = norm(find);
  const inCountry = rows.filter((r) => r[8] === (geoCc || cc));
  const exact = inCountry.filter((r) => norm(r[1]) === want || norm(r[2]) === want);
  const alt = exact.length ? exact : inCountry.filter((r) => r[3].split(',').some((a) => norm(a) === want));
  // Prefer populated places that are seats/capitals, then by population.
  const best = alt.sort((a, b) => Number(b[14]) - Number(a[14]))[0];
  if (!best) { report.push(`MISSING ${cc} ${find}`); continue; }
  const nameEn = en || find;
  let id = norm(nameEn).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (used.has(id)) id = `${id}_${cc.toLowerCase()}`;
  used.add(id);
  const lat = Number(Number(best[4]).toFixed(4));
  const lng = Number(Number(best[5]).toFixed(4));
  lines.push(`  ['${id}', '${ar}', ${JSON.stringify(nameEn)}, '${cc}', ${lat}, ${lng}, '${best[17]}'],`);
  report.push(`${cc} ${find.padEnd(20)} -> ${best[1]} (${best[7]}, pop ${best[14]}) ${lat},${lng} ${best[17]}`);
}

const usedCountries = [...new Set(PICKS.map((p) => p[0]))].sort();
const countryLines = usedCountries.map((cc) => `  ${cc}: [${JSON.stringify(COUNTRIES[cc][0])}, ${JSON.stringify(COUNTRIES[cc][1])}],`);

writeFileSync(out, `// Generated from GeoNames cities15000 (https://www.geonames.org, CC BY 4.0):
// coordinates and IANA time zones. Arabic names were added by hand.
// Regenerate with scripts/build-world-cities.mjs rather than editing rows one by one.

/** Country code -> [Arabic name, English name]. */
export const COUNTRY_NAMES: Record<string, [string, string]> = {
${countryLines.join('\n')}
};

/** [id, Arabic name, English name, country code, lat, lng, IANA time zone] */
export const WORLD_CITY_ROWS: [string, string, string, string, number, number, string][] = [
${lines.join('\n')}
];
`, 'utf8');
console.log(report.join('\n'));
console.log(`\n${lines.length} cities written, ${report.filter((r) => r.startsWith('MISSING')).length} missing`);
