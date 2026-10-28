import React from 'react';
import { View, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { TOKENS } from '../constants/tokens';
import { NotificationService } from '../services/notificationService';

export const SettingsScreen: React.FC = () => {
  const {
    goBack,
    navigate,
    theme,
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

  const c = theme;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
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
        <View style={{ backgroundColor: c.surface, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: c.border }}>
          <TextUI variant="h4" color={c.textPrimary} style={{ marginBottom: 12 }}>
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
                backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : c.bgSecondary,
                borderWidth: 1,
                borderColor: themeMode === 'light' ? TOKENS.colors.primary : c.border
              }}
            >
              <Feather name="sun" size={16} color={themeMode === 'light' ? TOKENS.colors.primary : c.textSecondary} />
              <TextUI variant="bodyMedium" weight="bold" color={themeMode === 'light' ? TOKENS.colors.primaryDark : c.textPrimary}>
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
                backgroundColor: themeMode === 'dark' ? '#382A20' : c.bgSecondary,
                borderWidth: 1,
                borderColor: themeMode === 'dark' ? TOKENS.colors.secondary : c.border
              }}
            >
              <Feather name="moon" size={16} color={themeMode === 'dark' ? TOKENS.colors.secondary : c.textSecondary} />
              <TextUI variant="bodyMedium" weight="bold" color={themeMode === 'dark' ? '#FFFFFF' : c.textPrimary}>
                أندلسي ليلي
              </TextUI>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Language Setting */}
        <View style={{ backgroundColor: c.surface, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: c.border }}>
          <TextUI variant="h4" color={c.textPrimary} style={{ marginBottom: 12 }}>
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
                backgroundColor: lang === 'ar' ? (themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20') : c.bgSecondary,
                borderWidth: 1,
                borderColor: lang === 'ar' ? TOKENS.colors.primary : c.border
              }}
            >
              <TextUI variant="bodyMedium" weight="bold" color={lang === 'ar' ? TOKENS.colors.primaryDark : c.textPrimary}>
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
                backgroundColor: lang === 'en' ? (themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20') : c.bgSecondary,
                borderWidth: 1,
                borderColor: lang === 'en' ? TOKENS.colors.primary : c.border
              }}
            >
              <TextUI variant="bodyMedium" weight="bold" color={lang === 'en' ? TOKENS.colors.primaryDark : c.textPrimary}>
                English
              </TextUI>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Notification Test */}
        <View style={{ backgroundColor: c.surface, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: c.border }}>
          <TextUI variant="h4" color={c.textPrimary} style={{ marginBottom: 12 }}>
            {t('تنبيهات الأذان والصلوات', 'Adhan Notifications')}
          </TextUI>

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
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: TOKENS.colors.secondary
            }}
          >
            <Feather name="bell" size={16} color={TOKENS.colors.primaryDark} />
            <TextUI variant="bodyMedium" weight="bold" color={TOKENS.colors.primaryDark}>
              {t('إرسال تنبيه أذان تجريبي الآن', 'Send Test Adhan Alert')}
            </TextUI>
          </TouchableOpacity>
        </View>

        {/* 4. Offline Downloads Manager */}
        <View style={{ backgroundColor: c.surface, borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: c.border }}>
          <TextUI variant="h4" color={c.textPrimary} style={{ marginBottom: 8 }}>
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
              <Feather name="download-cloud" size={18} color={TOKENS.colors.primary} />
              <View>
                <TextUI variant="h4" color={c.textPrimary}>
                  {t('إدارة التنزيلات والمساحة', 'Manage Downloads & Space')}
                </TextUI>
                <TextUI variant="caption" color={c.textSecondary}>
                  {t('عرض الدروس المحملة وتفريغ ذاكرة الهاتف', 'View offline lessons and free storage')}
                </TextUI>
              </View>
            </View>
            <Feather name="chevron-left" size={18} color={c.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 4. About & Waqf Note */}
        <View
          style={{
            backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#2A201A',
            borderRadius: 18,
            padding: 18,
            borderWidth: 1,
            borderColor: TOKENS.colors.primary,
            alignItems: 'center'
          }}
        >
          <TextUI size={16} weight="bold" color={TOKENS.colors.primaryDark} style={{ marginBottom: 6 }}>
            رفيق المسلم | Almosala Pro
          </TextUI>
          <TextUI size={12} color={c.textSecondary} style={{ textAlign: 'center', lineHeight: 20 }}>
            تطبيق إسلامي شامل وقف لله تعالى، خالٍ من الإعلانات تماماً وبأعلى معايير الخصوصية والجودة التقنية.
          </TextUI>
          <TextUI size={11} color={TOKENS.colors.secondary} style={{ marginTop: 8 }}>
            الإصدار ٢٠٢٦ • الإصدار ٢.١.٠ المعماري
          </TextUI>
        </View>
      </ScrollView>
    </View>
  );
};
