export interface QuranPageSection {
  surahId: number;
  surahNameAr: string;
  surahNameEn: string;
  startAyah: number;
  endAyah: number;
  juz: number;
}

export interface QuranPageIndexItem {
  page: number;
  juzNumbers: number[];
  sections: QuranPageSection[];
}

export interface QuranJuzIndexItem {
  juz: number;
  startPage: number;
  endPage: number;
  startSurahId: number;
  startSurahNameAr: string;
  startAyah: number;
}

export interface QuranHizbIndexItem {
  hizb: number;             // 1 إلى 60
  juz: number;              // 1 إلى 30
  startSurahId: number;     // رقم السورة
  startSurahNameAr: string; // اسم السورة
  startAyah: number;        // رقم آية البداية
  startPage: number;        // رقم صفحة البداية بالمصحف
  beginningSnippet: string; // مطلع الحزب القرآني
}

const QURAN_DATA: any[] = require('../../assets/quran_complete_114.json');

export const QURAN_PAGE_INDEX: QuranPageIndexItem[] = (() => {
  const pageMap = new Map<number, QuranPageIndexItem>();

  QURAN_DATA.forEach((surah) => {
    (surah.pageMetadata || []).forEach((meta: any) => {
      const page = Number(meta.pageNum);
      if (!page) return;

      let item = pageMap.get(page);
      if (!item) {
        item = { page, juzNumbers: [], sections: [] };
        pageMap.set(page, item);
      }

      const juz = Number(meta.juz || surah.juz || 1);
      if (!item.juzNumbers.includes(juz)) item.juzNumbers.push(juz);
      if (!item.sections.some((section) => section.surahId === surah.id)) {
        item.sections.push({
          surahId: surah.id,
          surahNameAr: surah.nameAr,
          surahNameEn: surah.nameEn,
          startAyah: Number(meta.startAyah || 1),
          endAyah: Number(meta.endAyah || surah.verses),
          juz
        });
      }
    });
  });

  return Array.from(pageMap.values())
    .map((item) => ({
      ...item,
      juzNumbers: item.juzNumbers.sort((a, b) => a - b),
      sections: item.sections.sort((a, b) => a.surahId - b.surahId)
    }))
    .sort((a, b) => a.page - b.page);
})();

export const QURAN_JUZ_INDEX: QuranJuzIndexItem[] = Array.from({ length: 30 }, (_, index) => {
  const juz = index + 1;
  const pages = QURAN_PAGE_INDEX.filter((item) => item.juzNumbers.includes(juz));
  const firstPage = pages[0];
  const firstSection = firstPage?.sections.find((section) => section.juz === juz) || firstPage?.sections[0];

  return {
    juz,
    startPage: firstPage?.page || 1,
    endPage: pages[pages.length - 1]?.page || firstPage?.page || 1,
    startSurahId: firstSection?.surahId || 1,
    startSurahNameAr: firstSection?.surahNameAr || 'الفاتحة',
    startAyah: firstSection?.startAyah || 1
  };
});

export const QURAN_HIZB_INDEX: QuranHizbIndexItem[] = [
  { hizb: 1, juz: 1, startSurahId: 1, startSurahNameAr: 'الفاتحة', startAyah: 1, startPage: 1, beginningSnippet: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
  { hizb: 2, juz: 1, startSurahId: 2, startSurahNameAr: 'البقرة', startAyah: 75, startPage: 11, beginningSnippet: 'أَفَتَطْمَعُونَ أَن يُؤْمِنُوا لَكُمْ' },
  { hizb: 3, juz: 2, startSurahId: 2, startSurahNameAr: 'البقرة', startAyah: 142, startPage: 22, beginningSnippet: 'سَيَقُولُ السُّفَهَاءُ مِنَ النَّاسِ' },
  { hizb: 4, juz: 2, startSurahId: 2, startSurahNameAr: 'البقرة', startAyah: 203, startPage: 32, beginningSnippet: 'وَاذْكُرُوا اللَّهَ فِي أَيَّامٍ مَّعْدُودَاتٍ' },
  { hizb: 5, juz: 3, startSurahId: 2, startSurahNameAr: 'البقرة', startAyah: 253, startPage: 42, beginningSnippet: 'تِلْكَ الرُّسُلُ فَضَّلْنَا بَعْضَهُمْ عَلَىٰ بَعْضٍ' },
  { hizb: 6, juz: 3, startSurahId: 3, startSurahNameAr: 'آل عمران', startAyah: 15, startPage: 51, beginningSnippet: 'قُلْ أَؤُنَبِّئُكُم بِخَيْرٍ مِّن ذَٰلِكُمْ' },
  { hizb: 7, juz: 4, startSurahId: 3, startSurahNameAr: 'آل عمران', startAyah: 93, startPage: 62, beginningSnippet: 'كُلُّ الطَّعَامِ كَانَ حِلًّا لِّبَنِي إِسْرَائِيلَ' },
  { hizb: 8, juz: 4, startSurahId: 3, startSurahNameAr: 'آل عمران', startAyah: 171, startPage: 72, beginningSnippet: 'يَسْتَبْشِرُونَ بِنِعْمَةٍ مِّنَ اللَّهِ وَفَضْلٍ' },
  { hizb: 9, juz: 5, startSurahId: 4, startSurahNameAr: 'النساء', startAyah: 24, startPage: 82, beginningSnippet: 'وَالْمُحْصَنَاتُ مِنَ النِّسَاءِ' },
  { hizb: 10, juz: 5, startSurahId: 4, startSurahNameAr: 'النساء', startAyah: 88, startPage: 92, beginningSnippet: 'فَمَا لَكُمْ فِي الْمُنَافِقِينَ فِئَتَيْنِ' },
  { hizb: 11, juz: 6, startSurahId: 4, startSurahNameAr: 'النساء', startAyah: 148, startPage: 102, beginningSnippet: 'لَّا يُحِبُّ اللَّهُ الْجَهْرَ بِالسُّوءِ مِنَ الْقَوْلِ' },
  { hizb: 12, juz: 6, startSurahId: 5, startSurahNameAr: 'المائدة', startAyah: 27, startPage: 112, beginningSnippet: 'وَاتْلُ عَلَيْهِمْ نَبَأَ ابْنَيْ آدَمَ بِالْحَقِّ' },
  { hizb: 13, juz: 7, startSurahId: 5, startSurahNameAr: 'المائدة', startAyah: 82, startPage: 121, beginningSnippet: 'لَتَجِدَنَّ أَشَدَّ النَّاسِ عَدَاوَةً' },
  { hizb: 14, juz: 7, startSurahId: 6, startSurahNameAr: 'الأنعام', startAyah: 36, startPage: 131, beginningSnippet: 'إِنَّمَا يَسْتَجِيبُ الَّذِينَ يَسْمَعُونَ' },
  { hizb: 15, juz: 8, startSurahId: 6, startSurahNameAr: 'الأنعام', startAyah: 111, startPage: 142, beginningSnippet: 'وَلَوْ أَنَّنَا نَزَّلْنَا إِلَيْهِمُ الْمَلَائِكَةَ' },
  { hizb: 16, juz: 8, startSurahId: 7, startSurahNameAr: 'الأعراف', startAyah: 1, startPage: 151, beginningSnippet: 'المص ۚ كِتَابٌ أُنزِلَ إِلَيْكَ' },
  { hizb: 17, juz: 9, startSurahId: 7, startSurahNameAr: 'الأعراف', startAyah: 88, startPage: 161, beginningSnippet: 'قَالَ الْمَلَأُ الَّذِينَ اسْتَكْبَرُوا مِن قَوْمِهِ' },
  { hizb: 18, juz: 9, startSurahId: 7, startSurahNameAr: 'الأعراف', startAyah: 171, startPage: 173, beginningSnippet: 'وَإِذْ نَتَقْنَا الْجَبَلَ فَوْقَهُمْ كَأَنَّهُ ظُلَّةٌ' },
  { hizb: 19, juz: 10, startSurahId: 8, startSurahNameAr: 'الأنفال', startAyah: 41, startPage: 182, beginningSnippet: 'وَاعْلَمُوا أَنَّمَا غَنِمْتُم مِّن شَيْءٍ' },
  { hizb: 20, juz: 10, startSurahId: 9, startSurahNameAr: 'التوبة', startAyah: 34, startPage: 192, beginningSnippet: 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِنَّ كَثِيرًا مِّنَ الْأَحْبَارِ' },
  { hizb: 21, juz: 11, startSurahId: 9, startSurahNameAr: 'التوبة', startAyah: 93, startPage: 201, beginningSnippet: 'إِنَّمَا السَّبِيلُ عَلَى الَّذِينَ يَسْتَأْذِنُونَكَ' },
  { hizb: 22, juz: 11, startSurahId: 10, startSurahNameAr: 'يونس', startAyah: 26, startPage: 212, beginningSnippet: 'لِّلَّذِينَ أَحْسَنُوا الْحُسْنَىٰ وَزِيَادَةٌ' },
  { hizb: 23, juz: 12, startSurahId: 11, startSurahNameAr: 'هود', startAyah: 6, startPage: 222, beginningSnippet: 'وَمَا مِن دَابَّةٍ فِي الْأَرْضِ إِلَّا عَلَى اللَّهِ رِزْقُهَا' },
  { hizb: 24, juz: 12, startSurahId: 11, startSurahNameAr: 'هود', startAyah: 84, startPage: 231, beginningSnippet: 'وَإِلَىٰ مَدْيَنَ أَخَاهُمْ شُعَيْبًا' },
  { hizb: 25, juz: 13, startSurahId: 12, startSurahNameAr: 'يوسف', startAyah: 53, startPage: 242, beginningSnippet: 'وَمَا أُبَرِّئُ نَفْسِي ۚ إِنَّ النَّفْسَ لَأَمَّارَةٌ بِالسُّوءِ' },
  { hizb: 26, juz: 13, startSurahId: 13, startSurahNameAr: 'الرعد', startAyah: 19, startPage: 252, beginningSnippet: 'أَفَمَن يَعْلَمُ أَنَّمَا أُنزِلَ إِلَيْكَ مِن رَّبِّكَ الْحَقُّ' },
  { hizb: 27, juz: 14, startSurahId: 15, startSurahNameAr: 'الحجر', startAyah: 1, startPage: 262, beginningSnippet: 'الر ۚ تِلْكَ آيَاتُ الْكِتَابِ وَقُرْآنٍ مُّبِينٍ' },
  { hizb: 28, juz: 14, startSurahId: 16, startSurahNameAr: 'النحل', startAyah: 1, startPage: 267, beginningSnippet: 'أَتَىٰ أَمْرُ اللَّهِ فَلَا تَسْتَعْجِلُوهُ' },
  { hizb: 29, juz: 15, startSurahId: 17, startSurahNameAr: 'الإسراء', startAyah: 1, startPage: 282, beginningSnippet: 'سُبْحَانَ الَّذِي أَسْرَىٰ بِعَبْدِهِ لَيْلًا' },
  { hizb: 30, juz: 15, startSurahId: 18, startSurahNameAr: 'الكهف', startAyah: 17, startPage: 295, beginningSnippet: 'وَتَرَى الشَّمْسَ إِذَا طَلَعَت تَّزَاوَرُ عَن كَهْفِهِمْ' },
  { hizb: 31, juz: 16, startSurahId: 18, startSurahNameAr: 'الكهف', startAyah: 75, startPage: 302, beginningSnippet: 'قَالَ أَلَمْ أَقُل لَّكَ إِنَّكَ لَن تَسْتَطِيعَ مَعِيَ صَبْرًا' },
  { hizb: 32, juz: 16, startSurahId: 19, startSurahNameAr: 'مريم', startAyah: 59, startPage: 310, beginningSnippet: 'فَخَلَفَ مِن بَعْدِهِمْ خَلْفٌ أَضَاعُوا الصَّلَاةَ' },
  { hizb: 33, juz: 17, startSurahId: 21, startSurahNameAr: 'الأنبياء', startAyah: 1, startPage: 322, beginningSnippet: 'اقْتَرَبَ لِلنَّاسِ حِسَابُهُمْ وَهُمْ فِي غَفْلَةٍ مُّعْرِضُونَ' },
  { hizb: 34, juz: 17, startSurahId: 21, startSurahNameAr: 'الأنبياء', startAyah: 83, startPage: 329, beginningSnippet: 'وَأَيُّوبَ إِذْ نَادَىٰ رَبَّهُ أَنِّي مَسَّنِيَ الضُّرُّ' },
  { hizb: 35, juz: 18, startSurahId: 23, startSurahNameAr: 'المؤمنون', startAyah: 1, startPage: 342, beginningSnippet: 'قَدْ أَفْلَحَ الْمُؤْمِنُونَ' },
  { hizb: 36, juz: 18, startSurahId: 24, startSurahNameAr: 'النور', startAyah: 21, startPage: 352, beginningSnippet: 'يَا أَيُّهَا الَّذِينَ آمَنُوا لَا تَتَّبِعُوا خُطُوَاتِ الشَّيْطَانِ' },
  { hizb: 37, juz: 19, startSurahId: 25, startSurahNameAr: 'الفرقان', startAyah: 21, startPage: 362, beginningSnippet: 'وَقَالَ الَّذِينَ لَا يَرْجُونَ لِقَاءَنَا لَوْلَا أُنزِلَ عَلَيْنَا' },
  { hizb: 38, juz: 19, startSurahId: 26, startSurahNameAr: 'الشعراء', startAyah: 111, startPage: 372, beginningSnippet: 'قَالُوا أَنُؤْمِنُ لَكَ وَاتَّبَعَكَ الْأَرْذَلُونَ' },
  { hizb: 39, juz: 20, startSurahId: 27, startSurahNameAr: 'النمل', startAyah: 56, startPage: 382, beginningSnippet: 'فَمَا كَانَ جَوَابَ قَوْمِهِ إِلَّا أَن قَالُوا أَخْرِجُوا آلَ لُوطٍ' },
  { hizb: 40, juz: 20, startSurahId: 28, startSurahNameAr: 'القصص', startAyah: 51, startPage: 391, beginningSnippet: 'وَلَقَدْ وَصَّلْنَا لَهُمُ الْقَوْلَ لَعَلَّهُمْ يَتَذَكَّرُونَ' },
  { hizb: 41, juz: 21, startSurahId: 29, startSurahNameAr: 'العنكبوت', startAyah: 46, startPage: 402, beginningSnippet: 'وَلَا تُجَادِلُوا أَهْلَ الْكِتَابِ إِلَّا بِالَّتِي هِيَ أَحْسَنُ' },
  { hizb: 42, juz: 21, startSurahId: 31, startSurahNameAr: 'لقمان', startAyah: 22, startPage: 413, beginningSnippet: 'وَمَن يُسْلِمْ وَجْهَهُ إِلَى اللَّهِ وَهُوَ مُحْسِنٌ' },
  { hizb: 43, juz: 22, startSurahId: 33, startSurahNameAr: 'الأحزاب', startAyah: 31, startPage: 421, beginningSnippet: 'وَمَن يَقْنُتْ مِنكُنَّ لِلَّهِ وَرَسُولِهِ وَتَعْمَلْ صَالِحًا' },
  { hizb: 44, juz: 22, startSurahId: 34, startSurahNameAr: 'سبأ', startAyah: 24, startPage: 431, beginningSnippet: 'قُلْ مَن يَرْزُقُكُم مِّنَ السَّمَاوَاتِ وَالْأَرْضِ' },
  { hizb: 45, juz: 23, startSurahId: 36, startSurahNameAr: 'يس', startAyah: 28, startPage: 442, beginningSnippet: 'وَمَا أَنزَلْنَا عَلَىٰ قَوْمِهِ مِن بَعْدِهِ مِن جُندٍ' },
  { hizb: 46, juz: 23, startSurahId: 38, startSurahNameAr: 'ص', startAyah: 21, startPage: 454, beginningSnippet: 'وَهَلْ أَتَاكَ نَبَأُ الْخَصْمِ إِذْ تَسَوَّرُوا الْمِحْرَابَ' },
  { hizb: 47, juz: 24, startSurahId: 39, startSurahNameAr: 'الزمر', startAyah: 32, startPage: 462, beginningSnippet: 'فَمَنْ أَظْلَمُ مِمَّن كَذَبَ عَلَى اللَّهِ وَكَذَّبَ بِالصِّدْقِ' },
  { hizb: 48, juz: 24, startSurahId: 40, startSurahNameAr: 'غافر', startAyah: 41, startPage: 472, beginningSnippet: 'وَيَا قَوْمِ مَا لِي أَدْعُوكُمْ إِلَى النَّجَاةِ وَتَدْعُونَنِي' },
  { hizb: 49, juz: 25, startSurahId: 41, startSurahNameAr: 'فصلت', startAyah: 47, startPage: 482, beginningSnippet: 'إِلَيْهِ يُرَدُّ عِلْمُ السَّاعَةِ' },
  { hizb: 50, juz: 25, startSurahId: 43, startSurahNameAr: 'الزخرف', startAyah: 24, startPage: 491, beginningSnippet: 'قَالَ أَوَلَوْ جِئْتُكُم بِأَهْدَىٰ مِمَّا وَجَدتُّمْ عَلَيْهِ آبَاءَكُمْ' },
  { hizb: 51, juz: 26, startSurahId: 46, startSurahNameAr: 'الأحقاف', startAyah: 1, startPage: 502, beginningSnippet: 'حم ۚ تَنزِيلُ الْكِتَابِ مِنَ اللَّهِ الْعَزِيزِ الْحَكِيمِ' },
  { hizb: 52, juz: 26, startSurahId: 49, startSurahNameAr: 'الحجرات', startAyah: 14, startPage: 517, beginningSnippet: 'قَالَتِ الْأَعْرَابُ آمَنَّا ۖ قُل لَّمْ تُؤْمِنُوا وَلَٰكِن قُولُوا أَسْلَمْنَا' },
  { hizb: 53, juz: 27, startSurahId: 51, startSurahNameAr: 'الذاريات', startAyah: 31, startPage: 522, beginningSnippet: 'قَالَ فَمَا خَطْبُكُمْ أَيُّهَا الْمُرْسَلُونَ' },
  { hizb: 54, juz: 27, startSurahId: 55, startSurahNameAr: 'الرحمن', startAyah: 1, startPage: 531, beginningSnippet: 'الرَّحْمَٰنُ ۚ عَلَّمَ الْقُرْآنَ' },
  { hizb: 55, juz: 28, startSurahId: 58, startSurahNameAr: 'المجادلة', startAyah: 1, startPage: 542, beginningSnippet: 'قَدْ سَمِعَ اللَّهُ قَوْلَ الَّتِي تُجَادِلُكَ فِي زَوْجِهَا' },
  { hizb: 56, juz: 28, startSurahId: 62, startSurahNameAr: 'الجمعة', startAyah: 1, startPage: 553, beginningSnippet: 'يُسَبِّحُ لِلَّهِ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ الْمَلِكِ' },
  { hizb: 57, juz: 29, startSurahId: 67, startSurahNameAr: 'الملك', startAyah: 1, startPage: 562, beginningSnippet: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ' },
  { hizb: 58, juz: 29, startSurahId: 72, startSurahNameAr: 'الجن', startAyah: 1, startPage: 572, beginningSnippet: 'قُلْ أُوحِيَ إِلَيَّ أَنَّهُ اسْتَمَعَ نَفَرٌ مِّنَ الْجِنِّ' },
  { hizb: 59, juz: 30, startSurahId: 78, startSurahNameAr: 'النبأ', startAyah: 1, startPage: 582, beginningSnippet: 'عَمَّ يَتَسَاءَلُونَ ۚ عَنِ النَّبَإِ الْعَظِيمِ' },
  { hizb: 60, juz: 30, startSurahId: 87, startSurahNameAr: 'الأعلى', startAyah: 1, startPage: 591, beginningSnippet: 'سَبِّحِ اسْمَ رَبِّكَ الْأَعْلَى' }
];
