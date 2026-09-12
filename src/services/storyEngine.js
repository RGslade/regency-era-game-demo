import { endingIds } from '../types/endings';
import { importantCharacters } from '../types/characters';
import { firstNames, royalNames, surnames } from '../types/names';
import {conflictActions, fateTwists, highStakesActions, kingGeorgeMoments, moods, outcomes, romanticActions, roles, tasks, } from '../types/scenarios';
import { places } from '../types/places';
import { settings } from '../types/settings';

const titleRanks = ['Earl', 'Marquess', 'Viscount', 'Baron', 'Countess', 'Duke', 'Duchess'];

const pick = (list = []) => {
  if (!Array.isArray(list) || list.length === 0) return '';
  return list[Math.floor(Math.random() * list.length)];
};
const removeNameFromList = (list = [], nameToRemove) => {
  if (!nameToRemove) {
    return list;
  }
  const filtered = (Array.isArray(list) ? list : []).filter(
    (name) => name.toLowerCase() !== nameToRemove.toLowerCase()
  );
  return filtered.length ? filtered : list;
};

const generateTitledName = (playerName) => {
  // Blend royal, titled, and family names for variety.
  const filteredFirstNames = removeNameFromList(firstNames, playerName);
  const filteredRoyalNames = removeNameFromList(royalNames, playerName);
  const roll = Math.random();
  if (roll < 0.3) {
    const title = pick(titleRanks);
    const place = pick(places);
    return `${title} of ${place}`;
  }
  if (roll < 0.6) {
    const royalTitle = pick(['Queen', 'King', 'Prince', 'Princess']);
    const royalName = pick(filteredRoyalNames);
    return `${royalTitle} ${royalName}`;
  }
  return `${pick(filteredFirstNames)} ${pick(surnames)}`;
};

const maybePickEnding = (fallbackNext, allowEnding) => {
  const isAlreadyEnding = endingIds.includes(fallbackNext);
  if (isAlreadyEnding) {
    return fallbackNext;
  }
  if (!allowEnding) {
    return fallbackNext;
  }
  return Math.random() < 0.04 ? pick(endingIds) : fallbackNext;
};

const pickActions = (actionSet, count) => {
  if (!Array.isArray(actionSet) || actionSet.length <= count) {
    return actionSet;
  }
  const pool = [...actionSet];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
};

const buildChoices = (actionSet, fallbackNext, allowEnding = true, maxChoices = 3) => {
  // Blend action text with meaningful relationship deltas.
  return pickActions(actionSet, maxChoices).map((action) => ({
    text: action.text,
    next: maybePickEnding(fallbackNext, allowEnding),
    relationship: action.delta,
  }));
};

const getRelationshipWeight = (score, neutralScore) => {
  const delta = score - neutralScore;
  return Math.max(0.3, 1 + delta * 0.15);
};

const pickRecurringCharacter = (relationships, neutralScore) => {
  const knownNames = Object.keys(relationships || {});
  if (knownNames.length === 0) {
    return null;
  }
  const weightedPool = knownNames.map((name) => ({
    name,
    weight: getRelationshipWeight(relationships[name], neutralScore),
  }));
  const totalWeight = weightedPool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of weightedPool) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.name;
    }
  }
  return weightedPool[0]?.name || null;
};

const shouldUseKnownCharacter = (relationships, neutralScore) => {
  const scores = Object.values(relationships || {});
  if (scores.length === 0) {
    return false;
  }
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const bias = Math.max(0.15, Math.min(0.4, 0.15 + (averageScore - neutralScore) * 0.02));
  return Math.random() < bias;
};

export const createDynamicScene = ({
  relationships = {},
  neutralScore = 20,
  playerName = '',
  placeNames = {},
} = {}) => {
  const setting = pick(settings);
  const placeLabel = placeNames?.[setting.id] || setting.label;
  const recurringCandidate = pickRecurringCharacter(relationships, neutralScore);
  const importantFallback = Math.random() < 0.2 ? pick(importantCharacters) : null;
  const useKnown = shouldUseKnownCharacter(relationships, neutralScore);
  const useImportant = Math.random() < 0.15;
  const name = useKnown ? recurringCandidate || importantFallback || generateTitledName(playerName) : useImportant ? importantFallback || generateTitledName(playerName) : generateTitledName(playerName);
  const role = pick(roles);
  const task = pick(tasks);
  const mood = pick(moods);
  const outcome = pick(outcomes);
  const twist = pick(fateTwists);
  const scenarioRoll = Math.random();
  // Rotate base templates to keep procedural scenes feeling fresh.
  const baseTextOptions = [
    `While ${task} near ${placeLabel.toLowerCase()}, you cross paths with ${name}, ${role}. Their expression is ${mood} as their gaze lingers on you. A question hangs between you, and the air feels charged. ${outcome} ${twist}`,
    `At ${placeLabel.toLowerCase()}, a whisper of your name follows you. ${name}, ${role}, steps from the crowd with a ${mood} look. ${outcome} ${twist}`,
    `A carriage halts near ${placeLabel.toLowerCase()}, and ${name}, ${role}, offers their hand. The night smells of rain and rumour. ${outcome} ${twist}`,
  ];

  let text = pick(baseTextOptions);
  let choices = buildChoices(romanticActions, 'dynamic_event', false);

  if (scenarioRoll > 0.66) {
    text =
      `A scandal flares at ${placeLabel.toLowerCase()}. ${name} confronts you about a rumour, voice low but intense. ` +
      `The tension is thick enough to cut. ${twist}`;
    choices = buildChoices(conflictActions, 'dynamic_event', false);
  } else if (scenarioRoll > 0.33) {
    text =
      `A hushed invitation arrives at your door: ${name} asks you to meet at ${placeLabel.toLowerCase()}. ` +
      `It could be the chance you have been waiting for, or a trap that ends your ambitions. ${outcome}`;
    choices = buildChoices(highStakesActions, 'dynamic_event', false);
  } else if (scenarioRoll > 0.2) {
    text = `The ton gathers at ${placeLabel.toLowerCase()} for an afternoon diversion. ${name} shares a ${mood} remark, and a ${role} of ${pick(places)} is mentioned in the same breath. ${outcome} ${twist}`;
    choices = buildChoices(romanticActions, 'dynamic_event', false);
  }

  if (scenarioRoll < 0.2) {
    text = `A private note sealed in wax directs you to ${placeLabel.toLowerCase()}. ${name} waits, ${mood} and resolute, claiming ${task} brought them here. ${outcome} ${twist}`;
    choices = buildChoices(highStakesActions, 'dynamic_event', false);
  }

  if (name?.startsWith('King George')) {
    // Fold in the King’s illness for historical tone.
    text = `${text} ${pick(kingGeorgeMoments)}`;
  }

  return {
    text,
    choices: choices.map((choice) => ({ ...choice, character: name })),
    character: name,
    characters: [name],
    settingId: setting.id,
  };
};



