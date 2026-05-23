import { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { appStyles as styles } from '../styles/appStyles';
import { interactionOptionsByCategory, defaultInteractionOptions } from '../types/interactions';
import { getCharacterCategory } from '../types/characters';
import { MAX_RELATIONSHIP, MIN_RELATIONSHIP, RELATIONSHIP_INTERACTIONS_PER_AI_TURN } from '../constants/game';
import { appBridge } from '../services/appBridge';
import { loadGameState, saveGameState } from '../services/storage';
import { logError } from '../services/logger';
import { colors } from '../constants/colors';

const memoryNamePattern = /\s*(?:\(|\[)?in[ _-]+memory(?:\)|\])?\s*/i;

const titleCaseName = (value) => String(value || '')
  .replace(memoryNamePattern, '')
  .replace(/_/g, ' ')
  .trim()
  .replace(/\s+/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getRelationshipDisplayInfo = (name, majorCharacters = {}) => {
  const isInMemory = memoryNamePattern.test(String(name || ''));
  const cleanedName = String(name || '').replace(memoryNamePattern, '').trim();
  const majorCharacter = Object.values(majorCharacters || {}).find((character) => {
    return character?.id === cleanedName || character?.fullName === cleanedName;
  });
  return {
    displayName: majorCharacter?.fullName || titleCaseName(cleanedName) || name,
    isInMemory,
  };
};

const isPlayerName = (name, playerName) => {
  return Boolean(name && playerName && String(name).trim().toLowerCase() === String(playerName).trim().toLowerCase());
};

export const RelationshipsScreen = ({
  theme,
  getRelationshipBorderColor,
  getRelationshipLabel,
  renderBannerAd,
}) => {
  const [expandedRelationship, setExpandedRelationship] = useState('');
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    let isMounted = true;
    loadGameState()
      .then((saved) => {
        if (isMounted) setGameState(saved || null);
      })
      .catch((error) => {
        logError('Relationships screen state load failed', error, {});
      });
    return () => {
      isMounted = false;
    };
  }, []);
  
  const relationshipEntries = useMemo(() => {
    return Object.entries(gameState?.relationships || {})
      .filter(([name]) => !isPlayerName(name, gameState?.playerName))
      .map(([name, score]) => ({
        name,
        score,
        ...getRelationshipDisplayInfo(name, gameState?.majorCharacters),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [gameState?.majorCharacters, gameState?.playerName, gameState?.relationships]);
  const getInteractionOptionCount = useCallback((score) => {
    if (score >= 32) return 5;
    if (score >= 25) return 4;
    if (score >= 16) return 4;
    return 3;
  }, []);
  const interactionWeightTable = useMemo(() => [
    { min: 0, max: 7, weights: { negative: 0.7, neutral: 0.2, positive: 0.1 } },
    { min: 8, max: 15, weights: { negative: 0.5, neutral: 0.3, positive: 0.2 } },
    { min: 16, max: 24, weights: { negative: 0.25, neutral: 0.45, positive: 0.3 } },
    { min: 25, max: 31, weights: { negative: 0.1, neutral: 0.35, positive: 0.55 } },
    { min: 32, max: 40, weights: { negative: 0.05, neutral: 0.25, positive: 0.7 } },
  ], []);
  const getInteractionWeightProfile = useCallback((score) => {
    return (interactionWeightTable.find((entry) => score >= entry.min && score <= entry.max) || interactionWeightTable[2]);
  }, [interactionWeightTable]);
  const pickWeightedOptions = useMemo(() => (options, score, seed, count = 3) => { //Its used
    if (!options || options.length <= count) return options || [];
    const { weights } = getInteractionWeightProfile(score);
    const remaining = options.map((option, index) => ({ option, index, weight: weights[getInteractionSentiment(option.delta)] || 0.1, }));
    const rng = seededRandom(hashStringToInt(seed));
    const picked = [];
    while (picked.length < count && remaining.length) {
      const totalWeight = remaining.reduce((sum, entry) => sum + entry.weight, 0);
      let roll = rng() * totalWeight;
      let selectedIndex = remaining.length - 1;
      for (let i = 0; i < remaining.length; i += 1) {
        roll -= remaining[i].weight;
        if (roll <= 0) {
          selectedIndex = i;
          break;
        }
      }
      picked.push(remaining[selectedIndex].option);
      remaining.splice(selectedIndex, 1);
    }
    return picked;
  }, [getInteractionWeightProfile]);

  const getInteractionSentiment = (delta) => {
    if (delta > 0) return 'positive';
    if (delta < 0) return 'negative';
    return 'neutral';
  };

  const hashStringToInt = (value) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return hash;
  };

  const seededRandom = (seed) => {
    let current = seed >>> 0;
    return () => {
      current = (current * 1664525 + 1013904223) >>> 0;
      return current / 2 ** 32;
    };
  };
  const getWeightedInteractionOptions = useCallback(
    (characterName, displayName, score) => {
      const options = interactionOptionsByCategory[getCharacterCategory(displayName)] || defaultInteractionOptions;
      const seed = `${gameState?.currentScene || ''}:${characterName}:${score}`;
      return pickWeightedOptions(options, score, seed, getInteractionOptionCount(score));
    },
    [gameState?.currentScene, getInteractionOptionCount, pickWeightedOptions]
  );
  const handleRelationshipInteraction = useCallback((characterName, displayName, option) => {
    setGameState((prev) => {
      if (!prev) return prev;
      if ((prev.relationshipInteractionsRemaining || 0) <= 0) {
        appBridge.showToast('Choose a story option before interacting again.');
        return prev;
      }
      const currentScore = prev.characterScores?.[characterName] ?? prev.relationships?.[characterName] ?? 20;
      if (currentScore <= MIN_RELATIONSHIP) {
        appBridge.showToast(`${displayName} refuses to engage with you.`);
        return prev;
      }
      const nextScore = Math.max(MIN_RELATIONSHIP, Math.min(MAX_RELATIONSHIP, currentScore + option.delta));
      const nextOverall = Math.max(MIN_RELATIONSHIP, Math.min(MAX_RELATIONSHIP, Number(prev.relationship || 20) + option.delta));
      const next = {
        ...prev,
        relationship: nextOverall,
        relationshipInteractionsRemaining: Math.max(
          0,
          Number(prev.relationshipInteractionsRemaining ?? RELATIONSHIP_INTERACTIONS_PER_AI_TURN) - 1
        ),
        characterScores: {
          ...(prev.characterScores || {}),
          [characterName]: nextScore,
        },
        relationships: {
          ...(prev.relationships || {}),
          [characterName]: nextScore,
        },
      };
      saveGameState(next).catch((error) => {
        logError('Relationship interaction save failed', error, {
          characterName,
        });
      });
      appBridge.showToast(option.outcome);
      return next;
    });
  }, []);
  const interactionsRemaining = Number(gameState?.relationshipInteractionsRemaining ?? RELATIONSHIP_INTERACTIONS_PER_AI_TURN);
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.settingsHeader, { backgroundColor: theme.header }]}>
        <TouchableOpacity onPress={() => appBridge.setScreen('game')} style={styles.menuButton}>
          <Text style={styles.menuButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.settingsTitle}>Relationships</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView contentContainerStyle={styles.relationshipList}>
        <View style={styles.relationshipLedgerIntro}>
          <Text style={styles.relationshipLedgerTitle}>Society Ledger</Text>
          <Text style={styles.relationshipLedgerBody}>Keep account of every alliance, slight, and whispered favour.</Text>
          <Text style={styles.relationshipLedgerMeta}>Interactions remaining before your next story choice: {interactionsRemaining}</Text>
        </View>
        {relationshipEntries.length === 0 ? (
          <Text style={styles.relationshipEmpty}>
            You have not established any lasting relationships yet.
          </Text>
        ) : (
          relationshipEntries.map(({ name, displayName, isInMemory, score }) => (
            <View key={name} style={styles.relationshipItem}>
              <TouchableOpacity
                onPress={() => setExpandedRelationship((prev) => (prev === name ? '' : name))}
                style={[
                  styles.relationshipRow,
                  { borderColor: isInMemory ? colors.relationshipHigh : getRelationshipBorderColor(score) },
                ]}
              >
                <Text style={styles.relationshipName}>{displayName}</Text>
                <Text style={styles.relationshipScore}>
                  {getRelationshipLabel(score)} ({score}/40)
                </Text>
              </TouchableOpacity>
              {expandedRelationship === name ? (
                <View style={styles.relationshipAccordion}>
                  {interactionsRemaining <= 0 ? (
                    <Text style={styles.interactionHint}>
                      Choose a story option before interacting again.
                    </Text>
                  ) : score <= MIN_RELATIONSHIP ? (
                    <Text style={styles.interactionHint}>
                      {displayName} refuses to engage with you.
                    </Text>
                  ) : (
                    getWeightedInteractionOptions(name, displayName, score).map((option) => (
                      <TouchableOpacity
                        key={`${name}-${option.text}`}
                        style={styles.interactionButton}
                        onPress={() => handleRelationshipInteraction(name, displayName, option)}
                      >
                        <Text style={styles.interactionButtonText}>{option.text}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
      {renderBannerAd?.()}
    </SafeAreaView>
  );
};
