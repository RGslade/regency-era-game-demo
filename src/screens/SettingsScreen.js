import { SafeAreaView, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { appStyles as styles } from '../styles/appStyles';
import { createDefaultAppSettings, fontOptions } from '../types/settingsOptions';
import { appBridge } from '../services/appBridge';

const clampTextSize = (value) => Math.max(12, Math.min(22, Number(value) || 15));

export const SettingsScreen = ({
  theme,
  renderBannerAd,
  appSettings = createDefaultAppSettings(),
  onSettingsChange = () => {},
}) => {
  const updateSetting = (key, value) => {
    onSettingsChange({
      ...createDefaultAppSettings(),
      ...appSettings,
      [key]: value,
    });
  };

  const textSize = clampTextSize(appSettings.textSize);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.settingsHeader, { backgroundColor: theme.header }]}>
        <TouchableOpacity onPress={() => appBridge.setScreen('game')} style={styles.menuButton}>
          <Text style={styles.menuButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.settingsTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView style={styles.settingsList} contentContainerStyle={styles.settingsListContent}>
        <View style={styles.settingRowStacked}>
          <View style={styles.settingRowHeader}>
            <Text style={styles.settingLabel}>Sound</Text>
            <TouchableOpacity
              style={[styles.toggleButton, appSettings.soundEnabled ? styles.toggleButtonActive : null]}
              onPress={() => updateSetting('soundEnabled', !appSettings.soundEnabled)}
            >
              <Text style={styles.toggleButtonText}>{appSettings.soundEnabled ? 'On' : 'Off'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.settingDescriptionText}>Controls new game, choice, scene, location, ending, and purchase sound effects.</Text>
        </View>

        <View style={styles.settingRowStacked}>
          <View style={styles.settingRowHeader}>
            <Text style={styles.settingLabel}>Notifications</Text>
            <TouchableOpacity
              style={[styles.toggleButton, appSettings.notificationsEnabled ? styles.toggleButtonActive : null]}
              onPress={() => updateSetting('notificationsEnabled', !appSettings.notificationsEnabled)}
            >
              <Text style={styles.toggleButtonText}>{appSettings.notificationsEnabled ? 'On' : 'Off'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.settingDescriptionText}>Stores your preference for future reminder prompts.</Text>
        </View>

        <View style={styles.settingRowStacked}>
          <View style={styles.settingRowHeader}>
            <Text style={styles.settingLabel}>Text Size</Text>
            <Text style={styles.settingValue}>{textSize}</Text>
          </View>
          <View style={styles.stepperRow}>
            <TouchableOpacity style={styles.stepperButton} onPress={() => updateSetting('textSize', clampTextSize(textSize - 1))}>
              <Text style={styles.stepperButtonText}>-</Text>
            </TouchableOpacity>
            <View style={styles.textSizeBar}>
              <View style={[styles.textSizeBarFill, { width: `${((textSize - 12) / 10) * 100}%` }]} />
            </View>
            <TouchableOpacity style={styles.stepperButton} onPress={() => updateSetting('textSize', clampTextSize(textSize + 1))}>
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingRowStacked}>
          <Text style={styles.settingLabel}>Font</Text>
          <View style={styles.optionGrid}>
            {fontOptions.map((font) => {
              const isActive = appSettings.fontFamily === font;
              return (
                <TouchableOpacity
                  key={font}
                  style={[styles.optionPill, isActive ? styles.optionPillActive : null]}
                  onPress={() => updateSetting('fontFamily', font)}
                >
                  <Text style={[styles.optionPillText, isActive ? styles.optionPillTextActive : null]}>{font}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.removeAdvertsHeroButton} onPress={() => appBridge.setScreen('removeAdverts')}>
          <Text style={styles.removeAdvertsHeroTitle}>Crowns</Text>
          <Text style={styles.removeAdvertsHeroSubtitle}>Manage story turns, subscriptions, and advert rewards</Text>
        </TouchableOpacity>
      </ScrollView>
      {renderBannerAd?.()}
    </SafeAreaView>
  );
};
