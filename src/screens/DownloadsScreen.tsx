import React, { useState, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { AudioService, DownloadedLessonRecord } from '../services/audioService';
import { toArabicNumber } from '../services/prayerCalculation';
import { makeShadow } from '../constants/tokens';
import { usePalette } from '../theme/palette';

export const DownloadsScreen: React.FC = () => {
  const { goBack, t, triggerHaptic } = useApp();
  const p = usePalette();

  const [downloadedList, setDownloadedList] = useState<DownloadedLessonRecord[]>([]);

  const loadDownloads = async () => {
    const records = await AudioService.getDownloadedLessons();
    setDownloadedList(Object.values(records));
  };

  useEffect(() => {
    let alive = true;
    AudioService.getDownloadedLessons().then((records) => {
      if (alive) setDownloadedList(Object.values(records));
    });
    return () => { alive = false; };
  }, []);

  const handleDelete = async (lessonId: string, title: string) => {
    triggerHaptic('medium');
    await AudioService.deleteDownloadedLesson(lessonId);
    await loadDownloads();
  };

  // Estimate total storage
  const totalMB = downloadedList.reduce((acc, curr) => {
    const num = parseFloat(curr.sizeMB) || 16;
    return acc + num;
  }, 0);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Header
        title={t('إدارة التنزيلات والمساحة', 'Downloads & Storage')}
        subtitle={t(`${toArabicNumber(downloadedList.length)} دروس محفوظة للاستماع أوفلاين`, `${toArabicNumber(downloadedList.length)} lessons saved for offline listening`)}
        onBack={goBack}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Storage Summary Banner */}
        <View
          style={{
            backgroundColor: p.soft,
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: p.primary,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <View>
            <TextUI variant="caption" color={p.muted}>
              {t('المساحة المستخدمة من ذاكرة الهاتف', 'Phone storage used')}
            </TextUI>
            <TextUI variant="h1" size={24} color={p.primaryInk} style={{ marginTop: 4 }}>
              {toArabicNumber(totalMB.toFixed(1))} {t('ميجابايت', 'MB')}
            </TextUI>
          </View>

          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: p.surface,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Feather name="hard-drive" size={24} color={p.primary} />
          </View>
        </View>

        {downloadedList.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Feather name="download-cloud" size={48} color={p.muted} style={{ marginBottom: 12, opacity: 0.5 }} />
            <TextUI variant="h4" color={p.ink}>
              {t('لا توجد دروس محملة حالياً', 'No downloaded lessons yet')}
            </TextUI>
            <TextUI variant="caption" color={p.muted} style={{ marginTop: 4, textAlign: 'center' }}>
              {t('يمكنك تحميل دروس وسلاسل كراسي الحرمين الشريفين للاستماع إليها بدون اتصال بالإنترنت.', 'You can download lessons and series from the Two Holy Mosques study circles to listen to without an internet connection.')}
            </TextUI>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {downloadedList.map((item) => (
              <View
                key={item.lessonId}
                style={{
                  backgroundColor: p.surface,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: p.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  ...makeShadow('0 2px 6px rgba(0,0,0,0.02)', '#000', 0.02, 2)
                }}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <TextUI variant="h4" color={p.ink} numberOfLines={1}>
                    {item.titleAr}
                  </TextUI>
                  <TextUI variant="bodyMedium" color={p.primary} style={{ marginTop: 2 }}>
                    {t(item.scholarAr, item.scholarAr === 'المدرس بالحرم الشريف' ? 'Teacher at the Holy Mosque' : item.scholarAr)}
                  </TextUI>
                  <TextUI variant="caption" color={p.muted} style={{ marginTop: 2 }}>
                    💾 {t(item.sizeMB, item.sizeMB.replace('ميجابايت', 'MB'))} • {t(item.downloadedAt, item.downloadedAt === 'اليوم' ? 'Today' : item.downloadedAt)}
                  </TextUI>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleDelete(item.lessonId, item.titleAr)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: p.dangerBg,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Feather name="trash-2" size={16} color={p.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};
