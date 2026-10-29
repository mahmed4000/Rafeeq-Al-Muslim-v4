import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal, TextInput, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { searchCities } from '../constants/cities';
import { TOKENS, makeShadow } from '../constants/tokens';
import { NotificationService } from '../services/notificationService';
import { computeNightTimes } from '../services/prayerCalculation';
import { cityNow } from '../services/cityTime';
import { usePalette } from '../theme/palette';

export const PrayerTimesScreen: React.FC = () => {
  const {
    navigate,
    t,
    currentCity,
    setCurrentCity,
    prayerTimes,
    prayerBells,
    togglePrayerBell,
    calculationMethod,
    setCalculationMethod,
    asrMethod,
    setAsrMethod,
    refreshLocation,
    triggerHaptic
  } = useApp();

  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [calcModalVisible, setCalcModalVisible] = useState(false);

  const p = usePalette();

  const prayers = [
    { key: 'fajr' as const, nameAr: 'الفجر', nameEn: 'Fajr', time: prayerTimes.fajr.timeStr, icon: 'sunrise' as const, note: 'وقت الامتناع عن المفطرات' },
    { key: 'sunrise' as const, nameAr: 'الشروق', nameEn: 'Sunrise', time: prayerTimes.sunrise.timeStr, icon: 'sun' as const, note: 'شروق الشمس ونهاية وقت الفجر' },
    { key: 'dhuhr' as const, nameAr: 'الظهر', nameEn: 'Dhuhr', time: prayerTimes.dhuhr.timeStr, icon: 'sun' as const, note: 'زوال الشمس عن كبد السماء' },
    { key: 'asr' as const, nameAr: 'العصر', nameEn: 'Asr', time: prayerTimes.asr.timeStr, icon: 'clock' as const, note: 'مصير ظل الشيء مثله' },
    { key: 'maghrib' as const, nameAr: 'المغرب', nameEn: 'Maghrib', time: prayerTimes.maghrib.timeStr, icon: 'sunset' as const, note: 'غروب قرص الشمس تماماً' },
    { key: 'isha' as const, nameAr: 'العشاء', nameEn: 'Isha', time: prayerTimes.isha.timeStr, icon: 'moon' as const, note: 'مغيب الشفق الأحمر' }
  ];

  const filteredCities = searchCities(citySearch, currentCity.countryCode);

  const calcMethods = [
    { id: 'umm_al_qura' as const, titleAr: 'أم القرى (المملكة العربية السعودية)', titleEn: 'Umm Al-Qura (Saudi Arabia)', note: 'الفجر 18.5° • العشاء 90 دقيقة بعد المغرب' },
    { id: 'egypt' as const, titleAr: 'الهيئة المصرية العامة للمساحة', titleEn: 'Egyptian General Authority', note: 'الفجر 19.5° • العشاء 17.5°' },
    { id: 'mwl' as const, titleAr: 'رابطة العالم الإسلامي (مكة المكرمة)', titleEn: 'Muslim World League', note: 'الفجر 18° • العشاء 17°' },
    { id: 'isna' as const, titleAr: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)', titleEn: 'ISNA', note: 'الفجر 15° • العشاء 15°' }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Header
        title={t('مواقيت الصلاة والأذان', 'Prayer Times & Adhan')}
        subtitle={`${currentCity.nameAr} • ${currentCity.countryAr}`}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* City & Location Banner */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: p.surface,
            borderRadius: 16,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: p.border
          }}
        >
          <View style={{ flex: 1 }}>
            <TextUI variant="caption" color={p.muted}>
              {t('المدينة الحالية', 'Current City')}
            </TextUI>
            <TextUI variant="h3" color={p.ink}>
              {currentCity.nameAr}
            </TextUI>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={refreshLocation}
              style={{
                padding: 10,
                borderRadius: TOKENS.radius.pill,
                backgroundColor: p.soft
              }}
            >
              <Feather name="navigation" size={16} color={p.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setCityModalVisible(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: TOKENS.radius.pill,
                backgroundColor: p.primary
              }}
            >
              <Feather name="globe" size={14} color={p.onPrimary} />
              <TextUI variant="captionBold" color={p.onPrimary}>
                {t('تغيير المدينة', 'Change')}
              </TextUI>
            </TouchableOpacity>
          </View>
        </View>

        {/* 6 Prayer Times Cards */}
        <View style={{ gap: 10, marginBottom: 20 }}>
          {prayers.map((pr) => {
            const hasBell = pr.key !== 'sunrise' ? prayerBells[pr.key] : false;
            return (
              <View
                key={pr.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: p.surface,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: p.border,
                  ...makeShadow('0 2px 8px rgba(0,0,0,0.03)', '#000', 0.03, 2)
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: p.soft,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Feather name={pr.icon as any} size={20} color={p.primary} />
                  </View>

                  <View>
                    <TextUI cairo size={13} weight="bold" color={p.ink}>
                      {pr.nameAr}
                    </TextUI>
                    <TextUI variant="caption" color={p.muted}>
                      {pr.note}
                    </TextUI>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <TextUI variant="h2" color={p.primaryInk}>
                    {pr.time}
                  </TextUI>

                  {pr.key !== 'sunrise' && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => togglePrayerBell(pr.key)}
                      style={{
                        padding: 8,
                        borderRadius: 20,
                        backgroundColor: hasBell ? p.soft : 'transparent'
                      }}
                    >
                      <Feather
                        name={hasBell ? 'bell' : 'bell-off'}
                        size={18}
                        color={hasBell ? p.accentInk : p.muted}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Night times (Maghrib → Fajr) */}
        {(() => {
          const night = computeNightTimes(currentCity.lat, currentCity.lng, cityNow(currentCity.timeZone), calculationMethod, asrMethod, currentCity.timeZone);
          return (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              {[
                { label: t('منتصف الليل', 'Midnight'), value: night.midnight },
                { label: t('الثلث الأخير', 'Last third'), value: night.lastThird }
              ].map((item) => (
                <View key={item.label} style={{ flex: 1, backgroundColor: p.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.border }}>
                  <TextUI variant="caption" color={p.muted}>{item.label}</TextUI>
                  <TextUI variant="h3" color={p.ink}>{item.value}</TextUI>
                </View>
              ))}
            </View>
          );
        })()}

        {/* Shortcuts: monthly table, alerts, qibla */}
        <View style={{ backgroundColor: p.surface, borderRadius: 18, borderWidth: 1, borderColor: p.border, marginBottom: 20, overflow: 'hidden' }}>
          {[
            { key: 'prayer_month', label: t('مواقيت الشهر', 'Monthly times'), icon: 'calendar' as const },
            { key: 'adhan_settings', label: t('الأذان والإقامة', 'Adhan & iqama alerts'), icon: 'bell' as const },
            { key: 'qibla', label: t('اتجاه القبلة', 'Qibla'), icon: 'compass' as const }
          ].map((item, i) => (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.8}
              accessibilityRole="button"
              onPress={() => navigate(item.key)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 52, borderTopWidth: i ? 1 : 0, borderColor: p.border }}
            >
              <Feather name={item.icon} size={18} color={p.primary} />
              <TextUI size={15} weight="medium" color={p.ink} style={{ flex: 1 }}>{item.label}</TextUI>
              <Feather name="chevron-left" size={18} color={p.muted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Settings & Calculation Method Selectors */}
        <View
          style={{
            backgroundColor: p.surface,
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: p.border,
            gap: 14,
            marginBottom: 20
          }}
        >
          <TextUI size={15} weight="bold" color={p.ink}>
            {t('طريقة الحساب الفلكي والمذهب', 'Calculation Method & Fiqh')}
          </TextUI>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setCalcModalVisible(true)}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderColor: p.border
            }}
          >
            <View>
              <TextUI size={12} color={p.muted}>
                {t('طريقة حساب المواقيت', 'Authority')}
              </TextUI>
              <TextUI size={14} weight="bold" color={p.primary}>
                {calcMethods.find((m) => m.id === calculationMethod)?.titleAr}
              </TextUI>
            </View>
            <Feather name="chevron-left" size={18} color={p.muted} />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <TextUI size={12} color={p.muted}>
                {t('مذهب حساب صلاة العصر', 'Asr Juristic Method')}
              </TextUI>
              <TextUI size={14} weight="bold" color={p.ink}>
                {asrMethod === 'standard' ? 'جمهور الفقهاء (الشافعي والمالكي وأحمد)' : 'المذهب الحنفي (مصير الظل مثليه)'}
              </TextUI>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic('light');
                setAsrMethod(asrMethod === 'standard' ? 'hanafi' : 'standard');
              }}
              style={{
                backgroundColor: p.soft,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: TOKENS.radius.pill
              }}
            >
              <TextUI size={12} weight="bold" color={p.primary}>
                {t('تبديل', 'Toggle')}
              </TextUI>
            </TouchableOpacity>
          </View>
        </View>

        {/* Test Notification Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={async () => {
            triggerHaptic('medium');
            await NotificationService.sendTestNotification(currentCity.nameAr);
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: p.soft,
            paddingVertical: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: p.accent
          }}
        >
          <Feather name="bell" size={16} color={p.primaryInk} />
          <TextUI size={14} weight="bold" color={p.primaryInk}>
            {t('تجربة صوت الأذان والتنبيه', 'Test Adhan Notification')}
          </TextUI>
        </TouchableOpacity>
      </ScrollView>

      {/* City Selector Modal */}
      <Modal visible={cityModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              height: '75%',
              backgroundColor: p.bg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <TextUI size={18} weight="bold" color={p.ink}>
                {t('اختر المدينة', 'Select City')}
              </TextUI>
              <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                <Feather name="x" size={22} color={p.ink} />
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder={t('ابحث عن دولة أو مدينة...', 'Search city or country...')}
              placeholderTextColor={p.muted}
              value={citySearch}
              onChangeText={setCitySearch}
              style={{
                backgroundColor: p.surface,
                borderRadius: 12,
                padding: 12,
                color: p.ink,
                borderWidth: 1,
                borderColor: p.border,
                marginBottom: 14,
                textAlign: 'right'
              }}
            />

            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <TextUI size={13} color={p.muted} align="center" style={{ paddingVertical: 24, lineHeight: 22 }}>
                  {t('لا توجد مدينة بهذا الاسم. جرّب اسمًا آخر أو استخدم موقعك الحالي.', 'No city found. Try another name or use your location.')}
                </TextUI>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    triggerHaptic('light');
                    setCurrentCity(item);
                    setCityModalVisible(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderColor: p.border
                  }}
                >
                  <View>
                    <TextUI size={15} weight="bold" color={p.ink}>
                      {item.nameAr}
                    </TextUI>
                    <TextUI size={12} color={p.muted}>
                      {item.country}
                    </TextUI>
                  </View>
                  {item.id === currentCity.id && (
                    <Feather name="check" size={18} color={p.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Calculation Method Modal */}
      <Modal visible={calcModalVisible} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: p.bg, borderRadius: 20, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <TextUI size={18} weight="bold" color={p.ink}>
                {t('طريقة الحساب الفلكي', 'Calculation Method')}
              </TextUI>
              <TouchableOpacity onPress={() => setCalcModalVisible(false)}>
                <Feather name="x" size={20} color={p.ink} />
              </TouchableOpacity>
            </View>

            {calcMethods.map((m) => (
              <TouchableOpacity
                key={m.id}
                activeOpacity={0.8}
                onPress={() => {
                  triggerHaptic('light');
                  setCalculationMethod(m.id);
                  setCalcModalVisible(false);
                }}
                style={{
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderColor: p.border
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <TextUI size={14} weight="bold" color={m.id === calculationMethod ? p.primary : p.ink}>
                      {m.titleAr}
                    </TextUI>
                    <TextUI size={11} color={p.muted} style={{ marginTop: 2 }}>
                      {m.note}
                    </TextUI>
                  </View>
                  {m.id === calculationMethod && (
                    <Feather name="check" size={18} color={p.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};
