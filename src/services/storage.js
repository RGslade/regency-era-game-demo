import AsyncStorage from '@react-native-async-storage/async-storage';
import { logError } from './logger';

const STORAGE_KEY = 'regencyEraGameState';
const ADS_REMOVED_KEY = 'adsRemoved';
const CURRENCY_SYMBOL_KEY = 'currencySymbol';
const CROWN_WALLET_KEY = 'crownWallet';
const ANONYMOUS_USER_ID_KEY = 'anonymousUserId';
const AI_OUTCOME_REPORTS_KEY = 'aiOutcomeReports';
const APP_SETTINGS_KEY = 'appSettings';

// Wraps AsyncStorage calls with consistent error logging.
const runStorageOperation = async (operation, key, task) => {
  try {
    return await task();
  } catch (error) {
    logError('AsyncStorage operation failed', error, { operation, key });
    throw error;
  }
};

// Loads the saved story state from local device storage.
export const loadGameState = async () => {
  return runStorageOperation('loadGameState', STORAGE_KEY, async () => {
    const savedGameStateJson = await AsyncStorage.getItem(STORAGE_KEY);
    return savedGameStateJson ? JSON.parse(savedGameStateJson) : null;
  });
};

// Persists the current story state to local device storage.
export const saveGameState = async (state) => {
  await runStorageOperation('saveGameState', STORAGE_KEY, async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  });
};

// Clears the saved story state for a fresh playthrough.
export const resetGameState = async () => {
  await runStorageOperation('resetGameState', STORAGE_KEY, async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
  });
};

export const loadAdsRemovedState = async () => {
  return runStorageOperation('loadAdsRemovedState', ADS_REMOVED_KEY, async () => {
    const savedAdsRemovedFlag = await AsyncStorage.getItem(ADS_REMOVED_KEY);
    return savedAdsRemovedFlag === 'true';
  });
};

export const saveAdsRemovedState = async (isRemoved) => {
  await runStorageOperation('saveAdsRemovedState', ADS_REMOVED_KEY, async () => {
    await AsyncStorage.setItem(ADS_REMOVED_KEY, isRemoved ? 'true' : 'false');
  });
};

export const loadCurrencySymbolState = async () => {
  return runStorageOperation('loadCurrencySymbolState', CURRENCY_SYMBOL_KEY, async () => {
    const savedCurrencySymbol = await AsyncStorage.getItem(CURRENCY_SYMBOL_KEY);
    return savedCurrencySymbol || '$';
  });
};

export const saveCurrencySymbolState = async (symbol) => {
  await runStorageOperation('saveCurrencySymbolState', CURRENCY_SYMBOL_KEY, async () => {
    await AsyncStorage.setItem(CURRENCY_SYMBOL_KEY, symbol || '$');
  });
};

export const loadCrownWalletState = async () => {
  return runStorageOperation('loadCrownWalletState', CROWN_WALLET_KEY, async () => {
    const savedWalletJson = await AsyncStorage.getItem(CROWN_WALLET_KEY);
    return savedWalletJson ? JSON.parse(savedWalletJson) : null;
  });
};

export const saveCrownWalletState = async (wallet) => {
  await runStorageOperation('saveCrownWalletState', CROWN_WALLET_KEY, async () => {
    await AsyncStorage.setItem(CROWN_WALLET_KEY, JSON.stringify(wallet || {}));
  });
};

// Loads the stable anonymous ID used for backend sync.
export const loadAnonymousUserId = async () => {
  return runStorageOperation('loadAnonymousUserId', ANONYMOUS_USER_ID_KEY, async () => {
    const savedAnonymousUserId = await AsyncStorage.getItem(ANONYMOUS_USER_ID_KEY);
    if (savedAnonymousUserId) return savedAnonymousUserId;
    const generatedAnonymousUserId = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    await AsyncStorage.setItem(ANONYMOUS_USER_ID_KEY, generatedAnonymousUserId);
    return generatedAnonymousUserId;
  });
};

// Stores bounded AI outcome reports for optional backend submission.
export const saveAiOutcomeReport = async (report) => {
  await runStorageOperation('saveAiOutcomeReport', AI_OUTCOME_REPORTS_KEY, async () => {
    const savedReportsJson = await AsyncStorage.getItem(AI_OUTCOME_REPORTS_KEY);
    const reportQueue = savedReportsJson ? JSON.parse(savedReportsJson) : [];
    reportQueue.unshift({
      ...report,
      reportedAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(AI_OUTCOME_REPORTS_KEY, JSON.stringify(reportQueue.slice(0, 25)));
  });
};

export const loadAppSettingsState = async (fallbackSettings = {}) => {
  return runStorageOperation('loadAppSettingsState', APP_SETTINGS_KEY, async () => {
    const savedSettingsJson = await AsyncStorage.getItem(APP_SETTINGS_KEY);
    return savedSettingsJson ? { ...fallbackSettings, ...JSON.parse(savedSettingsJson) } : fallbackSettings;
  });
};

export const saveAppSettingsState = async (settings) => {
  await runStorageOperation('saveAppSettingsState', APP_SETTINGS_KEY, async () => {
    await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings || {}));
  });
};
