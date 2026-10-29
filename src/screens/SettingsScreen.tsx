import React from 'react';
import { View, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { usePalette } from '../theme/palette';
import { NotificationService } from '../services/notificationService';

export const SettingsScreen: React.FC = () => {
  const {
    goBack,
    navigate,
    themeMode,
    setThemeMode,
    lang,
    setLang,
    t,
    currentCity,
    calculationMethod,
    setCalculationMethod,
    asrMethod,
    setAsrMethod,
    triggerHaptic
  } = useApp();

  const p = usePalette();

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Header
        title={t('الإعدادات والتفضيلات', 'Settings & Preferences')}
        subtitle={t('تخصيص المظهر والحسابات والتنبيهات', 'Theme, Calculations & Audio')}
        onBack={goBack}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Theme Setting */}
        <View style={{ backgroundColor: p.surface, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: p.border }}>
          <TextUI variant="h4" color={p.ink} style={{ marginBottom: 12 }}>
            {t('المظهر العام', 'Appearance')}
          </TextUI>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic('light');
                setThemeMode('light');
              }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: themeMode === 'light' ? p.soft : p.bgAlt,
                borderWidth: 1,
                borderColor: themeMode === 'light' ? p.primary : p.border
              }}
            >
              <Feather name="sun" size={16} color={themeMode === 'light' ? p.primary : p.muted} />
              <TextUI variant="bodyMedium" weight="bold" color={themeMode === 'light' ? p.primaryInk : p.ink}>
                أندلسي نهاري
              </TextUI>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic('light');
                setThemeMode('dark');
              }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: themeMode === 'dark' ? p.soft : p.bgAlt,
                borderWidth: 1,
                borderColor: themeMode === 'dark' ? p.primary : p.border
              }}
            >
              <Feather name="moon" size={16} color={themeMode === 'dark' ? p.primary : p.muted} />
              <TextUI variant="bodyMedium" weight="bold" color={themeMode === 'dark' ? p.primaryInk : p.ink}>
                أندلسي ليلي
              </TextUI>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Language Setting */}
        <View style={{ backgroundColor: p.surface, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: p.border }}>
          <TextUI variant="h4" color={p.ink} style={{ marginBottom: 12 }}>
            {t('لغة التطبيق', 'App Language')}
          </TextUI>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic('light');
                setLang('ar');
              }}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: lang === 'ar' ? p.soft : p.bgAlt,
                borderWidth: 1,
                borderColor: lang === 'ar' ? p.primary : p.border
              }}
            >
              <TextUI variant="bodyMedium" weight="bold" color={lang === 'ar' ? p.primaryInk : p.ink}>
                العربية (افتراضي)
              </TextUI>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic('light');
                setLang('en');
              }}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                alignItems: 'center',
                backgroundColor: lang === 'en' ? p.soft : p.bgAlt,
                borderWidth: 1,
                borderColor: lang === 'en' ? p.primary : p.border
              }}
            >
              <TextUI variant="bodyMedium" weight="bold" color={lang === 'en' ? p.primaryInk : p.ink}>
                English
              </TextUI>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Notification Test */}
        <View style={{ backgroundColor: p.surface, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: p.border }}>
          <TextUI variant="h4" color={p.ink} style={{ marginBottom: 12 }}>
            {t('تنبيهات الأذان والصلوات', 'Adhan Notifications')}
          </TextUI>

          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            onPress={() => navigate('adhan_settings')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, marginBottom: 10 }}
          >
            <Feather name="sliders" size={18} color={p.primary} />
            <TextUI variant="h4" color={p.ink} style={{ flex: 1 }}>
              {t('الأذان والإقامة لكل صلاة', 'Adhan & iqama per prayer')}
            </TextUI>
            <Feather name="chevron-left" size={18} color={p.muted} />
          </TouchableOpacity>

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
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: p.accent
            }}
          >
            <Feather name="bell" size={16} color={p.primaryInk} />
            <TextUI variant="bodyMedium" weight="bold" color={p.primaryInk}>
              {t('إرسال تنبيه أذان تجريبي الآن', 'Send Test Adhan Alert')}
            </TextUI>
          </TouchableOpacity>
        </View>

        {/* 4. Offline Downloads Manager */}
        <View style={{ backgroundColor: p.surface, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: p.border }}>
          <TextUI variant="h4" color={p.ink} style={{ marginBottom: 8 }}>
            {t('التخزين والملفات المحملة', 'Storage & Downloads')}
          </TextUI>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigate('downloads')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 10
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Feather name="download-cloud" size={18} color={p.primary} />
              <View>
                <TextUI variant="h4" color={p.ink}>
                  {t('إدارة التنزيلات والمساحة', 'Manage Downloads & Space')}
                </TextUI>
                <TextUI variant="caption" color={p.muted}>
                  {t('عرض الدروس المحملة وتفريغ ذاكرة الهاتف', 'View offline lessons and free storage')}
                </TextUI>
              </View>
            </View>
            <Feather name="chevron-left" size={18} color={p.muted} />
          </TouchableOpacity>
        </View>

        {/* 4. About & Waqf Note */}
        <View
          style={{
            backgroundColor: p.soft,
            borderRadius: 18,
            padding: 18,
            borderWidth: 1,
            borderColor: p.primary,
            alignItems: 'center'
          }}
        >
          <TextUI size={16} weight="bold" color={p.primaryInk} style={{ marginBottom: 6 }}>
            رفيق المسلم | Almosala Pro
          </TextUI>
          <TextUI size={12} color={p.muted} style={{ textAlign: 'center', lineHeight: 20 }}>
            تطبيق إسلامي شامل وقف لله تعالى، خالٍ من الإعلانات تماماً وبأعلى معايير الخصوصية والجودة التقنية.
          </TextUI>
          <TextUI size={11} color={p.accentInk} style={{ marginTop: 8 }}>
            الإصدار ٢٠٢٦ • الإصدار ٢.١.٠ المعماري
          </TextUI>
          <TextUI size={11} color={p.muted} style={{ marginTop: 6, textAlign: 'center' }}>
            إحداثيات المدن ومناطقها الزمنية من GeoNames (geonames.org) برخصة CC BY 4.0
          </TextUI>
        </View>
      </ScrollView>
    </View>
  );
};
