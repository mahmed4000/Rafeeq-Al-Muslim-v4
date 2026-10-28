import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal, TextInput, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { CITIES } from '../constants/cities';
import { TOKENS, makeShadow } from '../constants/tokens';
import { NotificationService } from '../services/notificationService';

export const PrayerTimesScreen: React.FC = () => {
  const {
    goBack,
    theme,
    themeMode,
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

  const c = theme;

  const prayers = [
    { key: 'fajr' as const, nameAr: 'الفجر', nameEn: 'Fajr', time: prayerTimes.fajr.timeStr, icon: 'sunrise' as const, note: 'وقت الامتناع عن المفطرات' },
    { key: 'sunrise' as const, nameAr: 'الشروق', nameEn: 'Sunrise', time: prayerTimes.sunrise.timeStr, icon: 'sun' as const, note: 'شروق الشمس ونهاية وقت الفجر' },
    { key: 'dhuhr' as const, nameAr: 'الظهر', nameEn: 'Dhuhr', time: prayerTimes.dhuhr.timeStr, icon: 'sun' as const, note: 'زوال الشمس عن كبد السماء' },
    { key: 'asr' as const, nameAr: 'العصر', nameEn: 'Asr', time: prayerTimes.asr.timeStr, icon: 'clock' as const, note: 'مصير ظل الشيء مثله' },
    { key: 'maghrib' as const, nameAr: 'المغرب', nameEn: 'Maghrib', time: prayerTimes.maghrib.timeStr, icon: 'sunset' as const, note: 'غروب قرص الشمس تماماً' },
    { key: 'isha' as const, nameAr: 'العشاء', nameEn: 'Isha', time: prayerTimes.isha.timeStr, icon: 'moon' as const, note: 'مغيب الشفق الأحمر' }
  ];

  const filteredCities = CITIES.filter(
    (city) =>
      city.nameAr.includes(citySearch) ||
      city.nameEn.toLowerCase().includes(citySearch.toLowerCase()) ||
      city.country.includes(citySearch)
  );

  const calcMethods = [
    { id: 'umm_al_qura' as const, titleAr: 'أم القرى (المملكة العربية السعودية)', titleEn: 'Umm Al-Qura (Saudi Arabia)', note: 'الفجر 18.5° • العشاء 90 دقيقة بعد المغرب' },
    { id: 'egypt' as const, titleAr: 'الهيئة المصرية العامة للمساحة', titleEn: 'Egyptian General Authority', note: 'الفجر 19.5° • العشاء 17.5°' },
    { id: 'mwl' as const, titleAr: 'رابطة العالم الإسلامي (مكة المكرمة)', titleEn: 'Muslim World League', note: 'الفجر 18° • العشاء 17°' },
    { id: 'isna' as const, titleAr: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)', titleEn: 'ISNA', note: 'الفجر 15° • العشاء 15°' }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        title={t('مواقيت الصلاة والأذان', 'Prayer Times & Adhan')}
        subtitle={`${currentCity.nameAr} • ${currentCity.countryAr}`}
        onBack={goBack}
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
            backgroundColor: c.surface,
            borderRadius: 16,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: c.border
          }}
        >
          <View style={{ flex: 1 }}>
            <TextUI variant="caption" color={c.textSecondary}>
              {t('المدينة الحالية', 'Current City')}
            </TextUI>
            <TextUI variant="h3" color={c.textPrimary}>
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
                backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20'
              }}
            >
              <Feather name="navigation" size={16} color={TOKENS.colors.primary} />
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
                backgroundColor: TOKENS.colors.primary
              }}
            >
              <Feather name="globe" size={14} color="#FFFFFF" />
              <TextUI variant="captionBold" color="#FFFFFF">
                {t('تغيير المدينة', 'Change')}
              </TextUI>
            </TouchableOpacity>
          </View>
        </View>

        {/* 6 Prayer Times Cards */}
        <View style={{ gap: 10, marginBottom: 20 }}>
          {prayers.map((p) => {
            const hasBell = p.key !== 'sunrise' ? prayerBells[p.key] : false;
            return (
              <View
                key={p.key}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: c.surface,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: c.border,
                  ...makeShadow('0 2px 8px rgba(0,0,0,0.03)', '#000', 0.03, 2)
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382E28',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Feather name={p.icon as any} size={20} color={TOKENS.colors.primary} />
                  </View>

                  <View>
                    <TextUI cairo size={13} weight="bold" color={c.textPrimary}>
                      {p.nameAr}
                    </TextUI>
                    <TextUI variant="caption" color={c.textSecondary}>
                      {p.note}
                    </TextUI>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <TextUI variant="h2" color={TOKENS.colors.primaryDark}>
                    {p.time}
                  </TextUI>

                  {p.key !== 'sunrise' && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => togglePrayerBell(p.key)}
                      style={{
                        padding: 8,
                        borderRadius: 20,
                        backgroundColor: hasBell ? (themeMode === 'light' ? '#FFF5EA' : '#382A20') : 'transparent'
                      }}
                    >
                      <Feather
                        name={hasBell ? 'bell' : 'bell-off'}
                        size={18}
                        color={hasBell ? TOKENS.colors.secondary : c.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Settings & Calculation Method Selectors */}
        <View
          style={{
            backgroundColor: c.surface,
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: c.border,
            gap: 14,
            marginBottom: 20
          }}
        >
          <TextUI size={15} weight="bold" color={c.textPrimary}>
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
              borderColor: c.border
            }}
          >
            <View>
              <TextUI size={12} color={c.textSecondary}>
                {t('طريقة حساب المواقيت', 'Authority')}
              </TextUI>
              <TextUI size={14} weight="bold" color={TOKENS.colors.primary}>
                {calcMethods.find((m) => m.id === calculationMethod)?.titleAr}
              </TextUI>
            </View>
            <Feather name="chevron-left" size={18} color={c.textSecondary} />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <TextUI size={12} color={c.textSecondary}>
                {t('مذهب حساب صلاة العصر', 'Asr Juristic Method')}
              </TextUI>
              <TextUI size={14} weight="bold" color={c.textPrimary}>
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
                backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: TOKENS.radius.pill
              }}
            >
              <TextUI size={12} weight="bold" color={TOKENS.colors.primary}>
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
            backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382E28',
            paddingVertical: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: TOKENS.colors.secondary
          }}
        >
          <Feather name="bell" size={16} color={TOKENS.colors.primaryDark} />
          <TextUI size={14} weight="bold" color={TOKENS.colors.primaryDark}>
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
              backgroundColor: c.bg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <TextUI size={18} weight="bold" color={c.textPrimary}>
                {t('اختر المدينة', 'Select City')}
              </TextUI>
              <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                <Feather name="x" size={22} color={c.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder={t('ابحث عن دولة أو مدينة...', 'Search city or country...')}
              placeholderTextColor={c.textSecondary}
              value={citySearch}
              onChangeText={setCitySearch}
              style={{
                backgroundColor: c.surface,
                borderRadius: 12,
                padding: 12,
                color: c.textPrimary,
                borderWidth: 1,
                borderColor: c.border,
                marginBottom: 14,
                textAlign: 'right'
              }}
            />

            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item.id}
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
                    borderColor: c.border
                  }}
                >
                  <View>
                    <TextUI size={15} weight="bold" color={c.textPrimary}>
                      {item.nameAr}
                    </TextUI>
                    <TextUI size={12} color={c.textSecondary}>
                      {item.country}
                    </TextUI>
                  </View>
                  {item.id === currentCity.id && (
                    <Feather name="check" size={18} color={TOKENS.colors.primary} />
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
          <View style={{ backgroundColor: c.bg, borderRadius: 20, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <TextUI size={18} weight="bold" color={c.textPrimary}>
                {t('طريقة الحساب الفلكي', 'Calculation Method')}
              </TextUI>
              <TouchableOpacity onPress={() => setCalcModalVisible(false)}>
                <Feather name="x" size={20} color={c.textPrimary} />
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
                  borderColor: c.border
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <TextUI size={14} weight="bold" color={m.id === calculationMethod ? TOKENS.colors.primary : c.textPrimary}>
                      {m.titleAr}
                    </TextUI>
                    <TextUI size={11} color={c.textSecondary} style={{ marginTop: 2 }}>
                      {m.note}
                    </TextUI>
                  </View>
                  {m.id === calculationMethod && (
                    <Feather name="check" size={18} color={TOKENS.colors.primary} />
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
