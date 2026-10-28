import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { toArabicNumber } from '../services/prayerCalculation';
import { TOKENS, makeShadow } from '../constants/tokens';

export const ZakatScreen: React.FC = () => {
  const { goBack, theme, themeMode, t, triggerHaptic } = useApp();
  const c = theme;

  const [activeTab, setActiveTab] = useState<'calculator' | 'fitr'>('calculator');
  const [nisabStandard, setNisabStandard] = useState<'gold' | 'silver'>('gold');

  // Input states
  const [cash, setCash] = useState<string>('');
  const [gold24, setGold24] = useState<string>('');
  const [gold21, setGold21] = useState<string>('');
  const [gold18, setGold18] = useState<string>('');
  const [goldGramPrice, setGoldGramPrice] = useState<string>('310'); // Default SAR
  const [silverGramPrice, setSilverGramPrice] = useState<string>('4.5'); // Default SAR
  const [stocks, setStocks] = useState<string>('');
  const [debts, setDebts] = useState<string>('');

  // Fitr state
  const [familyMembers, setFamilyMembers] = useState<number>(1);
  const [fitrRate, setFitrRate] = useState<number>(30); // Default SAR per person

  // Calculations
  const gPrice = parseFloat(goldGramPrice) || 310;
  const sPrice = parseFloat(silverGramPrice) || 4.5;

  const cashVal = parseFloat(cash) || 0;
  const g24Grams = parseFloat(gold24) || 0;
  const g21Grams = (parseFloat(gold21) || 0) * (21 / 24);
  const g18Grams = (parseFloat(gold18) || 0) * (18 / 24);
  const totalGoldEquivGrams = g24Grams + g21Grams + g18Grams;
  const goldWealth = totalGoldEquivGrams * gPrice;
  const stocksVal = parseFloat(stocks) || 0;
  const debtVal = parseFloat(debts) || 0;

  const totalGrossWealth = cashVal + goldWealth + stocksVal;
  const netZakatableWealth = Math.max(0, totalGrossWealth - debtVal);

  const nisabValue = nisabStandard === 'gold' ? 85 * gPrice : 595 * sPrice;
  const reachesNisab = netZakatableWealth >= nisabValue;
  const zakatDue = reachesNisab ? netZakatableWealth * 0.025 : 0;

  const totalFitrDue = familyMembers * fitrRate;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        title={t('حاسبة الزكاة الشرعية الذكية', 'Smart Zakat Calculator')}
        subtitle={t('زكاة المال والذهب والأسهم والفطر', 'Cash, Gold, Stocks & Zakat al-Fitr')}
        onBack={goBack}
      />

      {/* Tabs (Main Calculator / Zakat al-Fitr) */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: 18,
          marginTop: 12,
          marginBottom: 16,
          backgroundColor: c.surface,
          borderRadius: TOKENS.radius.pill,
          padding: 4,
          borderWidth: 1,
          borderColor: c.border
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('calculator');
          }}
          style={{
            flex: 1,
            paddingVertical: 9,
            borderRadius: TOKENS.radius.pill,
            alignItems: 'center',
            backgroundColor: activeTab === 'calculator' ? TOKENS.colors.primary : 'transparent'
          }}
        >
          <TextUI variant="captionBold" color={activeTab === 'calculator' ? '#FFFFFF' : c.textPrimary}>
            💰 زكاة الأموال والذهب
          </TextUI>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('fitr');
          }}
          style={{
            flex: 1,
            paddingVertical: 9,
            borderRadius: TOKENS.radius.pill,
            alignItems: 'center',
            backgroundColor: activeTab === 'fitr' ? TOKENS.colors.primary : 'transparent'
          }}
        >
          <TextUI variant="captionBold" color={activeTab === 'fitr' ? '#FFFFFF' : c.textPrimary}>
            🌾 زكاة الفطر
          </TextUI>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'calculator' ? (
          <>
            {/* Summary Due Card */}
            <View
              style={{
                backgroundColor: reachesNisab ? TOKENS.colors.primaryDark : c.surface,
                borderRadius: 20,
                padding: 18,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: reachesNisab ? TOKENS.colors.primaryDark : c.border,
                ...makeShadow('0 8px 24px rgba(0,0,0,0.06)', '#000', 0.06, 6)
              }}
            >
              <TextUI variant="caption" color={reachesNisab ? TOKENS.colors.secondaryLight : c.textSecondary}>
                {t('مقدار الزكاة الواجبة شرعاً (٢.٥٪)', 'Total Zakat Due (2.5%)')}
              </TextUI>
              <TextUI variant="h1" size={26} color={reachesNisab ? '#FFFFFF' : TOKENS.colors.primaryDark} style={{ marginVertical: 6 }}>
                {toArabicNumber(zakatDue.toLocaleString('en-US', { maximumFractionDigits: 2 }))}
              </TextUI>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderColor: reachesNisab ? 'rgba(255,255,255,0.15)' : c.border }}>
                <TextUI variant="caption" color={reachesNisab ? TOKENS.colors.secondaryLight : c.textSecondary}>
                  {reachesNisab ? '✅ بلغ النصاب وحال عليه الحول' : '⚠️ لم يبلغ النصاب الشرعي'}
                </TextUI>
                <TextUI variant="caption" color={reachesNisab ? TOKENS.colors.secondaryLight : c.textSecondary}>
                  النصاب: {toArabicNumber(Math.round(nisabValue))}
                </TextUI>
              </View>
            </View>

            {/* Nisab Standard Selector */}
            <View
              style={{
                backgroundColor: c.surface,
                borderRadius: 16,
                padding: 14,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <TextUI size={13} weight="bold" color={c.textPrimary} style={{ marginBottom: 8 }}>
                {t('معيار احتساب النصاب الشرعي:', 'Nisab Standard:')}
              </TextUI>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setNisabStandard('gold')}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: nisabStandard === 'gold' ? (themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20') : c.bgSecondary,
                    borderWidth: 1,
                    borderColor: nisabStandard === 'gold' ? TOKENS.colors.primary : c.border
                  }}
                >
                  <TextUI size={12} weight="bold" color={nisabStandard === 'gold' ? TOKENS.colors.primaryDark : c.textPrimary}>
                    نصاب الذهب (٨٥ غرام)
                  </TextUI>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setNisabStandard('silver')}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: nisabStandard === 'silver' ? (themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20') : c.bgSecondary,
                    borderWidth: 1,
                    borderColor: nisabStandard === 'silver' ? TOKENS.colors.primary : c.border
                  }}
                >
                  <TextUI size={12} weight="bold" color={nisabStandard === 'silver' ? TOKENS.colors.primaryDark : c.textPrimary}>
                    نصاب الفضة (٥٩٥ غرام)
                  </TextUI>
                </TouchableOpacity>
              </View>
            </View>

            {/* Assets Inputs */}
            <View style={{ gap: 12 }}>
              {/* Cash */}
              <View style={{ backgroundColor: c.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.border }}>
                <TextUI size={13} weight="bold" color={c.textPrimary} style={{ marginBottom: 6 }}>
                  💵 الأموال النقدية والمدخرات البنكية
                </TextUI>
                <TextInput
                  placeholder="٠"
                  placeholderTextColor={c.textSecondary}
                  keyboardType="numeric"
                  value={cash}
                  onChangeText={setCash}
                  style={{ backgroundColor: c.bgSecondary, borderRadius: 10, padding: 10, color: c.textPrimary, textAlign: 'right' }}
                />
              </View>

              {/* Gold Grams */}
              <View style={{ backgroundColor: c.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.border }}>
                <TextUI size={13} weight="bold" color={c.textPrimary} style={{ marginBottom: 6 }}>
                  🥇 الذهب المدخر (عيار ٢٤ أو ٢١ أو ١٨)
                </TextUI>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    placeholder="عيار ٢٤ (غرام)"
                    placeholderTextColor={c.textSecondary}
                    keyboardType="numeric"
                    value={gold24}
                    onChangeText={setGold24}
                    style={{ flex: 1, backgroundColor: c.bgSecondary, borderRadius: 10, padding: 10, color: c.textPrimary, textAlign: 'right', fontSize: 12 }}
                  />
                  <TextInput
                    placeholder="عيار ٢١ (غرام)"
                    placeholderTextColor={c.textSecondary}
                    keyboardType="numeric"
                    value={gold21}
                    onChangeText={setGold21}
                    style={{ flex: 1, backgroundColor: c.bgSecondary, borderRadius: 10, padding: 10, color: c.textPrimary, textAlign: 'right', fontSize: 12 }}
                  />
                </View>
              </View>

              {/* Stocks / Trade goods */}
              <View style={{ backgroundColor: c.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.border }}>
                <TextUI size={13} weight="bold" color={c.textPrimary} style={{ marginBottom: 6 }}>
                  📈 الأسهم وعروض التجارة المعدة للبيع
                </TextUI>
                <TextInput
                  placeholder="القيمة السوقية الحالية"
                  placeholderTextColor={c.textSecondary}
                  keyboardType="numeric"
                  value={stocks}
                  onChangeText={setStocks}
                  style={{ backgroundColor: c.bgSecondary, borderRadius: 10, padding: 10, color: c.textPrimary, textAlign: 'right' }}
                />
              </View>

              {/* Debts deduction */}
              <View style={{ backgroundColor: c.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: c.border }}>
                <TextUI size={13} weight="bold" color="#B34743" style={{ marginBottom: 6 }}>
                  📉 الديون الحالّة والالتزامات المالية الواجبة (خصم)
                </TextUI>
                <TextInput
                  placeholder="المبلغ الواجب سداده فوراً"
                  placeholderTextColor={c.textSecondary}
                  keyboardType="numeric"
                  value={debts}
                  onChangeText={setDebts}
                  style={{ backgroundColor: c.bgSecondary, borderRadius: 10, padding: 10, color: c.textPrimary, textAlign: 'right' }}
                />
              </View>
            </View>
          </>
        ) : (
          /* Zakat al-Fitr Tab */
          <View style={{ gap: 14 }}>
            <View
              style={{
                backgroundColor: TOKENS.colors.primaryDark,
                borderRadius: 20,
                padding: 20,
                alignItems: 'center'
              }}
            >
              <TextUI size={14} color={TOKENS.colors.secondaryLight}>
                إجمالي زكاة الفطر الواجب إخراجها
              </TextUI>
              <TextUI size={36} weight="bold" color="#FFFFFF" style={{ marginVertical: 8 }}>
                {toArabicNumber(totalFitrDue)}
              </TextUI>
              <TextUI size={12} color={TOKENS.colors.secondaryLight}>
                صاع نبوي من قوت البلد (أو القيمة التقديرية)
              </TextUI>
            </View>

            <View style={{ backgroundColor: c.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border }}>
              <TextUI size={14} weight="bold" color={c.textPrimary} style={{ marginBottom: 12 }}>
                عدد أفراد الأسرة (عنك وعمن تلزمك نفقته):
              </TextUI>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setFamilyMembers((m) => Math.max(1, m - 1))}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.bgSecondary, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Feather name="minus" size={20} color={c.textPrimary} />
                </TouchableOpacity>

                <TextUI size={26} weight="bold" color={TOKENS.colors.primaryDark}>
                  {toArabicNumber(familyMembers)}
                </TextUI>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setFamilyMembers((m) => m + 1)}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: TOKENS.colors.primary, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Feather name="plus" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};
