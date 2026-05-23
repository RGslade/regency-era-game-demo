import { colors } from '../constants/colors';

export const settings = [
  {
    id: 'home',
    label: 'Modest Home',
    theme: {
      background: '#2a160d',
      header: 'rgba(40, 20, 10, 0.95)',
      footer: 'rgba(35, 18, 9, 0.95)',
    },
  },
  {
    id: 'market',
    label: 'Market Square',
    theme: {
      background: '#3a1f12',
      header: 'rgba(58, 31, 18, 0.9)',
      footer: 'rgba(45, 24, 14, 0.95)',
    },
  },
  {
    id: 'estate',
    label: 'Rivington House',
    theme: {
      background: '#1f1b22',
      header: 'rgba(30, 25, 35, 0.95)',
      footer: 'rgba(26, 20, 30, 0.95)',
    },
  },
  {
    id: 'ballroom',
    label: 'Ballroom',
    theme: {
      background: '#302018',
      header: 'rgba(52, 32, 22, 0.95)',
      footer: 'rgba(43, 27, 18, 0.95)',
    },
  },
  {
    id: 'garden',
    label: 'Garden Terrace',
    theme: {
      background: '#1b2a1d',
      header: 'rgba(27, 42, 29, 0.95)',
      footer: 'rgba(22, 35, 24, 0.95)',
    },
  },
  {
    id: 'library',
    label: 'Library',
    theme: {
      background: '#1e1a18',
      header: 'rgba(30, 24, 22, 0.95)',
      footer: 'rgba(26, 21, 19, 0.95)',
    },
  },
  {
    id: 'royal',
    label: 'Royal Court',
    theme: {
      background: '#241922',
      header: 'rgba(36, 25, 34, 0.95)',
      footer: 'rgba(30, 21, 28, 0.95)',
    },
  },
  {
    id: 'kitchen',
    label: 'Servants\' Hall',
    theme: {
      background: '#2b1a12',
      header: 'rgba(40, 24, 16, 0.95)',
      footer: 'rgba(34, 20, 14, 0.95)',
    },
  },
  {
    id: 'park',
    label: 'Hyde Park',
    theme: {
      background: '#1a2b2a',
      header: 'rgba(26, 43, 42, 0.95)',
      footer: 'rgba(22, 35, 34, 0.95)',
    },
  },
  {
    id: 'carriage',
    label: 'Carriage House',
    theme: {
      background: '#2b1f1f',
      header: 'rgba(43, 31, 31, 0.95)',
      footer: 'rgba(36, 26, 26, 0.95)',
    },
  },
];

export const defaultSettingId = 'home';

export const settingsById = settings.reduce((accumulator, setting) => {
  accumulator[setting.id] = setting;
  return accumulator;
}, {});

export const getSettingTheme = (settingId) => {
  const setting = settingsById[settingId] || settingsById[defaultSettingId];
  return {
    background: setting?.theme?.background || colors.background,
    header: setting?.theme?.header || colors.header,
    footer: setting?.theme?.footer || colors.footer,
  };
};

export const inferSettingId = (sceneId) => {
  if (!sceneId) {
    return defaultSettingId;
  }
  const normalized = sceneId.toLowerCase();
  if (normalized.includes('market')) {
    return 'market';
  }
  if (normalized.includes('ball') || normalized.includes('debut') || normalized.includes('dance')) {
    return 'ballroom';
  }
  if (normalized.includes('kitchen') || normalized.includes('maid') || normalized.includes('servant')) {
    return 'kitchen';
  }
  if (normalized.includes('garden') || normalized.includes('terrace')) {
    return 'garden';
  }
  if (normalized.includes('library') || normalized.includes('study')) {
    return 'library';
  }
  if (normalized.includes('park') || normalized.includes('folly')) {
    return 'park';
  }
  if (normalized.includes('queen') || normalized.includes('royal') || normalized.includes('king')) {
    return 'royal';
  }
  if (normalized.includes('carriage')) {
    return 'carriage';
  }
  if (normalized.includes('start') || normalized.includes('home') || normalized.includes('mother') || normalized.includes('chores') || normalized.includes('sewing') || normalized.includes('family') || normalized.includes('cousin')) {
    return 'home';
  }
  return defaultSettingId;
};
