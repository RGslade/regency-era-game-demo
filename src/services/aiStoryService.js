import { endingIds } from '../types/endings';
import { settings, defaultSettingId } from '../types/settings';
import { firstNames, lowSocietySurnames } from '../types/names';
import { SUPABASE_FUNCTION_URLS, buildSupabaseFunctionHeaders, hasSupabaseFunctionAuth } from './appConfig';
import { logInfo, logWarn } from './logger';

const STORY_FUNCTION_URL = SUPABASE_FUNCTION_URLS.story;
const WALLET_FUNCTION_URL = SUPABASE_FUNCTION_URLS.wallet;

const pick = (list = []) => list[Math.floor(Math.random() * list.length)];

const createRequestId = () => `story_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const normalizeComparableName = (value) => String(value || '').trim().toLowerCase();

// Detects references to the player so backend NPC lists stay clean.
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

const sanitizeChoiceForPlayer = (choice = null, playerName = '') => {
  if (!choice) return choice;
  const target = choice.targetCharacter || choice.character || null;
  if (!isPlayerName(target, playerName)) return choice;
  return {
    ...choice,
    targetCharacter: null,
    character: null,
  };
};

// Removes player-name references before sending state to AI services.
const sanitizeGameStateForStory = (gameState = {}) => {
  const playerName = gameState.playerName || '';
  return {
    ...gameState,
    relationships: omitPlayerEntries(gameState.relationships || {}, playerName),
    characterScores: omitPlayerEntries(gameState.characterScores || {}, playerName),
    currentSceneCharacters: filterPlayerNames(gameState.currentSceneCharacters, playerName),
    currentChoiceSet: (gameState.currentChoiceSet || []).map((choice) => sanitizeChoiceForPlayer(choice, playerName)),
    narrationGuidance: [
      `The protagonist is ${playerName || 'the player'}; never include her in charactersPresent, temporaryExtras, targetCharacter, relationships, or characterScores.`,
      'For all non-player characters, return their full display name exactly as shown in majorCharacters.fullName or scene history; never return ids such as lord_a or mr_bellamy.',
      'After the opening introduction, narrate the protagonist in second person as "you", not in third person by name. Write full second-person sentences with correct agreement, such as "you light", "you are", "you have", and "you step"; do not mechanically replace the protagonist name in a third-person sentence.',
      'Start sceneText with a capital letter.',
    ],
  };
};

const getSettingLabel = (settingId) =>
  settings.find((setting) => setting.id === settingId)?.label || settingId || null;

// Compresses a selected choice into a safe debug payload.
const summarizeChoice = (choice = null, playerName = '') => {
  if (!choice) return null;
  const sanitizedChoice = sanitizeChoiceForPlayer(choice, playerName);
  return {
    text: sanitizedChoice.text || null,
    effectType: sanitizedChoice.effectType || null,
    targetCharacter: sanitizedChoice.targetCharacter || sanitizedChoice.character || null,
    relationshipDelta: sanitizedChoice.relationshipDelta ?? sanitizedChoice.relationship ?? null,
    riskDelta: sanitizedChoice.riskDelta ?? null,
    nextLocationId: sanitizedChoice.nextLocationId || null,
    nextLocationLabel: getSettingLabel(sanitizedChoice.nextLocationId),
    endingCandidate: sanitizedChoice.endingCandidate || null,
  };
};

const summarizeCharacters = (gameState = {}) => {
  const playerName = gameState.playerName || '';
  const sceneNames = new Set([
    ...filterPlayerNames(gameState.currentSceneCharacters, playerName),
    ...Object.keys(omitPlayerEntries(gameState.relationships || {}, playerName)),
  ]);
  return Array.from(sceneNames).sort().map((name) => ({
    name,
    relationship: gameState.relationships?.[name] ?? null,
    characterScore: gameState.characterScores?.[name] ?? null,
    presentInCurrentScene: (gameState.currentSceneCharacters || []).includes(name),
  }));
};

const summarizeRecentHistory = (history = []) =>
  (Array.isArray(history) ? history : []).slice(-4).map((entry) => ({
    type: entry.type,
    sceneId: entry.sceneId,
    settingId: entry.settingId,
    text: typeof entry.text === 'string' ? entry.text.slice(0, 240) : '',
  }));

// Builds structured input logs without dumping unbounded game state.
const buildAiDebugInput = ({ anonymousUserId, gameState = {}, choice = null, isNewGame = false } = {}) => ({
  anonymousUserId,
  isNewGame,
  selectedChoice: summarizeChoice(choice, gameState.playerName),
  currentScene: gameState.currentScene || null,
  turnCount: gameState.turnCount ?? null,
  lastLocationId: gameState.lastSettingId || null,
  lastLocationLabel: getSettingLabel(gameState.lastSettingId),
  player: {
    name: gameState.playerName || null,
    age: gameState.playerAge || null,
    job: gameState.playerJob || null,
    background: gameState.playerBackground || null,
  },
  sceneCharacters: summarizeCharacters(gameState),
  currentChoiceSet: (gameState.currentChoiceSet || []).map((currentChoice) => summarizeChoice(currentChoice, gameState.playerName)),
  hiddenStats: gameState.hiddenStats || {},
  memorySummary: gameState.memorySummary || '',
  recentExtras: gameState.recentExtras || {},
  adjacentLocationHistory: (gameState.adjacentLocationHistory || []).slice(-3),
  recentHistory: summarizeRecentHistory(gameState.history),
});

const getExpectedSceneLocationId = (gameState = {}, choice = null, isNewGame = false) => {
  if (choice?.nextLocationId) return choice.nextLocationId;
  if (!isNewGame) return gameState.lastSettingId || defaultSettingId;
  return gameState.lastSettingId || defaultSettingId;
};

const buildAiDebugOutput = (scene = {}, source = 'unknown') => ({
  source,
  locationId: scene.locationId || null,
  locationLabel: getSettingLabel(scene.locationId),
  sceneText: typeof scene.sceneText === 'string' ? scene.sceneText.slice(0, 1000) : '',
  charactersPresent: scene.charactersPresent || [],
  temporaryExtras: scene.temporaryExtras || [],
  promoteTemporaryCharacter: Boolean(scene.promoteTemporaryCharacter),
  hiddenStatDeltas: scene.hiddenStatDeltas || {},
  memoryUpdate: scene.memoryUpdate || '',
  continuityCheck: scene.continuityCheck || '',
  choices: (scene.choices || []).map(summarizeChoice),
});

const allowedEffectTypes = new Set([
  'romance',
  'ambition',
  'family',
  'risk',
  'retreat',
  'deception',
  'kindness',
  'defiance',
  'reputation',
  'court',
]);

const MIN_SCENE_TEXT_LENGTH = 160;
const MIN_SCENE_WORDS = 28;

const hasCompleteSceneText = (sceneText = '') => {
  const text = String(sceneText || '').trim();
  if (text.length < MIN_SCENE_TEXT_LENGTH) return false;
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < MIN_SCENE_WORDS) return false;
  const textWithoutClosingMarks = text.replace(/["'”’)\]]+$/g, '').trim();
  return /[.!?]$/.test(textWithoutClosingMarks);
};

const buildFallbackChoice = (text, effectType, relationshipDelta, nextLocationId, targetCharacter = null) => ({
  text,
  effectType,
  targetCharacter,
  relationshipDelta,
  riskDelta: effectType === 'risk' || effectType === 'defiance' ? 1 : 0,
  nextLocationId,
  endingCandidate: null,
});

// Builds a local scene when the backend is unavailable for demos.
export const buildLocalAiFallbackScene = ({ gameState = {}, choice = null, isNewGame = false } = {}) => {
  const knownNames = [
    ...(Array.isArray(gameState.currentSceneCharacters) ? gameState.currentSceneCharacters : []),
    ...Object.keys(gameState.relationships || {}),
  ].filter(Boolean);
  const recurringName = pick(knownNames) || 'Mother';
  const currentLocationId = choice?.nextLocationId || gameState.lastSettingId || defaultSettingId;
  const nextSetting = settings.find((setting) => setting.id === currentLocationId) || settings[0];
  const sideName = `${pick(firstNames)} ${pick(lowSocietySurnames)}`;
  const playerName = gameState.playerName || 'Eleanor';
  const relationshipTarget = isNewGame ? null : recurringName;
  const intro = isNewGame
    ? `The morning begins with your name spoken softly at the window: ${playerName}. The day has the restless quality of a sealed letter, and even the ordinary sounds of ${nextSetting.label.toLowerCase()} seem to be waiting for your first move.`
    : `Your last choice settles over the room like candle smoke. At ${nextSetting.label.toLowerCase()}, ${recurringName} watches closely while ${sideName} passes with news that may alter the shape of the day.`;

  return {
    sceneText: intro,
    locationId: nextSetting.id,
    charactersPresent: relationshipTarget ? [relationshipTarget] : [],
    temporaryExtras: [sideName],
    promoteTemporaryCharacter: false,
    hiddenStatDeltas: {
      reputation: 0,
      security: 0,
      ambition: isNewGame ? 1 : 0,
      familyDuty: 0,
      scandal: 0,
      courtFavour: 0,
    },
    choices: [
      buildFallbackChoice('Answer with careful grace', 'reputation', relationshipTarget ? 1 : 0, nextSetting.id, relationshipTarget),
      buildFallbackChoice('Press for the truth behind the rumour', 'ambition', 0, 'market', relationshipTarget),
      buildFallbackChoice('Withdraw before the moment turns dangerous', 'retreat', 0, 'home', null),
    ],
    memoryUpdate: isNewGame
      ? `${playerName} began a new Regency story at ${nextSetting.label}.`
      : `${playerName} continued through ${nextSetting.label} after choosing: ${choice?.text || 'an uncertain path'}.`,
    continuityCheck: isNewGame
      ? 'Local fallback used for a new story without introducing a relationship character.'
      : 'Local development fallback used because the story backend is not configured or unavailable.',
  };
};

// Validates backend scenes before they enter the game state.
export const validateAiScene = (scene = {}) => {
  const allowedLocations = new Set(settings.map((setting) => setting.id));
  if (!scene || typeof scene.sceneText !== 'string' || !hasCompleteSceneText(scene.sceneText)) {
    return false;
  }
  if (!allowedLocations.has(scene.locationId)) {
    return false;
  }
  if (!Array.isArray(scene.choices) || scene.choices.length < 3 || scene.choices.length > 5) {
    return false;
  }
  return scene.choices.every((choice) => {
    if (!choice || typeof choice.text !== 'string' || choice.text.trim().length < 4) return false;
    if (!allowedEffectTypes.has(choice.effectType)) return false;
    if (choice.nextLocationId && !allowedLocations.has(choice.nextLocationId)) return false;
    if (choice.endingCandidate && !endingIds.includes(choice.endingCandidate)) return false;
    return true;
  });
};

// Converts backend story errors into user-actionable failures.
const buildStoryBackendError = (status, responseText, requestId = '') => {
  const requestDetails = requestId ? ` Request id: ${requestId}.` : '';
  let payload = null;
  try {
    payload = JSON.parse(responseText);
  } catch {
    payload = null;
  }
  if (payload?.code === 'NO_CROWNS') {
    const error = new Error(`${payload.error || 'No Crowns available.'}${requestDetails}`);
    error.code = payload.code;
    error.wallet = payload.wallet || null;
    error.requestId = payload.requestId || requestId;
    return error;
  }
  if (responseText.includes('Unexpected end of JSON input')) {
    return new Error(
      `Supabase generate-story-turn returned ${status} while parsing JSON. ` +
      'Check the Edge Function logs for the OpenAI response body; the function is likely parsing an empty response or an empty JSON field. ' +
      `Backend response: ${responseText}.${requestDetails}`
    );
  }
  return new Error(`${responseText || `Story generation failed with status ${status}`}${requestDetails}`);
};

// Generates the next story turn through Supabase or the local fallback.
export const generateAiStoryTurn = async ({
  anonymousUserId,
  gameState,
  choice,
  isNewGame = false,
  wallet,
} = {}) => {
  const requestId = createRequestId();
  const requestGameState = sanitizeGameStateForStory(gameState);
  const requestChoice = sanitizeChoiceForPlayer(choice, requestGameState.playerName);
  const expectedLocationId = getExpectedSceneLocationId(requestGameState, requestChoice, isNewGame);
  const debugInput = buildAiDebugInput({ anonymousUserId, gameState: requestGameState, choice: requestChoice, isNewGame });
  logInfo('AI story turn input', {
    requestId,
    ...debugInput,
    backendConfigured: Boolean(STORY_FUNCTION_URL && hasSupabaseFunctionAuth()),
  });

  if (!STORY_FUNCTION_URL || !hasSupabaseFunctionAuth()) {
    const scene = buildLocalAiFallbackScene({ gameState: requestGameState, choice: requestChoice, isNewGame });
    logWarn('AI story turn using local fallback', {
      requestId,
      reason: !STORY_FUNCTION_URL ? 'missing_story_function_url' : 'missing_or_invalid_supabase_function_auth',
      input: debugInput,
      output: buildAiDebugOutput(scene, 'local_fallback'),
    });
    return {
      scene,
      wallet,
      source: 'local_fallback',
    };
  }

  logInfo('AI story turn backend request started', {
    requestId,
    currentScene: debugInput.currentScene,
    turnCount: debugInput.turnCount,
    lastLocationId: debugInput.lastLocationId,
    selectedChoice: debugInput.selectedChoice,
  });

  const response = await fetch(STORY_FUNCTION_URL, {
    method: 'POST',
    headers: buildSupabaseFunctionHeaders({
      'Content-Type': 'application/json',
      'x-client-request-id': requestId,
    }),
    body: JSON.stringify({
      requestId,
      anonymousUserId,
      gameState: requestGameState,
      choice: requestChoice,
      isNewGame,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logWarn('AI story turn backend request failed', {
      requestId,
      status: response.status,
      input: debugInput,
      responseText: errorText,
    });
    const error = buildStoryBackendError(response.status, errorText, requestId);
    if (error.code === 'NO_CROWNS' && wallet && Number(wallet.freeCrowns || 0) + Number(wallet.rewardedCrowns || 0) + Number(wallet.subscriptionCrowns || 0) + Number(wallet.topupCrowns || 0) > 0) {
      const scene = buildLocalAiFallbackScene({ gameState: requestGameState, choice: requestChoice, isNewGame });
      logInfo('AI story turn using local fallback because backend wallet is stale', {
        requestId,
        backendWallet: error.wallet,
        localWallet: wallet,
        input: debugInput,
        output: buildAiDebugOutput(scene, 'local_fallback'),
      });
      return {
        scene,
        wallet,
        source: 'local_fallback',
      };
    }
    throw error;
  }

  const payload = await response.json();
  const rawScene = payload?.scene || payload;
  const scene = rawScene?.locationId === expectedLocationId
    ? rawScene
    : {
        ...rawScene,
        locationId: expectedLocationId,
      };
  if (rawScene?.locationId && rawScene.locationId !== expectedLocationId) {
    logWarn('AI story turn location corrected to expected location', {
      requestId,
      returnedLocationId: rawScene.locationId,
      returnedLocationLabel: getSettingLabel(rawScene.locationId),
      expectedLocationId,
      expectedLocationLabel: getSettingLabel(expectedLocationId),
      selectedChoice: debugInput.selectedChoice,
      lastLocationId: debugInput.lastLocationId,
    });
  }
  if (!validateAiScene(scene)) {
    logWarn('AI story turn returned invalid scene', {
      requestId,
      input: debugInput,
      output: buildAiDebugOutput(scene, 'backend_invalid'),
      rawPayload: payload,
    });
    throw new Error('Story generation returned an invalid scene.');
  }
  logInfo('AI story turn backend outcome', {
    requestId,
    input: debugInput,
    output: buildAiDebugOutput(scene, 'backend'),
    walletReturned: Boolean(payload?.wallet),
  });
  return {
    scene,
    wallet: payload?.wallet || wallet,
    source: 'backend',
  };
};

// Fetches the current wallet state from the optional backend.
export const fetchBackendCrownWallet = async ({ anonymousUserId } = {}) => {
  if (!WALLET_FUNCTION_URL || !hasSupabaseFunctionAuth() || !anonymousUserId) {
    return null;
  }
  const response = await fetch(WALLET_FUNCTION_URL, {
    method: 'POST',
    headers: buildSupabaseFunctionHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      anonymousUserId,
      action: 'get_wallet',
    }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const payload = await response.json();
  return payload?.wallet || null;
};

// Grants rewarded-ad currency through the backend when configured.
export const grantBackendRewardedCrowns = async ({ anonymousUserId, adNetworkReceipt = null } = {}) => {
  if (!WALLET_FUNCTION_URL || !hasSupabaseFunctionAuth() || !anonymousUserId) {
    return null;
  }
  const response = await fetch(WALLET_FUNCTION_URL, {
    method: 'POST',
    headers: buildSupabaseFunctionHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      anonymousUserId,
      action: 'grant_rewarded_ad',
      adNetworkReceipt,
    }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const payload = await response.json();
  return payload?.wallet || null;
};

// Persists AI quality reports for backend review workflows.
export const submitBackendAiOutcomeReport = async (report = {}) => {
  if (!SUPABASE_FUNCTION_URLS.report || !hasSupabaseFunctionAuth()) {
    return null;
  }
  const response = await fetch(SUPABASE_FUNCTION_URLS.report, {
    method: 'POST',
    headers: buildSupabaseFunctionHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify(report),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const payload = await response.json();
  return payload || null;
};

// Saves player app settings to the optional backend.
export const syncBackendUserSettings = async ({ anonymousUserId, settings } = {}) => {
  if (!SUPABASE_FUNCTION_URLS.settings || !hasSupabaseFunctionAuth() || !anonymousUserId) {
    return null;
  }
  const response = await fetch(SUPABASE_FUNCTION_URLS.settings, {
    method: 'POST',
    headers: buildSupabaseFunctionHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      anonymousUserId,
      action: 'save',
      settings,
    }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const payload = await response.json();
  return payload?.settings || null;
};

// Loads player app settings from the optional backend.
export const fetchBackendUserSettings = async ({ anonymousUserId } = {}) => {
  if (!SUPABASE_FUNCTION_URLS.settings || !hasSupabaseFunctionAuth() || !anonymousUserId) {
    return null;
  }
  const response = await fetch(SUPABASE_FUNCTION_URLS.settings, {
    method: 'POST',
    headers: buildSupabaseFunctionHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      anonymousUserId,
      action: 'get',
    }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  const payload = await response.json();
  return payload?.settings || null;
};
