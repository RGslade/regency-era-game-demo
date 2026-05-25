import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { Animated, SafeAreaView, View, Text, TouchableOpacity, ScrollView, Modal, Pressable, Vibration } from 'react-native';
import { MessageBubble } from '../components/MessageBubble';
import { appStyles as styles } from '../styles/appStyles';
import {
  MAX_RELATIONSHIP,
  MIN_RELATIONSHIP,
  NEUTRAL_RELATIONSHIP,
  RELATIONSHIP_INTERACTIONS_PER_AI_TURN,
} from '../constants/game';
import { defaultSettingId as fallbackSettingId, getSettingTheme, settingsById } from '../types/settings';
import { saveAiOutcomeReport, saveGameState, loadGameState, resetGameState } from '../services/storage';
import { colors } from '../constants/colors';
import { characterProfiles } from '../types/characters';
import { highSocietyFirstNames, highSocietySurnames, playerNames, surnames, titleTokens } from '../types/names';
import { workingClassJobs } from '../types/jobs';
import { generateAiStoryTurn, submitBackendAiOutcomeReport } from '../services/aiStoryService';
import { getTotalCrowns, spendOneCrown } from '../services/crowns';
import { buildUserErrorMessage, logError } from '../services/logger';
import { appBridge } from '../services/appBridge';

const pickRandom = (list = []) => {
  if (!Array.isArray(list) || list.length === 0) return '';
  return list[Math.floor(Math.random() * list.length)];
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const romanNumeral = /^[IVXLCDM]+$/;

// Normalizes names so player references can be filtered reliably.
const normalizeComparableName = (value) => String(value || '').trim().toLowerCase();

const isPlayerName = (name, playerName) => {
  return Boolean(name && playerName && normalizeComparableName(name) === normalizeComparableName(playerName));
};

const filterPlayerNames = (names = [], playerName = '') => {
  return (Array.isArray(names) ? names : []).filter((name) => name && !isPlayerName(name, playerName));
};

const omitPlayerEntries = (entries = {}, playerName = '') => {
  return Object.fromEntries(
    Object.entries(entries || {}).filter(([name]) => !isPlayerName(name, playerName))
  );
};

const titleCaseName = (value) => String(value || '')
  .replace(/_/g, ' ')
  .trim()
  .replace(/\s+/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase())
  .replace(/\bMr\b\.?/g, 'Mr.')
  .replace(/\bMrs\b\.?/g, 'Mrs.')
  .replace(/\bMs\b\.?/g, 'Ms.');

// Resolves backend character identifiers into display-ready names.
const resolveCharacterName = (name, majorCharacters = {}) => {
  const characterName = String(name || '').trim();
  if (!characterName) return '';
  const matchingMajorCharacter = Object.values(majorCharacters || {}).find((character) => {
    return character?.id === characterName || character?.fullName === characterName;
  });
  if (matchingMajorCharacter?.fullName) return matchingMajorCharacter.fullName;
  return characterName.includes('_') ? titleCaseName(characterName) : characterName;
};

const resolveCharacterList = (names = [], playerName = '', majorCharacters = {}) => {
  const resolvedNames = new Set();
  filterPlayerNames(names, playerName).forEach((name) => {
    const resolvedName = resolveCharacterName(name, majorCharacters);
    if (resolvedName && !isPlayerName(resolvedName, playerName)) resolvedNames.add(resolvedName);
  });
  return Array.from(resolvedNames);
};

const resolveCharacterScoreMap = (entries = {}, playerName = '', majorCharacters = {}) => {
  const resolvedScores = {};
  Object.entries(entries || {}).forEach(([name, score]) => {
    const resolvedName = resolveCharacterName(name, majorCharacters);
    if (resolvedName && !isPlayerName(resolvedName, playerName)) resolvedScores[resolvedName] = score;
  });
  return resolvedScores;
};

const capitalizeStoryText = (text = '') => {
  const storyText = String(text || '');
  const firstLetterIndex = storyText.search(/[A-Za-z]/);
  if (firstLetterIndex < 0) return storyText;
  return `${storyText.slice(0, firstLetterIndex)}${storyText.charAt(firstLetterIndex).toUpperCase()}${storyText.slice(firstLetterIndex + 1)}`;
};

const sanitizeChoiceForPlayer = (choice = null, playerName = '', majorCharacters = {}) => {
  if (!choice) return choice;
  const choiceTargetCharacter = choice.targetCharacter || choice.character || null;
  const resolvedTarget = resolveCharacterName(choiceTargetCharacter, majorCharacters);
  if (!isPlayerName(resolvedTarget || choiceTargetCharacter, playerName)) {
    return resolvedTarget && resolvedTarget !== choiceTargetCharacter
      ? { ...choice, targetCharacter: resolvedTarget, character: resolvedTarget }
      : choice;
  }
  return {
    ...choice,
    character: null,
    targetCharacter: null,
  };
};

const slugifyName = (value, fallback) => {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || fallback;
};

// Creates randomized high-society families for each new playthrough.
const createMajorCharacters = () => {
  const familyPool = [...highSocietySurnames];
  const firstPool = [...highSocietyFirstNames];
  const pickAndRemove = (pool) => {
    if (!Array.isArray(pool) || pool.length === 0) return '';
    const index = Math.floor(Math.random() * pool.length);
    const [value] = pool.splice(index, 1);
    return value;
  };
  const familyA = pickAndRemove(familyPool) || pickRandom(surnames);
  const familyB = pickAndRemove(familyPool) || familyA;
  const familyC = pickAndRemove(familyPool) || familyB;
  const buildFullName = (entry) => `${entry.title} ${entry.first} ${entry.family}`.trim();
  const createCharacter = (title, first, family, fallbackId, nameBuilder = buildFullName) => {
    const entry = { title, first, family };
    const fullName = nameBuilder(entry);
    return {
      ...entry,
      id: slugifyName(fullName, fallbackId),
      fullName,
    };
  };
  const characters = [
    createCharacter('Lord', pickAndRemove(firstPool), familyA, 'lord_a'),
    createCharacter('Duchess', pickAndRemove(firstPool), familyB, 'duchess_b'),
    createCharacter('Lady', pickAndRemove(firstPool), familyC, 'lady_c_1'),
    createCharacter('Lady', pickAndRemove(firstPool), familyC, 'lady_c_2'),
    createCharacter('Mr.', pickAndRemove(firstPool), familyB, 'mr_b', (entry) => `${entry.title} ${entry.family}`.trim()),
  ];
  const usedIds = new Set();
  const keyedCharacters = Object.fromEntries(characters.map((character, index) => {
    let id = character.id;
    if (usedIds.has(id)) id = `${id}_${index + 1}`;
    usedIds.add(id);
    return [id, { ...character, id }];
  }));
  return {
    families: [familyA, familyB, familyC].filter(Boolean),
    characters: keyedCharacters,
  };
};

// Builds the complete default state for a new game.
const createInitialState = () => {
  const playerJob = pickRandom(workingClassJobs);
  const majorSetup = createMajorCharacters();
  return {
    relationship: NEUTRAL_RELATIONSHIP,
    currentScene: 'new_story',
    currentSceneCharacters: [],
    currentChoiceSet: [],
    flags: {},
    playerName: pickRandom(playerNames),
    playerAge: randomInt(18, 25),
    playerJob,
    playerBackground: `Your mother is a ${playerJob}.`,
    history: [],
    relationships: {},
    characterScores: {},
    sessionPlaces: {},
    sessionCharacters: {},
    recentExtras: {},
    hiddenStats: {
      reputation: 0,
      security: 0,
      ambition: 0,
      familyDuty: 0,
      scandal: 0,
      courtFavour: 0,
    },
    memorySummary: '',
    adjacentLocationHistory: [],
    relationshipInteractionsRemaining: RELATIONSHIP_INTERACTIONS_PER_AI_TURN,
    lastSettingId: fallbackSettingId,
    turnCount: 0,
    majorFamilies: majorSetup.families,
    majorCharacters: majorSetup.characters,
    majorCharactersMet: {},
    majorCharactersSeen: {},
    lastAiSource: '',
  };
};

// Repairs old or partial save data before rendering the game.
const normalizeSceneState = (state = {}) => {
  const playerName = state.playerName || '';
  const majorCharacters = state.majorCharacters || {};
  return {
    ...createInitialState(),
    ...state,
    flags: state.flags || {},
    history: Array.isArray(state.history) ? state.history : [],
    relationships: resolveCharacterScoreMap(omitPlayerEntries(state.relationships || {}, playerName), playerName, majorCharacters),
    characterScores: resolveCharacterScoreMap(omitPlayerEntries(state.characterScores || {}, playerName), playerName, majorCharacters),
    sessionPlaces: state.sessionPlaces || {},
    sessionCharacters: state.sessionCharacters || {},
    recentExtras: state.recentExtras || {},
    hiddenStats: state.hiddenStats || {},
    adjacentLocationHistory: Array.isArray(state.adjacentLocationHistory) ? state.adjacentLocationHistory : [],
    currentSceneCharacters: resolveCharacterList(state.currentSceneCharacters, playerName, majorCharacters),
    currentChoiceSet: Array.isArray(state.currentChoiceSet)
      ? state.currentChoiceSet.map((choice) => sanitizeChoiceForPlayer(choice, playerName, majorCharacters))
      : [],
    majorFamilies: Array.isArray(state.majorFamilies) ? state.majorFamilies : [],
    majorCharacters,
    majorCharactersMet: state.majorCharactersMet || {},
    majorCharactersSeen: state.majorCharactersSeen || {},
  };
};

const getNameAliases = (name) => {
  if (!name) return [];
  const parts = typeof name === 'string' ? name.split(' ').filter(Boolean) : [];
  if (parts.length === 1) return [name];
  const [firstPart] = parts;
  const isTitled = titleTokens.has(firstPart);
  const rawLast = parts[parts.length - 1];
  const last = romanNumeral.test(rawLast) && parts.length > 2 ? parts[parts.length - 2] : rawLast;
  const first = isTitled ? parts[1] : firstPart;
  const aliases = new Set([name]);
  if (first && last && first !== last) aliases.add(`${first} ${last}`);
  if (isTitled) {
    if (first) aliases.add(`${firstPart} ${first}`);
    if (last) aliases.add(`${firstPart} ${last}`);
  }
  if (first) aliases.add(first);
  if (last && last !== first) aliases.add(last);
  return Array.from(aliases);
};

const buildNameColorSnapshot = (scores = {}, extraNames = []) => {
  const knownNames = new Set([...characterProfiles.map(({ name }) => name), ...Object.keys(scores || {}), ...(Array.isArray(extraNames) ? extraNames : [])]);
  const snapshot = {};
  Array.from(knownNames).forEach((name) => {
    getNameAliases(name).forEach((alias) => {
      const score = scores?.[name] ?? NEUTRAL_RELATIONSHIP;
      if (score > NEUTRAL_RELATIONSHIP) snapshot[alias] = colors.relationshipHigh;
      else if (score < NEUTRAL_RELATIONSHIP) snapshot[alias] = colors.relationshipLow;
      else snapshot[alias] = colors.nameNeutral;
    });
  });
  return snapshot;
};

const buildPlaceColorSnapshot = (sessionPlaces = {}, activeSettingId = fallbackSettingId) => {
  const snapshot = {};
  const activeSetting = settingsById[activeSettingId] || settingsById[fallbackSettingId];
  if (activeSetting?.label) snapshot[activeSetting.label] = getSettingTheme(activeSetting.id).background;
  const activePlaceName = sessionPlaces?.[activeSetting?.id];
  if (activePlaceName) snapshot[activePlaceName] = getSettingTheme(activeSetting.id).background;
  return snapshot;
};

const applyHiddenStatDeltas = (stats = {}, deltas = {}) => {
  const updatedStats = { ...stats };
  Object.entries(deltas || {}).forEach(([key, delta]) => {
    updatedStats[key] = Number(updatedStats[key] || 0) + Number(delta || 0);
  });
  return updatedStats;
};

const normalizeAiChoices = (choices = [], playerName = '', majorCharacters = {}, currentLocationId = fallbackSettingId) =>
  choices.map((choice, index) => {
    const choiceTargetCharacter = choice.targetCharacter || choice.character || null;
    const resolvedTarget = resolveCharacterName(choiceTargetCharacter, majorCharacters);
    return {
      text: choice.text || `Choice ${index + 1}`,
      next: choice.endingCandidate || `ai_turn_${Date.now()}_${index}`,
      character: isPlayerName(resolvedTarget || choiceTargetCharacter, playerName) ? null : resolvedTarget || choiceTargetCharacter,
      relationship: Number(choice.relationshipDelta || 0),
      effectType: choice.effectType || 'risk',
      riskDelta: Number(choice.riskDelta || 0),
      nextLocationId: choice.nextLocationId || currentLocationId || fallbackSettingId,
      endingCandidate: choice.endingCandidate || null,
    };
  });

const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);

const goodEndingIds = new Set([
  'true_love_ending',
  'power_ending',
  'elope',
  'queen_favour_end',
  'duchess_patron_end',
  'reconciliation_end',
  'secret_union_end',
  'public_reform_end',
  'quiet_respect_end',
  'widow_patron_end',
  'family_duty_end',
  'found_ally_end',
  'rivals_truce_end',
  'solitary_power_end',
  'forbidden_heir_end',
]);

const getEndingCueType = (endingId) => (goodEndingIds.has(endingId) ? 'endingGood' : 'endingBad');

export const GameScreen = ({
  defaultSettingId = fallbackSettingId,
  getSettingTheme: resolveTheme = getSettingTheme,
  errorMessage,
  getRelationshipLabel,
  renderBannerAd,
  anonymousUserId,
  crownWallet,
  setCrownWallet,
  storyGenerationReady = false,
  appSettings = {},
}) => {
  const [currentSettingId, setCurrentSettingId] = useState(defaultSettingId);
  const [isReady, setIsReady] = useState(false);
  const [gameState, setGameState] = useState(createInitialState);
  const [menuVisible, setMenuVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  const [relationshipModalVisible, setRelationshipModalVisible] = useState(false);
  const [gameOverVisible, setGameOverVisible] = useState(false);
  const [getCrownsVisible, setGetCrownsVisible] = useState(false);
  const [memoryVisible, setMemoryVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState('scene');
  const [reportReason, setReportReason] = useState('quality');
  const [pendingSceneMessage, setPendingSceneMessage] = useState(false);
  const [typingMessageIds, setTypingMessageIds] = useState([]);
  const [choicesAreaMinimized, setChoicesAreaMinimized] = useState(false);
  const [skipSignal, setSkipSignal] = useState(0);
  const scrollRef = useRef(null);
  const sceneTimerRef = useRef(null);
  const storyTouchRef = useRef(null);
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const [backgroundColors, setBackgroundColors] = useState({
    from: resolveTheme(defaultSettingId).background,
    to: resolveTheme(defaultSettingId).background,
  });
  const soundEnabled = appSettings.soundEnabled !== false;
  const choiceCuePlayer = useAudioPlayer(require('../../assets/sounds/choice.wav'));
  const newGameCuePlayer = useAudioPlayer(require('../../assets/sounds/new_game.wav'));
  const sceneCuePlayer = useAudioPlayer(require('../../assets/sounds/scene.wav'));
  const locationCuePlayer = useAudioPlayer(require('../../assets/sounds/location.wav'));
  const goodEndingCuePlayer = useAudioPlayer(require('../../assets/sounds/ending_good.wav'));
  const badEndingCuePlayer = useAudioPlayer(require('../../assets/sounds/ending_bad.wav'));
  const soundPlayers = useMemo(() => ({
    choice: choiceCuePlayer,
    newGame: newGameCuePlayer,
    scene: sceneCuePlayer,
    location: locationCuePlayer,
    endingGood: goodEndingCuePlayer,
    endingBad: badEndingCuePlayer,
  }), [badEndingCuePlayer, choiceCuePlayer, goodEndingCuePlayer, locationCuePlayer, newGameCuePlayer, sceneCuePlayer]);
  const messageTextSize = Math.max(12, Math.min(22, Number(appSettings.textSize || 15)));
  const messageFontFamily = appSettings.fontFamily === 'Monospace' ? 'monospace' : appSettings.fontFamily === 'Sans Serif' ? 'sans-serif' : 'serif';
  useEffect(() => {
    Object.values(soundPlayers).forEach((player) => {
      player.volume = 0.65;
    });
  }, [soundPlayers]);
  const playUiCue = useCallback((type = 'choice') => {
    if (!soundEnabled) return;
    const player = soundPlayers[type] || soundPlayers.choice;
    player.seekTo(0)
      .then(() => player.play())
      .catch((error) => {
        logError('Sound effect playback failed', error, { type });
      });
    const pattern = type === 'endingGood' || type === 'endingBad' ? [0, 120, 80, 180] : type === 'scene' ? 18 : type === 'location' ? 40 : 28;
    Vibration.vibrate(pattern);
  }, [soundEnabled, soundPlayers]);

  const buildNameColorsSnapshot = useCallback(
    (extraNames = []) => buildNameColorSnapshot(gameState.characterScores, [
      ...Object.values(gameState.majorCharacters || {}).map((character) => character.fullName).filter(Boolean),
      ...extraNames,
    ]),
    [gameState.characterScores, gameState.majorCharacters]
  );

  const appendMessage = useCallback((text, type = 'game', settingId = currentSettingId, overrides = {}) => {
    const messageId = `${Date.now()}-${Math.random()}`;
    setGameState((prev) => ({
      ...prev,
      history: [
        ...(Array.isArray(prev.history) ? prev.history : []),
        {
          id: messageId,
          text,
          type,
          settingId,
          sceneId: overrides.sceneId || prev.currentScene,
          nameColors: overrides.nameColors || buildNameColorsSnapshot(overrides.extraNames || []),
          placeColors: overrides.placeColors || buildPlaceColorSnapshot(prev.sessionPlaces),
          animate: type === 'game',
        },
      ],
    }));
    if (type === 'game') setTypingMessageIds((prev) => [...prev, messageId]);
  }, [buildNameColorsSnapshot, currentSettingId]);

  const applyRelationship = useCallback((delta, character) => {
    setGameState((prev) => {
      const nextOverallRelationshipScore = Math.max(MIN_RELATIONSHIP, Math.min(MAX_RELATIONSHIP, prev.relationship + delta));
      const resolvedCharacter = resolveCharacterName(character, prev.majorCharacters);
      if (!resolvedCharacter || isPlayerName(resolvedCharacter, prev.playerName)) return { ...prev, relationship: nextOverallRelationshipScore };
      const currentCharacterScore = prev.characterScores?.[resolvedCharacter] ?? prev.characterScores?.[character] ?? NEUTRAL_RELATIONSHIP;
      const nextCharacterScore = Math.max(MIN_RELATIONSHIP, Math.min(MAX_RELATIONSHIP, currentCharacterScore + delta));
      return {
        ...prev,
        relationship: nextOverallRelationshipScore,
        characterScores: {
          ...prev.characterScores,
          [resolvedCharacter]: nextCharacterScore,
        },
        relationships: {
          ...prev.relationships,
          [resolvedCharacter]: nextCharacterScore,
        },
      };
    });
  }, []);

  const resolveSceneLocationId = useCallback((scene = {}, selectedChoice = null, isNewGame = false, storyState = gameState) => {
    if (selectedChoice?.nextLocationId) return selectedChoice.nextLocationId;
    if (!isNewGame) return storyState.lastSettingId || defaultSettingId;
    return scene.locationId || storyState.lastSettingId || defaultSettingId;
  }, [defaultSettingId, gameState]);

  const showGeneratedScene = useCallback((scene, source, selectedChoice = null, isNewGame = false, storyState = gameState) => {
    const settingId = resolveSceneLocationId(scene, selectedChoice, isNewGame, storyState);
    const enteredNewLocation = Boolean(settingId && settingId !== storyState.lastSettingId);
    const charactersPresent = resolveCharacterList(scene.charactersPresent, storyState.playerName, storyState.majorCharacters);
    const temporaryExtras = resolveCharacterList(scene.temporaryExtras, storyState.playerName, storyState.majorCharacters);
    const allSceneNames = [...charactersPresent, ...temporaryExtras];
    const choices = normalizeAiChoices(scene.choices || [], storyState.playerName, storyState.majorCharacters, settingId);
    const playerIntro = `You are ${storyState.playerName}, ${storyState.playerAge}, the daughter of a ${storyState.playerJob}. `;
    const rawSceneText = String(scene.sceneText || '');
    const sceneText = capitalizeStoryText(isNewGame && !rawSceneText.includes(storyState.playerName) ? `${playerIntro}${rawSceneText}` : rawSceneText);
    const sceneForState = { ...scene, sceneText };
    const sceneId = selectedChoice?.endingCandidate || `ai_turn_${Date.now()}`;
    const sameLocationHistory = settingId === storyState.lastSettingId
      ? [...(storyState.adjacentLocationHistory || []), sceneText]
      : [sceneText];

    setGameState((prev) => {
      const nextScores = { ...prev.characterScores };
      const nextRelationships = { ...prev.relationships };
      const nextMajorSeen = { ...prev.majorCharactersSeen };
      charactersPresent.forEach((name) => {
        if (nextScores[name] === undefined) nextScores[name] = NEUTRAL_RELATIONSHIP;
        if (nextRelationships[name] === undefined) nextRelationships[name] = nextScores[name];
        Object.values(prev.majorCharacters || {}).forEach((entry) => {
          if (entry.fullName === name) nextMajorSeen[entry.id] = true;
        });
      });
      return {
        ...prev,
        currentScene: sceneId,
        currentChoiceSet: choices,
        currentSceneCharacters: charactersPresent,
        recentExtras: {
          ...prev.recentExtras,
          [settingId]: temporaryExtras,
        },
        hiddenStats: applyHiddenStatDeltas(prev.hiddenStats, sceneForState.hiddenStatDeltas),
        memorySummary: sceneForState.memoryUpdate || prev.memorySummary,
        adjacentLocationHistory: sameLocationHistory,
        relationshipInteractionsRemaining: RELATIONSHIP_INTERACTIONS_PER_AI_TURN,
        characterScores: nextScores,
        relationships: nextRelationships,
        lastSettingId: settingId,
        turnCount: Number(prev.turnCount || 0) + 1,
        majorCharactersSeen: nextMajorSeen,
        lastAiSource: source,
      };
    });
    setCurrentSettingId(settingId);

    if (sceneTimerRef.current) clearTimeout(sceneTimerRef.current);
    setPendingSceneMessage(true);
    sceneTimerRef.current = setTimeout(() => {
      const cueType = selectedChoice?.endingCandidate
        ? getEndingCueType(selectedChoice.endingCandidate)
        : enteredNewLocation
          ? 'location'
          : 'scene';
      playUiCue(cueType);
      appendMessage(sceneText, 'game', settingId, {
        sceneId,
        extraNames: allSceneNames,
        placeColors: buildPlaceColorSnapshot(storyState.sessionPlaces, settingId),
      });
      setPendingSceneMessage(false);
      sceneTimerRef.current = null;
      if (selectedChoice?.endingCandidate) {
        setGameOverVisible(true);
        appBridge.setShouldShowInterstitial(true);
      }
    }, 650);
  }, [appendMessage, gameState, playUiCue, resolveSceneLocationId]);

  const spendCrownAfterValidScene = useCallback((backendWallet = null, source = 'local_fallback') => {
    if (backendWallet && source === 'backend') {
      setCrownWallet?.(backendWallet);
      return true;
    }
    let spent = false;
    setCrownWallet?.((prev) => {
      const spendResult = spendOneCrown(prev);
      spent = spendResult.spent;
      return spendResult.wallet;
    });
    return spent;
  }, [setCrownWallet]);

  const requestAiTurn = useCallback(async ({ choice = null, isNewGame = false, stateOverride = null } = {}) => {
    const storyStateForRequest = normalizeSceneState(stateOverride || gameState);
    const requestChoice = sanitizeChoiceForPlayer(choice, storyStateForRequest.playerName, storyStateForRequest.majorCharacters);
    if (!storyGenerationReady) {
      const message = 'Story generation is not ready. Supabase app-config must return the required runtime configuration before the story can continue.';
      setPendingSceneMessage(false);
      logError('Story turn blocked because app config is incomplete', new Error(message), {
        isNewGame,
        currentScene: storyStateForRequest.currentScene,
        turnCount: storyStateForRequest.turnCount,
      });
      appBridge.setErrorMessage(message);
      return;
    }
    if (getTotalCrowns(crownWallet) <= 0) {
      setGetCrownsVisible(true);
      return;
    }
    try {
      setPendingSceneMessage(true);
      const storyTurnResult = await generateAiStoryTurn({
        anonymousUserId,
        gameState: storyStateForRequest,
        choice: requestChoice,
        isNewGame,
        wallet: crownWallet,
      });
      spendCrownAfterValidScene(storyTurnResult.wallet, storyTurnResult.source);
      showGeneratedScene(storyTurnResult.scene, storyTurnResult.source, requestChoice, isNewGame, storyStateForRequest);
      appBridge.setErrorMessage('');
    } catch (error) {
      setPendingSceneMessage(false);
      logError('AI story turn failed', error, {
        isNewGame,
        currentScene: storyStateForRequest.currentScene,
        turnCount: storyStateForRequest.turnCount,
      });
      appBridge.setErrorMessage(buildUserErrorMessage('The story could not continue. Please try again.', error));
    }
  }, [anonymousUserId, crownWallet, gameState, showGeneratedScene, spendCrownAfterValidScene, storyGenerationReady]);

  const handleChoice = useCallback((choice) => {
    if (getTotalCrowns(crownWallet) <= 0) {
      setGetCrownsVisible(true);
      return;
    }
    appendMessage(choice.text, 'user');
    playUiCue('choice');
    if (choice.relationship) {
      applyRelationship(choice.relationship, choice.character);
    }
    requestAiTurn({ choice });
  }, [appendMessage, applyRelationship, crownWallet, playUiCue, requestAiTurn]);

  const buildReportPayload = useCallback(() => ({
    anonymousUserId,
    reportTarget,
    reportReason,
    currentScene: gameState.currentScene,
    lastAiSource: gameState.lastAiSource,
    turnCount: gameState.turnCount,
    lastSettingId: gameState.lastSettingId,
    memorySummary: gameState.memorySummary,
    lastSceneText: [...(gameState.history || [])].reverse().find((entry) => entry.type === 'game')?.text || '',
    lastChoiceText: [...(gameState.history || [])].reverse().find((entry) => entry.type === 'user')?.text || '',
    choices: gameState.currentChoiceSet || [],
    currentSceneCharacters: gameState.currentSceneCharacters || [],
    temporaryExtras: gameState.recentExtras?.[gameState.lastSettingId] || [],
    hiddenStats: gameState.hiddenStats || {},
    relationships: gameState.relationships || {},
    majorCharacters: gameState.majorCharacters || {},
  }), [anonymousUserId, gameState, reportReason, reportTarget]);

  const handleReportAiOutcome = useCallback(async () => {
    try {
      const report = buildReportPayload();
      await saveAiOutcomeReport(report);
      await submitBackendAiOutcomeReport(report).catch((error) => {
        logError('Backend AI outcome report submit failed; saved local report', error, {
          currentScene: gameState.currentScene,
        });
      });
      setMenuVisible(false);
      setReportVisible(false);
      appBridge.showToast('AI outcome reported.');
    } catch (error) {
      logError('AI outcome report save failed', error, {
        currentScene: gameState.currentScene,
      });
      appBridge.showToast('Report could not be saved.');
    }
  }, [buildReportPayload, gameState.currentScene]);

  const handleOpenRelationships = useCallback(() => {
    saveGameState(gameState).catch((error) => {
      logError('Game state save before relationships failed', error, {
        currentScene: gameState?.currentScene,
      });
    });
    appBridge.setScreen('relationships');
  }, [gameState]);

  const handleSkipTyping = useCallback(() => {
    setTypingMessageIds([]);
    setSkipSignal((prev) => prev + 1);
    setPendingSceneMessage(false);
    setGameState((prev) => ({
      ...prev,
      history: (Array.isArray(prev.history) ? prev.history : []).map((entry) =>
        entry.type === 'game' && entry.animate ? { ...entry, animate: false } : entry
      ),
    }));
  }, []);

  const handleTypingComplete = useCallback((messageId) => {
    setTypingMessageIds((prev) => prev.filter((id) => id !== messageId));
    setGameState((prev) => ({
      ...prev,
      history: (Array.isArray(prev.history) ? prev.history : []).map((entry) =>
        entry.id === messageId ? { ...entry, animate: false } : entry
      ),
    }));
  }, []);

  const handleStoryTouchStart = useCallback((event) => {
    const { pageX, pageY } = event.nativeEvent;
    storyTouchRef.current = { pageX, pageY };
  }, []);

  const handleStoryTouchEnd = useCallback((event) => {
    if (choicesAreaMinimized || !storyTouchRef.current) return;
    const { pageX, pageY } = event.nativeEvent;
    const deltaX = Math.abs(pageX - storyTouchRef.current.pageX);
    const deltaY = Math.abs(pageY - storyTouchRef.current.pageY);
    storyTouchRef.current = null;
    if (deltaX < 8 && deltaY < 8) {
      setChoicesAreaMinimized(true);
    }
  }, [choicesAreaMinimized]);

  const handleStoryTouchCancel = useCallback(() => {
    storyTouchRef.current = null;
  }, []);

  const startFreshStory = useCallback(async () => {
    await resetGameState();
    const initialStoryState = createInitialState();
    setGameState(initialStoryState);
    setMenuVisible(false);
    setGameOverVisible(false);
    setCurrentSettingId(defaultSettingId);
    setTypingMessageIds([]);
    setPendingSceneMessage(false);
    if (sceneTimerRef.current) {
      clearTimeout(sceneTimerRef.current);
      sceneTimerRef.current = null;
    }
    playUiCue('newGame');
    await requestAiTurn({ isNewGame: true, stateOverride: initialStoryState });
  }, [defaultSettingId, playUiCue, requestAiTurn]);

  const handleReset = useCallback(async () => {
    try {
      await startFreshStory();
      if (!appBridge.adsRemoved) appBridge.setPendingInterstitial(true);
    } catch (error) {
      logError('Reset story failed', error, {});
      appBridge.setErrorMessage(buildUserErrorMessage('We could not reset your story. Please try again.', error));
    }
  }, [startFreshStory]);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const savedGameState = await loadGameState();
        if (savedGameState && Array.isArray(savedGameState.history) && savedGameState.history.length > 0) {
          const normalizedSavedState = normalizeSceneState(savedGameState);
          setGameState(normalizedSavedState);
          setCurrentSettingId(normalizedSavedState.lastSettingId || defaultSettingId);
        } else if (getTotalCrowns(crownWallet) > 0 || anonymousUserId) {
          const initialStoryState = createInitialState();
          setGameState(initialStoryState);
          playUiCue('newGame');
          requestAiTurn({ isNewGame: true, stateOverride: initialStoryState });
        }
      } catch (error) {
        logError('Game state hydration failed', error, {});
        appBridge.setErrorMessage(buildUserErrorMessage('We had trouble loading your story.', error));
      } finally {
        setIsReady(true);
      }
    };
    if (!isReady && storyGenerationReady && (anonymousUserId || getTotalCrowns(crownWallet) > 0)) {
      hydrate();
    }
  }, [anonymousUserId, crownWallet, defaultSettingId, isReady, playUiCue, requestAiTurn, storyGenerationReady]);

  useEffect(() => {
    if (!isReady) return;
    saveGameState(gameState).catch((error) => {
      logError('Game state save failed', error, {
        currentScene: gameState?.currentScene,
      });
    });
  }, [gameState, isReady]);

  useEffect(() => {
    const nextSettingTheme = resolveTheme(currentSettingId || defaultSettingId);
    setBackgroundColors((prev) => ({ from: prev.to, to: nextSettingTheme.background }));
    backgroundAnim.setValue(0);
    Animated.timing(backgroundAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: false,
    }).start();
  }, [backgroundAnim, currentSettingId, defaultSettingId, resolveTheme]);

  const sceneRelationshipEntries = useMemo(
    () =>
      (gameState.currentSceneCharacters || [])
        .map((name) => resolveCharacterName(name, gameState.majorCharacters))
        .filter((name) => name && !isPlayerName(name, gameState.playerName) && gameState.relationships?.[name] !== undefined)
        .map((name) => ({
          name,
          label: `${getRelationshipLabel(gameState.relationships[name])} (${gameState.relationships[name]}/40)`,
        })),
    [gameState.currentSceneCharacters, gameState.majorCharacters, gameState.playerName, gameState.relationships, getRelationshipLabel]
  );
  const sceneRelationshipSummaryText = sceneRelationshipEntries.length
    ? sceneRelationshipEntries.map((entry) => `${entry.name}: ${entry.label}`).join(', ')
    : 'No scene relationships yet';
  const isStoryTyping = pendingSceneMessage || typingMessageIds.length > 0;
  const canSkipTyping = typingMessageIds.length > 0;
  const gameTheme = resolveTheme(currentSettingId || defaultSettingId);
  const animatedBackground = backgroundAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [backgroundColors.from, backgroundColors.to],
  });
  const activeLocationName = settingsById[currentSettingId]?.label || settingsById[defaultSettingId]?.label || '';

  return (
    <AnimatedSafeAreaView style={[styles.safeArea, { backgroundColor: animatedBackground }]}>
      <Animated.View style={[styles.container, { backgroundColor: animatedBackground }]}>
        <View style={[styles.header, { backgroundColor: gameTheme.header }]}>
          <View>
            <Text style={styles.title}>Regency Era Game</Text>
            <Text style={styles.subtitle}>A Regency Romance</Text>
          </View>
          <TouchableOpacity style={styles.burgerButton} onPress={() => setMenuVisible(true)}>
            <View style={styles.burgerIcon}>
              <View style={styles.burgerLine} />
              <View style={styles.burgerLine} />
              <View style={styles.burgerLine} />
            </View>
            <Text style={styles.burgerText}>Menu</Text>
          </TouchableOpacity>
        </View>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.chatArea}>
          <View
            style={styles.openBookFrame}
            onTouchStart={handleStoryTouchStart}
            onTouchEnd={handleStoryTouchEnd}
            onTouchCancel={handleStoryTouchCancel}
          >
            <View style={styles.openBookBackdrop}>
              <View style={styles.openBookPageLeft} />
              <View style={styles.openBookSpine} />
              <View style={styles.openBookPageRight} />
            </View>
            <ScrollView ref={scrollRef} style={styles.bookScroll} contentContainerStyle={styles.chatContent} 
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
              {(Array.isArray(gameState.history) ? gameState.history : []).map((msg) => (
                <MessageBubble key={msg.id} message={msg} skipSignal={skipSignal} onTypingComplete={handleTypingComplete}
                  textSize={messageTextSize} fontFamily={messageFontFamily} messageCount={gameState.history.length}/>
              ))}
              
            </ScrollView>
          </View>
        </View>

        <View style={[styles.choicesArea, choicesAreaMinimized ? styles.choicesAreaMinimized : null, { backgroundColor: gameTheme.footer }]}>
          {choicesAreaMinimized ? (
            <TouchableOpacity style={styles.expandChoicesButton} onPress={() => setChoicesAreaMinimized(false)} activeOpacity={0.85}>
              <Text style={styles.expandChoicesButtonText}>Show choices</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.panelsRow}>
                <TouchableOpacity style={styles.relationshipPanel} onPress={() => setRelationshipModalVisible(true)} activeOpacity={0.8}>
                  <Text style={styles.relationshipLabel}>Scene Relationships</Text>
                  <Text style={styles.relationshipValue} numberOfLines={1} ellipsizeMode="tail">
                    {sceneRelationshipSummaryText}
                  </Text>
                </TouchableOpacity>
                <View style={[styles.locationPanel, { borderColor: gameTheme.background }]}>
                  <Text style={styles.locationLabel}>Location</Text>
                  <Text style={styles.locationValue}>{activeLocationName}</Text>
                </View>
              </View>
              <View style={styles.choiceManuscript}>
                {isStoryTyping ? (
                  <View style={styles.choiceHintRow}>
                    <Text style={styles.choiceHint}>The ink is still drying...</Text>
                    {canSkipTyping ? (
                      <TouchableOpacity style={styles.skipButton} onPress={handleSkipTyping}>
                        <Text style={styles.skipButtonText}>Skip</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : (gameState.currentChoiceSet || []).map((choice) => (
                  <TouchableOpacity key={choice.text} style={styles.choiceInlineButton} onPress={() => handleChoice(choice)}>
                    <Text style={styles.choiceText}>{choice.text}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>
      </Animated.View>

      {renderBannerAd?.()}

      <Modal visible={menuVisible} transparent animationType="slide">
        <Pressable style={styles.drawerOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={styles.drawerContent} onPress={() => {}}>
            <Text style={styles.drawerTitle}>Menu</Text>
            <TouchableOpacity style={styles.drawerButton} onPress={() => setMenuVisible(false)}>
              <Text style={styles.drawerButtonText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerButton} onPress={handleOpenRelationships}>
              <Text style={styles.drawerButtonText}>Relationships</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.drawerButton}
              onPress={() => {
                setMenuVisible(false);
                setReportVisible(true);
              }}
            >
              <Text style={styles.drawerButtonText}>Report AI Outcome</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerButton} onPress={() => appBridge.setScreen('settings')}>
              <Text style={styles.drawerButtonText}>Settings & Crowns</Text>
            </TouchableOpacity>
            {__DEV__ ? (
              <TouchableOpacity style={styles.drawerButton} onPress={() => setMemoryVisible(true)}>
                <Text style={styles.drawerButtonText}>Story Memory</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.drawerButton} onPress={handleReset}>
              <Text style={styles.drawerButtonText}>Reset Story</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerButton} onPress={() => setAboutVisible(true)}>
              <Text style={styles.drawerButtonText}>About</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={getCrownsVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setGetCrownsVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>More Crowns Needed</Text>
            <Text style={styles.modalBody}>
              Story choices need 1 Crown. Earn Crowns with adverts, subscribe, or buy a Crown Purse.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setGetCrownsVisible(false);
                appBridge.setScreen('removeAdverts');
              }}
            >
              <Text style={styles.modalButtonText}>Get Crowns</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={gameOverVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setGameOverVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Game Over</Text>
            <Text style={styles.modalBody}>Your story has reached its conclusion. Start a new game to explore another path.</Text>
            <TouchableOpacity style={styles.modalButton} onPress={startFreshStory}>
              <Text style={styles.modalButtonText}>Start New Game</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={aboutVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setAboutVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>About Regency Era Game</Text>
            <Text style={styles.modalBody}>
              A Regency-era adventure about social standing, court favour, and the choices that shape a life.
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setAboutVisible(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={relationshipModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setRelationshipModalVisible(false)}>
          <Pressable style={styles.relationshipModalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Scene Relationships</Text>
            {sceneRelationshipEntries.length ? (
              sceneRelationshipEntries.map((entry) => (
                <View key={entry.name} style={styles.relationshipModalRow}>
                  <Text style={styles.relationshipModalName}>{entry.name}</Text>
                  <Text style={styles.relationshipModalScore}>{entry.label}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.modalBody}>{sceneRelationshipSummaryText}</Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={reportVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setReportVisible(false)}>
          <Pressable style={styles.reportModalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Report AI Outcome</Text>
            <Text style={styles.reportSectionTitle}>What are you reporting?</Text>
            <View style={styles.optionGrid}>
              {[
                ['scene', 'Scene'],
                ['choice', 'Choice'],
              ].map(([value, label]) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.optionPill, reportTarget === value ? styles.optionPillActive : null]}
                  onPress={() => setReportTarget(value)}
                >
                  <Text style={[styles.optionPillText, reportTarget === value ? styles.optionPillTextActive : null]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.reportSectionTitle}>What went wrong?</Text>
            <View style={styles.optionGrid}>
              {[
                ['quality', 'Bad writing'],
                ['repeat', 'Repeated'],
                ['continuity', 'Continuity'],
                ['unsafe', 'Unsafe'],
                ['wrong_choice', 'Bad choice'],
                ['other', 'Other'],
              ].map(([value, label]) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.optionPill, reportReason === value ? styles.optionPillActive : null]}
                  onPress={() => setReportReason(value)}
                >
                  <Text style={[styles.optionPillText, reportReason === value ? styles.optionPillTextActive : null]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.modalButton} onPress={handleReportAiOutcome}>
              <Text style={styles.modalButtonText}>Submit Report</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={memoryVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setMemoryVisible(false)}>
          <Pressable style={styles.memoryModalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Story Memory</Text>
            <ScrollView>
              <View style={styles.memorySection}>
                <Text style={styles.memorySectionTitle}>Player</Text>
                <Text style={styles.memoryText}>{gameState.playerName}, age {gameState.playerAge}</Text>
                <Text style={styles.memoryText}>{gameState.playerBackground}</Text>
              </View>
              <View style={styles.memorySection}>
                <Text style={styles.memorySectionTitle}>Current Scene</Text>
                <Text style={styles.memoryText}>Turn: {gameState.turnCount}</Text>
                <Text style={styles.memoryText}>Location: {activeLocationName}</Text>
                <Text style={styles.memoryText}>AI source: {gameState.lastAiSource || 'Pending'}</Text>
                <Text style={styles.memoryText}>Scene characters: {(gameState.currentSceneCharacters || []).join(', ') || 'None yet'}</Text>
                <Text style={styles.memoryText}>Temporary extras: {(gameState.recentExtras?.[gameState.lastSettingId] || []).join(', ') || 'None'}</Text>
              </View>
              <View style={styles.memorySection}>
                <Text style={styles.memorySectionTitle}>Story Direction</Text>
                <Text style={styles.memoryText}>{gameState.memorySummary || 'No memory summary yet.'}</Text>
                {(gameState.adjacentLocationHistory || []).slice(-3).map((entry, index) => (
                  <Text key={`history-${index}`} style={styles.memoryText}>Recent beat {index + 1}: {entry}</Text>
                ))}
              </View>
              <View style={styles.memorySection}>
                <Text style={styles.memorySectionTitle}>Major Characters</Text>
                {Object.entries(gameState.majorCharacters || {}).map(([id, character]) => (
                  <Text key={id} style={styles.memoryText}>
                    {character.fullName} ({id}) - {gameState.majorCharactersSeen?.[id] ? 'Seen' : 'Not seen yet'}
                  </Text>
                ))}
              </View>
              <View style={styles.memorySection}>
                <Text style={styles.memorySectionTitle}>Relationships</Text>
                {Object.entries(gameState.relationships || {}).length ? Object.entries(gameState.relationships || {}).map(([name, score]) => (
                  <Text key={name} style={styles.memoryText}>{name}: {getRelationshipLabel(score)} ({score}/40)</Text>
                )) : <Text style={styles.memoryText}>No relationship changes yet.</Text>}
              </View>
              <View style={styles.memorySection}>
                <Text style={styles.memorySectionTitle}>Hidden Story Stats</Text>
                {Object.entries(gameState.hiddenStats || {}).map(([name, value]) => (
                  <Text key={name} style={styles.memoryText}>{name}: {value}</Text>
                ))}
              </View>
              <View style={styles.memorySection}>
                <Text style={styles.memorySectionTitle}>Current Choices</Text>
                {(gameState.currentChoiceSet || []).map((choice, index) => (
                  <Text key={`${choice.text}-${index}`} style={styles.memoryText}>{index + 1}. {choice.text}</Text>
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {appBridge.toastMessage ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{appBridge.toastMessage}</Text>
        </View>
      ) : null}
    </AnimatedSafeAreaView>
  );
};
