import { peopleByContext, thingsByContext } from '../types/dynamics';
import { defaultSettingId, inferSettingId } from '../types/settings';
import { endingIds } from '../types/endings';

const pick = (list) => list[Math.floor(Math.random() * list.length)];

const inferContextFromSetting = (settingId) => {
  if (!settingId) {
    return 'generic';
  }
  if (settingId === 'home') {
    return 'home';
  }
  if (settingId === 'market') {
    return 'market';
  }
  if (settingId === 'estate') {
    return 'estate';
  }
  if (settingId === 'ballroom') {
    return 'ballroom';
  }
  if (settingId === 'garden') {
    return 'garden';
  }
  if (settingId === 'library') {
    return 'library';
  }
  if (settingId === 'royal') {
    return 'royal';
  }
  if (settingId === 'kitchen') {
    return 'kitchen';
  }
  if (settingId === 'park') {
    return 'park';
  }
  if (settingId === 'carriage') {
    return 'carriage';
  }
  return 'town';
};

const buildDynamicSentence = (settingId) => {
  const context = inferContextFromSetting(settingId);
  const personPool = peopleByContext[context] || peopleByContext.generic;
  const thingPool = thingsByContext[context] || thingsByContext.generic;
  const person = pick(personPool);
  const thing = pick(thingPool);
  const templates = {
    home: [
      `Nearby, ${person} fusses over ${thing}.`,
      `In the corner, ${person} tends to ${thing}.`,
      `By the window, ${person} checks ${thing}.`,
      `From the doorway, ${person} watches you with ${thing} in hand.`,
      `A few steps away, ${person} folds ${thing}.`,
    ],
    market: [
      `At a nearby stall, ${person} haggles over ${thing}.`,
      `A few steps away, ${person} examines ${thing}.`,
      `Beside the cart, ${person} barters for ${thing}.`,
      `Near the fountain, ${person} weighs ${thing}.`,
      `Across the square, ${person} guards ${thing} carefully.`,
    ],
    estate: [
      `Along the corridor, ${person} passes with ${thing}.`,
      `In the distance, ${person} steadies ${thing} in their hands.`,
      `By the archway, ${person} pauses with ${thing}.`,
      `Across the hall, ${person} adjusts ${thing}.`,
      `Near the stairs, ${person} keeps hold of ${thing}.`,
    ],
    ballroom: [
      `Across the floor, ${person} admires ${thing}.`,
      `Under the chandeliers, ${person} toys with ${thing}.`,
      `Near the musicians, ${person} smooths ${thing}.`,
      `By the pillars, ${person} cradles ${thing}.`,
      `At the edge of the crowd, ${person} lifts ${thing}.`,
    ],
    garden: [
      `By the hedges, ${person} lingers with ${thing}.`,
      `Near the terrace, ${person} pauses over ${thing}.`,
      `Along the path, ${person} carries ${thing}.`,
      `Beside the fountain, ${person} studies ${thing}.`,
      `Under the lanterns, ${person} adjusts ${thing}.`,
    ],
    library: [
      `Between the shelves, ${person} studies ${thing}.`,
      `At the reading table, ${person} sets down ${thing}.`,
      `By the ladder, ${person} balances ${thing}.`,
      `Near the alcove, ${person} hides ${thing}.`,
      `Beside the desk, ${person} arranges ${thing}.`,
    ],
    royal: [
      `At the edge of the court, ${person} carries ${thing}.`,
      `In the royal gallery, ${person} adjusts ${thing}.`,
      `Near the dais, ${person} steadies ${thing}.`,
      `Across the marble floor, ${person} guards ${thing}.`,
      `By the drapery, ${person} tucks away ${thing}.`,
    ],
    kitchen: [
      `Near the firelight, ${person} balances ${thing}.`,
      `In the bustle, ${person} sets aside ${thing}.`,
      `By the counter, ${person} wipes down ${thing}.`,
      `Near the pantry, ${person} hurries with ${thing}.`,
      `At the scullery door, ${person} steadies ${thing}.`,
    ],
    park: [
      `Along the path, ${person} passes with ${thing}.`,
      `Near the lawns, ${person} pauses by ${thing}.`,
      `By the benches, ${person} rests with ${thing}.`,
      `Under the trees, ${person} checks ${thing}.`,
      `Beside the pond, ${person} lifts ${thing}.`,
    ],
    carriage: [
      `Beside the coach, ${person} checks ${thing}.`,
      `Under the lantern light, ${person} secures ${thing}.`,
      `Near the wheels, ${person} steadies ${thing}.`,
      `By the hitch, ${person} tucks away ${thing}.`,
      `At the gate, ${person} adjusts ${thing}.`,
    ],
    town: [
      `Down the lane, ${person} handles ${thing}.`,
      `At the corner, ${person} tucks away ${thing}.`,
      `Near the crossing, ${person} balances ${thing}.`,
      `By the shopfront, ${person} inspects ${thing}.`,
      `Along the street, ${person} carries ${thing}.`,
    ],
    generic: [
      `Nearby, ${person} tends to ${thing}.`,
      `In the background, ${person} passes with ${thing}.`,
      `A few steps away, ${person} adjusts ${thing}.`,
      `To your side, ${person} steadies ${thing}.`,
      `Across the room, ${person} carries ${thing}.`,
    ],
  };
  const options = templates[context] || templates.generic;
  return pick(options);
};

const withDynamicFlavor = (settingId, text) => {
  const sentence = buildDynamicSentence(settingId);
  return `${text} ${sentence}`;
};

const wrapSceneText = (sceneId, text, settingIdOverride) => {
  return (params) => {
    const base = typeof text === 'function' ? text(params) : text;
    if (endingIds.includes(sceneId)) {
      return base;
    }
    const settingId = settingIdOverride || inferSettingId(sceneId) || defaultSettingId;
    return withDynamicFlavor(settingId, base);
  };
};

const baseScenes = {
  start: {
    character: 'Mother', dynamicTokens: ['ESTATE_NAME'], text: ({ playerName, playerAge, playerBackground }) =>
      `The morning light filters through the thin curtains of your modest bedroom. You are ${playerName}, a ${playerAge}-year-old daughter of a working woman. ${playerBackground} Today whispers of a grand reception at {{ESTATE_NAME}} reach your ears, and your heart yearns for something more than this life of endless labour.`,
    choices: [{ text: 'Help mother with the morning chores', next: 'chores', relationship: 1 },
    { text: 'Inquire about the reception and how one might attend', next: 'ball_inquiry', relationship: 0 },
    { text: 'Sneak out to the market to gather gossip', next: 'market', relationship: -1 },
    { text: 'Step into a chance encounter', next: 'dynamic_event', relationship: 0 },],
  },
  chores: {
    character: 'Mother', dynamicTokens: ['TOWN_MATRON'], text:
      "You descend the narrow stairs to find your mother already at work, her fingers red from the cold water. 'There's my good girl' she says warmly. '{{TOWN_MATRON}} needs these linens by noon, and the bread won't bake itself.' As you work alongside her, she mentions that {{MAJOR_SABINE}}'s lady's maid was inquiring about temporary help for a court reception tonight.",
    choices: [{ text: "Express interest in the lady's maid position", next: 'maid_position', relationship: 0 },
    { text: 'Ask mother about her youth and any regrets', next: 'mother_story', relationship: 2 },
    { text: 'Finish chores quickly and plan to sneak to the reception', next: 'sneak_plan', relationship: -1 },
    { text: 'Check on your sickly cousin upstairs', next: 'family_illness', relationship: 1 },
    { text: 'Take a quieter moment at home', next: 'location_event', relationship: 0 },],
  },
  mother_story: {
    character: 'Mother', text: ({ playerName }) =>
      `Your mother exhales slowly. 'I loved once, the way fire loves oxygen. But he was taken by war and I was left with a needle and a child.' She cups your cheek. 'Do not let life shrink you, ${playerName}. Make your choices boldly, but make them with your eyes open.'`,
    choices: [{ text: 'Promise you will be bold', next: 'ball_inquiry', relationship: 1 },
    { text: 'Ask how she survived', next: 'sewing_shift', relationship: 0 },
    { text: 'Choose a quiet, steady life', next: 'quiet_respect_end', relationship: 0 },],
  },
  family_illness: {
    character: 'Mother', text:
      "Your cousin lies pale beneath a thin blanket, breath shallow. Your mother watches you both with tired eyes. 'We cannot afford a doctor,' she admits. 'Not unless we earn more.'",
    choices: [{ text: 'Offer to take extra work immediately', next: 'sewing_shift', relationship: 2 },
    { text: 'Seek help from a high-society household', next: 'workhouse_offer', relationship: 0 },
    { text: 'Slip out to gather medicine from the market', next: 'market', relationship: 0 },],
  },
  sewing_shift: {
    character: 'Mother', text:
      "Needlework stretches late into the evening. Your mother sits beside you in the tiny parlor, the lamplight catching the strain in her hands as your fingers ache. A neighbour mentions a call for seamstresses at a noble household before the reception.",
    choices: [{ text: 'Accept the commission for extra coin', next: 'dinner_service', relationship: 1 },
    { text: 'Keep the work local to protect your family', next: 'chores', relationship: 1 },
    { text: 'Take the chance to see the reception preparations', next: 'maid_position', relationship: 0 },],
  },
  dinner_service: {
    character: '{{MAJOR_SABINE}}', text:
      "You are ushered into the servants’ hall to mend gowns before the dinner service. The staff whispers about {{MAJOR_SABINE_TITLE_FAMILY}}’s sharp eye and exacting standards. A footman hints she notices talent.",
    choices: [{ text: "Volunteer for {{MAJOR_SABINE_TITLE_FAMILY}}'s household", next: 'duchess_rivington', relationship: 2 },
    { text: 'Keep your head down and finish the work', next: 'maid_position', relationship: 0 },
    { text: 'Ask for a recommendation to the {{MAJOR_TOBIAS_FAMILY}}s', next: 'maid_position', relationship: 1 },],
  },
  sneak_plan: {
    dynamicTokens: ['CHILDHOOD_FRIEND'], characters: ['{{CHILDHOOD_FRIEND}}'], text:
      "You finish the linens with deft hands and a quick tongue. {{CHILDHOOD_FRIEND}} hovers nearby, anxious to help, as you map out a daring plan. The reception will be in full swing by nightfall, and the household will be distracted. If you can find a gown, you might just slip in with the other guests...",
    choices: [{ text: 'Ask {{CHILDHOOD_FRIEND}} the baker for help', next: 'thomas_chat', relationship: 1, character: '{{CHILDHOOD_FRIEND}}' },
    { text: 'Gather rumours at the market', next: 'market', relationship: 0 },
    { text: 'Seek the lady\'s maid position after all', next: 'maid_position', relationship: 0 },],
  },
  ball_inquiry: {
    character: 'Mother', text:
      "Your mother looks up from her needlework, her expression weary. 'A court reception? My darling girl, we are not invited to such affairs. The ton does not mix with the likes of us.' But there is a softness in her eyes. 'Though... {{MAJOR_SABINE_TITLE_FAMILY}}'s household is seeking temporary help for the evening.'",
    choices: [{ text: 'Accept the servant position, at least you will be there', next: 'maid_position', relationship: 0 },
    { text: 'Ask mother to write to the estranged cousin', next: 'cousin_letter', relationship: 0 },
    { text: 'Declare you shall find your own way in', next: 'determined', relationship: -1 },],
  },
  cousin_letter: {
    character: 'Mother', text:
      "Your mother hesitates, then nods. She writes to the cousin with a hand that trembles, sealing it with wax. Now you wait. Each day stretches with possibility and dread.",
    choices: [{ text: 'Wait for the reply', next: 'market', relationship: 0 },
    { text: 'Take fate into your own hands', next: 'determined', relationship: -1 },
    { text: 'Use the delay to earn extra wages', next: 'sewing_shift', relationship: 1 },],
  },
  determined: {
    character: 'Mother', dynamicTokens: ['ESTATE_NAME'], text:
      "You smooth your skirts and set your jaw. Your mother watches you with a weary pride as you decide that if society will not open its doors, you will knock, then rattle the latch yourself. There are always rumours to chase and allies to woo.",
    choices: [{ text: 'Visit the market in search of whispers', next: 'market', relationship: 0 },
    { text: 'Slip toward {{ESTATE_NAME}} early', next: 'maid_position', relationship: 0 },
    { text: 'Seek a daring encounter', next: 'dynamic_event', relationship: 0 },],
  },
  market: {
    dynamicTokens: ['CHILDHOOD_FRIEND'], characters: ['{{CHILDHOOD_FRIEND}}'], text:
      "The market square bustles with activity. You spot several ladies' maids gossiping by the flower stall, and a handsome gentleman examining pocket watches at the jeweler's. The baker's son, {{CHILDHOOD_FRIEND}}, waves at you. He has harbored affection for you since childhood.",
    choices: [{ text: 'Approach the gossiping maids for information', next: 'maid_gossip', relationship: 0 },
    { text: 'Return the glove to the fine lady', next: 'glove_return', relationship: 0 },
    { text: 'Stop to speak with {{CHILDHOOD_FRIEND}}', next: 'thomas_chat', relationship: 1, character: '{{CHILDHOOD_FRIEND}}' },
    { text: 'Step into the nearby tea room', next: 'tea_room', relationship: 0 },
    { text: 'Linger among the stalls', next: 'location_event', relationship: 0 },
    { text: 'Let fate surprise you', next: 'dynamic_event', relationship: 0 },],
  },
  tea_room: {
    character: '{{MAJOR_SABINE}}', text:
      "The tea room is all gilt and whispers. {{MAJOR_SABINE_TITLE_FAMILY}} sits near the window, surveying the crowd. She motions you closer, curiosity shining in her eyes.",
    choices: [{ text: 'Speak with candor about your hopes', next: 'patronage_offer', relationship: 1 },
    { text: 'Ask about the Queen’s tastes', next: 'royal_notice', relationship: 0 },
    { text: 'Excuse yourself before anyone notices', next: 'market', relationship: -1 },
    ],
  },
  patronage_offer: {
    character: '{{MAJOR_SABINE}}', text:
      "{{MAJOR_SABINE_TITLE_FAMILY}} taps her spoon against the porcelain. 'Ambition suits you. Serve with discretion, and I will introduce you to a duchess who values cleverness.'",
    choices: [{ text: 'Accept and prepare for society’s lessons', next: 'society_lessons', relationship: 2 },
    { text: 'Ask for time to consider', next: 'maid_position', relationship: 0 },
    { text: 'Decline to protect your family', next: 'family_illness', relationship: 1 },],
  },
  maid_gossip: {
    text:
      "The maids lean in, eager to trade secrets. 'They say {{MAJOR_TOBIAS}} has been summoned to account for the estate,' one whispers. 'And the Queen herself has begun pressing for loyal matches at court,' says another.",
    choices: [{ text: 'Use this gossip to approach the reception as staff', next: 'maid_position', relationship: 0 },
    { text: 'Seek more information at the house', next: 'maid_position', relationship: 0 },
    { text: 'Ask who has the Queen’s favour', next: 'royal_notice', relationship: 0 },],
  },
  glove_return: {
    character: '{{MAJOR_BEATRIX}}', text:
      "The lady turns, startled, then smiles. 'How kind. I am {{MAJOR_BEATRIX}}. If you ever require work, our household values competence.' She presses a card into your hand before drifting away.",
    choices: [{ text: 'Pocket the card and head to the reception', next: 'maid_position', relationship: 0 },
    { text: 'Consider a fresh path', next: 'dynamic_event', relationship: 0 },
    { text: 'Ask if she needs a personal maid', next: 'workhouse_offer', relationship: 1 },],
  },
  thomas_chat: {
    dynamicTokens: ['CHILDHOOD_FRIEND'], text:
      "{{CHILDHOOD_FRIEND}} offers you a warm loaf, his eyes soft. 'There's talk of a reception tonight. If you wanted to go, I could lend you my sister's cloak.' It's not a gown, but it's a start.",
    choices: [{ text: 'Thank him and accept the cloak', next: 'maid_position', relationship: 2, character: '{{CHILDHOOD_FRIEND}}' },
    { text: 'Tell him you need more than kindness', next: 'dynamic_event', relationship: -1, character: '{{CHILDHOOD_FRIEND}}' },
    { text: 'Invite him to accompany you to the house gates', next: 'garden_walk', relationship: 1, character: '{{CHILDHOOD_FRIEND}}' },],
  },
  garden_walk: {
    dynamicTokens: ['CHILDHOOD_FRIEND'], text:
      "{{CHILDHOOD_FRIEND}} walks with you to the house gates, speaking of a future that feels safe and warm. His steady presence calms your nerves as the music drifts over the hedges.",
    choices: [{ text: 'Promise him a dance someday', next: 'maid_position', relationship: 2, character: '{{CHILDHOOD_FRIEND}}' },
    { text: 'Keep things friendly and proper', next: 'maid_position', relationship: 0, character: '{{CHILDHOOD_FRIEND}}' },
    { text: 'Tell him you cannot offer more', next: 'maid_position', relationship: -2, character: '{{CHILDHOOD_FRIEND}}' },
    { text: 'Take a longer walk in the garden', next: 'location_event', relationship: 0 },],
  },
  workhouse_offer: {
    character: '{{MAJOR_BEATRIX}}', text:
      "{{MAJOR_BEATRIX_TITLE_FIRST}} considers you carefully. 'You have ambition, I see. Work for my household, and I will consider recommendations, but there is no charity in this world.'",
    choices: [{ text: 'Accept and prove your worth', next: 'maid_position', relationship: 2 },
    { text: 'Decline and keep your independence', next: 'market', relationship: -1 },
    { text: 'Ask for medicine for your cousin', next: 'family_illness', relationship: 1 },],
  },
  royal_notice: {
    text:
      "A hush falls at the mention of the Queen. 'Her eye is sharp,' the maid says, 'and she expects loyalty first. But her favour is not free.'",
    choices: [{ text: 'Resolve to earn the Queen’s attention', next: 'debut', relationship: 0 },
    { text: 'Avoid the Queen’s notice entirely', next: 'maid_position', relationship: 0 },
    { text: 'Seek a different patron', next: 'duchess_rivington', relationship: 0 },
    { text: 'Follow the court whispers', next: 'location_event', relationship: 0 },],
  },
  maid_position: {
    character: '{{MAJOR_TOBIAS}}', characters: ['{{MAJOR_TOBIAS}}', '{{HOUSEKEEPER}}'], dynamicTokens: ['ESTATE_NAME', 'HOUSEKEEPER'], text:
      "By afternoon, you find yourself at the servants' entrance of {{ESTATE_NAME}}, dressed in borrowed maid's attire. The housekeeper, {{HOUSEKEEPER}}, eyes you critically. 'You'll be serving champagne in the ballroom. Keep your eyes down, speak only when spoken to.' Across the corridor, {{MAJOR_TOBIAS}} strides past in conversation with a steward, his presence hard to ignore.",
    choices: [{ text: 'Serve champagne dutifully and professionally', next: 'professional_maid', relationship: 0 },
    { text: "Catch {{MAJOR_TOBIAS}}'s attention", next: 'catch_attention', relationship: 1 },
    { text: 'Observe and learn the manners of high society', next: 'observe_society', relationship: 0 },
    { text: 'Slip into the music room to listen', next: 'music_room', relationship: 0 },
    { text: 'Step into the estate corridor', next: 'estate_corridor_glance', relationship: 0 },],
  },
  music_room: {
    character: '{{MAJOR_TOBIAS}}', text:
      "The music room is empty, save for a lone gentleman at the pianoforte. He turns as you enter, eyes catching on your borrowed apron. 'You should not be here,' he murmurs, but does not leave.",
    choices: [{ text: 'Introduce yourself with poise', next: 'catch_attention', relationship: 2 },
    { text: 'Retreat before anyone sees you', next: 'professional_maid', relationship: 0 },
    { text: 'Ask him for a dance lesson', next: 'library_meeting', relationship: 2 },],
  },
  professional_maid: {
    character: '{{MAJOR_SABINE}}', characters: ['{{MAJOR_SABINE}}', '{{HOUSEKEEPER}}'], dynamicTokens: ['HOUSEKEEPER'], text:
      "You move like shadow and silk, never spilling a drop. Guests glance your way, some dismissively, some with curiosity. {{MAJOR_SABINE_TITLE_FAMILY}} sweeps through the room with a cool, appraising gaze, and {{HOUSEKEEPER}} waits by the service door, ready to bark an order. You overhear a rumour that the duchess is seeking a clever assistant for the season.",
    choices: [{ text: 'Seek {{MAJOR_SABINE_TITLE_FAMILY}} out after the reception', next: 'duchess_rivington', relationship: 2 },
    { text: 'Take the rumour and stay cautious', next: 'observe_society', relationship: 0 },
    { text: 'Report back to {{HOUSEKEEPER}} and keep the peace', next: 'kitchen_return', relationship: 1 },],
  },
  observe_society: {
    character: '{{MAJOR_TOBIAS}}', text:
      "You watch the waltz, the way shoulders align and eyes linger. {{MAJOR_TOBIAS}} is among the dancers, his attention flicking toward you when he thinks no one notices. The tone is all subtlety a battlefield of smiles and secrets. You tuck away every detail.",
    choices: [{ text: "Use what you've learned to speak with a lord", next: 'catch_attention', relationship: 1 },
    { text: 'Step into a new encounter', next: 'dynamic_event', relationship: 0 },
    { text: 'Follow a whispered invitation to the conservatory', next: 'conservatory_whisper', relationship: 0 },
    { text: 'Return to the kitchens with your secrets', next: 'kitchen_return', relationship: 0 },
    { text: 'Drift deeper into the ballroom', next: 'location_event', relationship: 0 },],
  },
  conservatory_whisper: {
    character: '{{MAJOR_IMOGEN}}', text:
      "In the conservatory, orchids bloom like secrets. {{MAJOR_IMOGEN}} corners you, her smile thin. 'You are more visible than you realize,' she purrs.",
    choices: [{ text: 'Hold your ground with measured poise', next: 'rival_confrontation', relationship: 0, character: '{{MAJOR_IMOGEN}}' },
    { text: 'Deflect and retreat to safer company', next: 'kitchen_return', relationship: 0 },
    { text: 'Invite a new encounter to break the tension', next: 'dynamic_event', relationship: 0 },],
  },
  kitchen_return: {
    character: '{{MAJOR_TOBIAS}}', text:
      "The kitchens buzz with gossip. Through the doorway, you catch sight of {{MAJOR_TOBIAS}} crossing the ballroom floor, his gaze searching the crowd. 'Did he smile at you?' one maid whispers. The night hums with possibility, but so does the risk of scandal.",
    choices: [{ text: 'Slip back to the ballroom', next: 'glance_back', relationship: 0, character: '{{MAJOR_TOBIAS}}' },
    { text: 'End the night quietly', next: 'refuse_meeting', relationship: 0 },
    { text: 'Linger in the kitchens a while longer', next: 'location_event', relationship: 0 },
    { text: 'Step outside to the carriage yard', next: 'carriage_wait', relationship: 0 },
    { text: 'Check in on your mother when you return home', next: 'family_illness', relationship: 0 },],
  },
  duchess_rivington: {
    character: '{{MAJOR_SABINE}}', text:
      "{{MAJOR_SABINE_TITLE_FAMILY}}'s gaze is sharp, her smile sharper. 'A girl with a spine and a mind is rare,' she says. 'Serve me well and I will open doors that were never meant for you.'",
    choices: [{ text: 'Accept her patronage', next: 'society_lessons', relationship: 3 },
    { text: 'Thank her, but seek your own path', next: 'dynamic_event', relationship: -1 },
    { text: 'Ask her for advice on the Queen', next: 'royal_notice', relationship: 1 },
    { text: 'Accept a widow patronage', next: 'widow_patron_end', relationship: 2 },
    { text: 'Ask her to stand as your ally', next: 'found_ally_end', relationship: 2 },],
  },
  catch_attention: {
    character: '{{MAJOR_TOBIAS}}', characters: ['{{MAJOR_TOBIAS}}', 'Lord Alistair {{MAJOR_SABINE_FAMILY}}'], text:
      "As you pass near {{MAJOR_TOBIAS}} with your tray, you stumble ever so slightly. His hand shoots out to steady you. 'Careful there,' he says, and his eyes meet yours. Lord Alistair {{MAJOR_SABINE_FAMILY}} glances over, amused.",
    choices: [{ text: 'Curtsy and apologise demurely', next: 'demure_response', relationship: 1 },
    { text: 'Meet his gaze boldly and thank him', next: 'bold_response', relationship: 2 },
    { text: 'Make a witty remark about careful hands', next: 'witty_response', relationship: 3 },],
  },
  demure_response: {
    character: '{{MAJOR_TOBIAS}}', text:
      "You lower your eyes with a practiced humility. {{MAJOR_TOBIAS_TITLE_FIRST}} smiles, intrigued by the flicker of mischief he senses beneath your calm. 'You carry yourself like a lady, despite that apron.'",
    choices: [{ text: 'Ask him why he notices at all', next: 'library_meeting', relationship: 2 },
    { text: 'Return to your duties', next: 'kitchen_return', relationship: 0 },],
  },
  bold_response: {
    character: '{{MAJOR_TOBIAS}}', characters: ['{{MAJOR_TOBIAS}}', 'Lord Alistair {{MAJOR_SABINE_FAMILY}}'], text:
      "You hold his gaze. 'Thank you, my lord. I would have survived, but your rescue was appreciated.' Lord Alistair {{MAJOR_SABINE_FAMILY}} chuckles. 'She's fearless, {{MAJOR_TOBIAS_FAMILY}}.'",
    choices: [{ text: 'Stay close to his circle', next: 'glance_back', relationship: 2 },
    { text: 'Return to the kitchens to avoid notice', next: 'kitchen_return', relationship: 0 },],
  },
  witty_response: {
    character: '{{MAJOR_TOBIAS}}', characters: ['{{MAJOR_TOBIAS}}', '{{HOUSEKEEPER}}'], dynamicTokens: ['HOUSEKEEPER'], text:
      "'I find, my lord, that the most careful hands are those that have worked for their steadiness,' you say, surprising yourself with your boldness. {{MAJOR_TOBIAS_TITLE_FIRST}}'s eyebrows rise, and a slow smile spreads across his face as {{HOUSEKEEPER}} hovers nearby, watching like a hawk.",
    choices: [{ text: 'Return to the kitchens obediently', next: 'kitchen_return', relationship: 0 },
    { text: 'Glance back at {{MAJOR_TOBIAS_TITLE_FIRST}} before leaving', next: 'glance_back', relationship: 1 },
    { text: 'Ask {{HOUSEKEEPER}} for a moment longer', next: 'request_moment', relationship: 0 },],
  },
  request_moment: {
    character: '{{HOUSEKEEPER}}', dynamicTokens: ['HOUSEKEEPER'], text:
      "{{HOUSEKEEPER}}'s eyes are flint. 'Not another word. You are staff, not spectacle.' Still, you catch the faintest hint of approval.",
    choices: [{ text: 'Accept the rebuke', next: 'kitchen_return', relationship: 0 },
    { text: 'Let your boldness carry you', next: 'glance_back', relationship: 1 },],
  },
  glance_back: {
    character: '{{MAJOR_TOBIAS}}', characters: ['{{MAJOR_TOBIAS}}', 'Lord Alistair {{MAJOR_SABINE_FAMILY}}'], text:
      "Your eyes find his once more across the glittering ballroom. He is watching you, ignoring Lord Alistair's conversation entirely. An hour later, a footman finds you. 'You are summoned to the library. Alone.'",
    choices: [{ text: 'Go to the library immediately', next: 'library_meeting', relationship: 1 },
    { text: 'Refuse, it would be scandalous', next: 'refuse_meeting', relationship: -2 },
    { text: 'Go, but bring another maid as chaperone', next: 'chaperoned_meeting', relationship: -1 },],
  },
  chaperoned_meeting: {
    character: '{{MAJOR_TOBIAS}}', text:
      "Your chaperone's presence chills the moment. {{MAJOR_TOBIAS_TITLE_FIRST}} keeps his distance, yet the promise in his eyes remains. 'Another time, then,' he murmurs.",
    choices: [{ text: 'Arrange a safer meeting', next: 'agree_meeting', relationship: 1 },
    { text: 'Let the moment pass', next: 'refuse_meeting', relationship: -1 },],
  },
  library_meeting: {
    character: '{{MAJOR_TOBIAS}}', text: ({ playerName }) =>
      `The library is dimly lit, all leather and mahogany and the scent of old books. {{MAJOR_TOBIAS_TITLE_FIRST}} stands by the window. 'You are no mere servant, are you, ${playerName}? The way you speak, the intelligence in your eyes... Tell me truthfully, who are you?'`,
    choices: [{ text: 'Tell him the complete truth about your circumstances', next: 'honest_confession', relationship: 2 },
    { text: "Claim to be a lady's companion fallen on hard times", next: 'half_truth', relationship: 0 },
    { text: 'Deflect with flirtation rather than answers', next: 'flirt_deflect', relationship: 1 },
    { text: 'Wander the library shelves', next: 'location_event', relationship: 0 },],
  },
  half_truth: {
    character: '{{MAJOR_TOBIAS}}', text:
      "You offer a careful half-truth, and he accepts it for now. But there is a wary cast to his gaze, as if he will not be fooled forever.",
    choices: [{ text: 'Confess the full truth', next: 'honest_confession', relationship: 2 },
    { text: 'Keep your story steady', next: 'physical_tension', relationship: 0 },],
  },
  flirt_deflect: {
    character: '{{MAJOR_TOBIAS}}', text:
      "You step close enough to feel his warmth. 'Does it matter who I am,' you whisper, 'if I make you forget the rest of the room?' His breath catches.",
    choices: [{ text: 'Close the distance', next: 'physical_tension', relationship: 2 },
    { text: 'Ease away and keep control', next: 'honest_confession', relationship: 0 },],
  },
  honest_confession: {
    character: '{{MAJOR_TOBIAS}}', text:
      "'I am the daughter of a working woman, my lord,' you say, lifting your chin. 'I work with my hands, I know no grand society, and I have no fortune or connections to recommend me.' He laughs, warm and genuine. 'You have more courage than half the titled lords in that ballroom.'",
    choices: [{ text: 'Ask him why a lord would care about a working girl', next: 'why_care', relationship: 1 },
    { text: 'Point out the impossibility of anything between you', next: 'impossible_love', relationship: 0 },
    { text: 'Move closer to him, drawn by desire', next: 'physical_tension', relationship: 2 },],
  },
  why_care: {
    character: '{{MAJOR_TOBIAS}}', text:
      "'Because I am tired of empty ceremony,' he says. 'Because you speak the truth, and I have missed it.'",
    choices: [{ text: 'Let the storm break', next: 'physical_tension', relationship: 2 },
    { text: 'Hold your ground', next: 'impossible_love', relationship: 0 },],
  },
  impossible_love: {
    character: '{{MAJOR_TOBIAS}}', text:
      'You both know the odds. Titles and birth cannot be wished away. Yet the attraction between you grows sharper by the second.',
    choices: [{ text: 'Risk it anyway', next: 'physical_tension', relationship: 2 },
    { text: 'Walk away before it consumes you', next: 'refuse_meeting', relationship: -2 },
    { text: 'Keep it secret and stay', next: 'kept_secret_end', relationship: 1 },],
  },
  physical_tension: {
    character: '{{MAJOR_TOBIAS}}', text:
      "The space between you crackles with electricity. 'This is dangerous,' he murmurs. 'If we were discovered...' His hand rises to your cheek, thumb brushing your lips.",
    choices: [{ text: 'Pull away, overwhelmed by the intensity', next: 'pull_away', relationship: -1 },
    { text: 'Kiss him back with equal passion', next: 'passionate_kiss', relationship: 3 },
    { text: 'Suggest meeting again, properly', next: 'suggest_courtship', relationship: 2 },],
  },
  pull_away: {
    character: '{{MAJOR_TOBIAS}}', text:
      "You breathe, step back, and steady yourself. He nods once, respect and regret woven together. 'Perhaps you are wiser than I.'",
    choices: [{ text: 'Meet him tomorrow to talk', next: 'agree_meeting', relationship: 1 },
    { text: 'End this entirely', next: 'refuse_meeting', relationship: -3 },],
  },
  suggest_courtship: {
    character: '{{MAJOR_TOBIAS}}', text: ({ playerName }) =>
      `You lift your chin. 'If you wish for me, then court me.' He smiles, slow and dangerous. 'Then I shall, ${playerName}.'`,
    choices: [{ text: 'Accept his invitation to meet', next: 'agree_meeting', relationship: 2 },
    { text: 'Insist on a public declaration', next: 'open_courtship', relationship: 3 },],
  },
  open_courtship: {
    character: '{{MAJOR_TOBIAS}}', text:
      "He exhales. 'You ask me to set fire to the ton.' The spark in his eyes says he might just do it.",
    choices: [{ text: 'Give him time to decide', next: 'agree_meeting', relationship: 0 },
    { text: 'Walk away to protect yourself', next: 'refuse_meeting', relationship: -3 },
    { text: 'Let the engagement collapse', next: 'broken_engagement_end', relationship: -1 },],
  },
  passionate_kiss: {
    character: '{{MAJOR_TOBIAS}}', dynamicTokens: ['PARK_NAME'], text:
      "You thread your fingers through his hair, kissing him with all the yearning you have kept locked inside. He groans, hands spanning your waist. 'Meet me tomorrow at the folly in {{PARK_NAME}}, two o'clock.'",
    choices: [{ text: 'Agree to meet him tomorrow', next: 'agree_meeting', relationship: 1 },
    { text: 'Suggest he court you openly instead', next: 'open_courtship', relationship: 2 },
    { text: 'Say this was a mistake, too dangerous', next: 'call_it_mistake', relationship: -3 },
    { text: 'Propose a secret union', next: 'secret_union_end', relationship: 2 },],
  },
  call_it_mistake: {
    character: '{{MAJOR_TOBIAS}}', text:
      "His face shutters. 'If that is what you want.' The door between you closes, and you return to the kitchens with a heart that stings.",
    choices: [{ text: 'Return to your life', next: 'refuse_meeting', relationship: -2 }],
  },
  agree_meeting: {
    character: '{{MAJOR_TOBIAS}}', dynamicTokens: ['PARK_NAME'], text:
      "{{PARK_NAME}}'s folly is secluded, overgrown with ivy. {{MAJOR_TOBIAS_TITLE_FIRST}} is already there, pacing. 'You came.' Over the following weeks, you meet in secret. The relationship deepens, but secrets have a way of being discovered...",
    choices: [{ text: 'Continue the secret affair cautiously', next: 'secret_affair', relationship: 2 },
    { text: 'Demand he choose between you and society', next: 'ultimatum', relationship: 0 },
    { text: 'Suggest you learn to pass as a lady', next: 'society_lessons', relationship: 1 },
    { text: 'Wander the park before meeting', next: 'location_event', relationship: 0 },],
  },
  secret_affair: {
    character: '{{MAJOR_TOBIAS}}', text:
      'You steal moments in gardens and carriage rides, living in the space between whispers. The thrill is intoxicating, but the danger grows.',
    choices: [{ text: 'Push for legitimacy', next: 'society_lessons', relationship: 1 },
    { text: 'End it before it ruins you', next: 'refuse_meeting', relationship: -4 },
    { text: 'Let fate test you', next: 'dynamic_event', relationship: 0 },
    { text: 'Keep your life hidden', next: 'forbidden_heir_end', relationship: -1 },],
  },
  ultimatum: {
    character: '{{MAJOR_TOBIAS}}', text:
      "He looks torn. 'Give me time,' he pleads. 'I need to convince my family.' You can see the struggle in him.",
    choices: [{ text: 'Allow him that time', next: 'society_lessons', relationship: 1 },
    { text: 'Leave him to his choice', next: 'refuse_meeting', relationship: -3 },],
  },
  society_lessons: {
    character: '{{MAJOR_SABINE}}', characters: ['{{MAJOR_SABINE}}', '{{MAJOR_TOBIAS}}'], text:
      'You propose lessons. A retired governess tutors you in secret. {{MAJOR_SABINE_TITLE_FAMILY}}, who adores a little chaos, agrees to sponsor you when the time comes. {{MAJOR_TOBIAS_FIRST}} steals brief visits between lessons, his encouragement keeping your nerve steady. Your confidence grows with every curtsey and conversation.',
    choices: [{ text: "Debut at the next season as a 'distant cousin'", next: 'debut', relationship: 1 },
    { text: 'Elope with {{MAJOR_TOBIAS_FIRST}} and damn society', next: 'elope', relationship: 2, character: '{{MAJOR_TOBIAS}}' },
    { text: 'Wait and continue learning, ensuring perfection', next: 'patient_approach', relationship: 1 },
    { text: 'Return home and choose your family', next: 'family_duty_end', relationship: 0 },],
  },
  patient_approach: {
    character: '{{MAJOR_SABINE}}', text:
      'You spend another season perfecting your accent and etiquette. When you return, you are polished, poised, and nearly untouchable.',
    choices: [{ text: 'Step into society with confidence', next: 'debut', relationship: 1 },
    { text: 'Seek a bold new encounter', next: 'dynamic_event', relationship: 0 },],
  },
  debut: {
    character: 'Queen Charlotte', characters: ['Queen Charlotte', '{{MAJOR_TOBIAS}}', '{{MAJOR_IMOGEN}}'], text:
      'The night of your debut, you barely recognise yourself in the mirror. The gown {{MAJOR_SABINE_TITLE_FAMILY}} provided is exquisite. {{MAJOR_TOBIAS_FIRST}} finds you immediately, his eyes devouring you. Across the room, you notice {{MAJOR_IMOGEN}} watching with narrowed eyes, and the Queen herself has turned her keen gaze upon you.',
    choices: [{ text: 'Dance every dance with {{MAJOR_TOBIAS_FIRST}}, claiming your love', next: 'claim_love', relationship: 3, character: '{{MAJOR_TOBIAS}}' },
    { text: 'Play the political game, charming other lords too', next: 'political_game', relationship: 1, character: 'Queen Charlotte' },
    { text: "Seek the Queen's approval above all else", next: 'queen_approval', relationship: 2 },
    { text: 'Accept a formal presentation to the royal court', next: 'royal_presentation', relationship: 1, character: 'Queen Charlotte' },
    { text: 'Slip into a masked salon for intrigue', next: 'salon_invitation', relationship: 0 },],
  },
  salon_invitation: {
    character: '{{MAJOR_FINCH_TITLE_FAMILY}}', characters: ['{{MAJOR_FINCH_TITLE_FAMILY}}', '{{MAJOR_SABINE}}'], text:
      'You follow the sound of violins into a masked salon. A figure in silver presses a folded note into your palm. He murmurs that {{MAJOR_FINCH_TITLE_FAMILY}} of Alderwick Press wishes to speak, and the seal of the Society Circular glints in the candlelight. {{MAJOR_SABINE_TITLE_FAMILY}} lingers near the doorway, speaking to a patron behind her fan.',
    choices: [{ text: 'Read the note and accept the challenge', next: 'finch_offer', relationship: 0, character: '{{MAJOR_FINCH_TITLE_FAMILY}}' },
    { text: 'Pass the note to {{MAJOR_SABINE_TITLE_FAMILY}} for guidance', next: 'rivington_intervention', relationship: 1, character: '{{MAJOR_SABINE}}' },
    { text: 'Leave before the whispers attach to you', next: 'kitchen_return', relationship: -1 },],
  },
  finch_offer: {
    character: '{{MAJOR_FINCH_TITLE_FAMILY}}', characters: ['{{MAJOR_FINCH_TITLE_FAMILY}}', '{{MAJOR_TOBIAS}}'], text:
      "{{MAJOR_FINCH_TITLE_FAMILY}}'s note promises protection in exchange for a favour: a secret from the ballroom. Across the room, {{MAJOR_TOBIAS}} laughs softly with a lord, unaware of the bargain in your hand. The deal could secure your rise or ruin you.",
    choices: [{ text: 'Share a harmless secret to gain leverage', next: 'power_ending', relationship: 1 },
    { text: 'Refuse and protect your reputation', next: 'heartbreak_end', relationship: -1 },
    { text: 'Trade information to protect {{MAJOR_TOBIAS_FIRST}}', next: 'reconciliation_end', relationship: 1, character: '{{MAJOR_TOBIAS}}' },
    { text: 'Yield to Finchâ€™s bargain', next: 'court_blackmail_end', relationship: -1, character: '{{MAJOR_FINCH_TITLE_FAMILY}}' },],
  },
  political_game: {
    character: 'Queen Charlotte', characters: ['Queen Charlotte', '{{MAJOR_IMOGEN}}', '{{MAJOR_TOBIAS}}'], text:
      'You glide from partner to partner, weaving influence with every smile. Queen Charlotte watches the room like a hawk, and {{MAJOR_IMOGEN}} tracks your ascent with a cool, measuring stare. {{MAJOR_TOBIAS_FIRST}} is never far, his attention a quiet counterweight to the crowd. Whispers spark, you are a new star in the firmament of the ton.',
    choices: [{ text: 'Use this power to secure your future', next: 'power_ending', relationship: 2 },
    { text: 'Return to {{MAJOR_TOBIAS_FIRST}} with honesty', next: 'claim_love', relationship: 1, character: '{{MAJOR_TOBIAS}}' },
    { text: 'Charm the Queen and offer your loyalty', next: 'queen_approval', relationship: 2 },
    { text: 'Weather a rumour storm from the Society Circular', next: 'finch_rumour', relationship: -1 },
    { text: 'Walk away with power alone', next: 'solitary_power_end', relationship: 0 },],
  },
  finch_rumour: {
    character: '{{MAJOR_FINCH_TITLE_FAMILY}}', characters: ['{{MAJOR_FINCH_TITLE_FAMILY}}', '{{MAJOR_IMOGEN}}', '{{MAJOR_SABINE}}'], text:
      "Your name appears in the Society Circular by morning, wrapped in half-truths. {{MAJOR_FINCH_TITLE_FAMILY}}'s presswork is unmistakable, and {{MAJOR_IMOGEN}} smiles a little too sweetly while {{MAJOR_SABINE_TITLE_FAMILY}} watches from the edge of the gathering. You must respond, or the ton will decide who you are.",
    choices: [{ text: 'Confront the rumour publicly', next: 'rival_confrontation', relationship: -1, character: '{{MAJOR_IMOGEN}}' },
    { text: 'Ask {{MAJOR_SABINE_TITLE_FAMILY}} to intervene', next: 'rivington_intervention', relationship: 1, character: '{{MAJOR_SABINE}}' },
    { text: 'Disappear from the ton until the gossip fades', next: 'banished_end', relationship: -2 },
    { text: 'Leave England before it worsens', next: 'exile_abroad_end', relationship: -2 },
    { text: 'Let the letters vanish', next: 'lost_letters_end', relationship: -1 },],
  },
  rival_confrontation: {
    character: '{{MAJOR_IMOGEN}}', characters: ['{{MAJOR_IMOGEN}}', '{{MAJOR_SABINE}}'], text:
      "You face {{MAJOR_IMOGEN_FIRST}} on the terrace, fury barely contained. {{MAJOR_SABINE_TITLE_FAMILY}} stands within earshot, her expression unreadable. {{MAJOR_IMOGEN_FIRST}} does not deny the rumour. 'A girl like you should know her place,' she says.",
    choices: [{ text: 'Trade barbs and stand your ground', next: 'scandal_end', relationship: -2 },
    { text: 'Swallow your pride and retreat', next: 'rivington_intervention', relationship: 0, character: '{{MAJOR_SABINE}}' },
    { text: 'Offer a truce', next: 'rivals_truce_end', relationship: 0, character: '{{MAJOR_IMOGEN}}' },],
  },
  rivington_intervention: {
    character: '{{MAJOR_SABINE}}', characters: ['{{MAJOR_SABINE}}'], text:
      "{{MAJOR_SABINE_TITLE_FAMILY}} lifts a brow. 'Scandals are weather, dear. Stand in the storm or let it wash you away.' She offers to speak on your behalf, if you can endure the price.",
    choices: [{ text: 'Accept her protection', next: 'queen_approval', relationship: 2, character: '{{MAJOR_SABINE}}' },
    { text: 'Refuse and protect your family', next: 'heartbreak_end', relationship: -2 },],
  },
  queen_approval: {
    character: 'Queen Charlotte', characters: ['Queen Charlotte', '{{MAJOR_TOBIAS}}', 'King George III'], text:
      "The Queen's gaze is a blade. You answer with grace. She inclines her head. 'You will do.' Across the room, {{MAJOR_TOBIAS}} watches you with a mixture of pride and worry, and the King sits nearby, his attention wandering. The court whispers in your wake.",
    choices: [{ text: 'Accept the Queen’s favour and rise', next: 'power_ending', relationship: 3 },
    { text: 'Choose love instead of power', next: 'claim_love', relationship: 1, character: '{{MAJOR_TOBIAS}}' },
    { text: 'Ask for a royal introduction to secure your future', next: 'marriage_offer', relationship: 2 },
    { text: 'Request a private audience with the King', next: 'king_george_meeting', relationship: 1, character: 'King George III' },
    { text: 'Speak for reform', next: 'public_reform_end', relationship: 1, character: 'Queen Charlotte' },],
  },
  royal_presentation: {
    character: 'Queen Charlotte', characters: ['Queen Charlotte', 'King George III'], text:
      'You step into the royal salon, heart hammering. The Queen studies you closely, and the King sits nearby, his gaze drifting as if he listens to a voice only he can hear.',
    choices: [{ text: 'Offer a graceful curtsy to both royals', next: 'king_george_meeting', relationship: 1, character: 'King George III' },
    { text: 'Focus on the Queen and avoid the King’s stare', next: 'queen_favour_end', relationship: 2, character: 'Queen Charlotte' },
    { text: 'Ask to serve as a discreet lady-in-waiting', next: 'court_service', relationship: 1, character: 'Queen Charlotte' },],
  },
  king_george_meeting: {
    character: 'King George III', characters: ['King George III', 'Queen Charlotte'], text:
      'The King’s smile flickers between warmth and confusion. He asks you the date twice. The Queen’s fingers tighten on her fan as she watches him, love and worry warring in her eyes.',
    choices: [{ text: 'Answer gently and with patience', next: 'court_service', relationship: 2, character: 'King George III' },
    { text: 'Let the Queen steer the conversation', next: 'queen_favour_end', relationship: 1, character: 'Queen Charlotte' },
    { text: 'Overstep and speak too boldly', next: 'scandal_end', relationship: -2 },],
  },
  court_service: {
    character: 'Queen Charlotte', characters: ['Queen Charlotte'], text:
      'You are summoned for quiet service at court. It is a position of proximity and peril, and the Queen expects absolute discretion.',
    choices: [{ text: 'Remain loyal and rise in royal favour', next: 'queen_favour_end', relationship: 3, character: 'Queen Charlotte' },
    { text: 'Use the position to help your family', next: 'power_ending', relationship: 1 },
    { text: 'Walk away before the court swallows you', next: 'heartbreak_end', relationship: -1 },
    { text: 'Seek a private audience with a duchess patron', next: 'duchess_patron_end', relationship: 2 },],
  },
  duchess_patron_end: {
    character: '{{MAJOR_SABINE}}', text:
      '{{MAJOR_SABINE_TITLE_FAMILY}} takes you under her wing, and your name becomes a quiet power in salons and drawing rooms. You trade gossip for influence, and your family never wants again. ENDING: THE DUCHESS’S PATRONAGE.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  claim_love: {
    character: '{{MAJOR_TOBIAS}}', text:
      "You dance three dances in a row with {{MAJOR_TOBIAS_FIRST}}, a scandal that sets tongues wagging. \'I love you,\' he whispers. \'Marry me. Tonight, tomorrow, whenever you will have me.\'",
    choices: [{ text: 'Accept his proposal. TRUE LOVE ENDING', next: 'true_love_ending', relationship: 6 },
    { text: 'Ask for time to be certain of his commitment', next: 'ask_time', relationship: 1 },
    { text: 'Realize you want more than just marriage. POWER ENDING', next: 'power_ending', relationship: -2 },],
  },
  ask_time: {
    character: '{{MAJOR_TOBIAS}}', text:
      "He nods, understanding the weight of what you are both risking. 'Take what time you need. I will be here.'",
    choices: [{ text: 'Accept his faith and choose love', next: 'true_love_ending', relationship: 4 },
    { text: 'Use the time to gain power', next: 'power_ending', relationship: -1 },],
  },
  marriage_offer: {
    character: 'Queen Charlotte', characters: ['Queen Charlotte', '{{MAJOR_TOBIAS}}'], text:
      'Queen Charlotte grants a royal introduction that brings a powerful suitor to your side, offering marriage as alliance. {{MAJOR_TOBIAS_FIRST}} lingers at the edge of the room, caught between hope and fear. The offer could secure your family forever, but love may not be part of the bargain.',
    choices: [{ text: 'Accept the political marriage', next: 'power_ending', relationship: 4 },
    { text: 'Refuse and return to {{MAJOR_TOBIAS_FIRST}}', next: 'claim_love', relationship: 1, character: '{{MAJOR_TOBIAS}}' },
    { text: 'Decline and walk away from court entirely', next: 'refuse_meeting', relationship: -2 },],
  },
  true_love_ending: {
    character: '{{MAJOR_TOBIAS}}', text:
      "'Yes,' you breathe, and then louder, 'Yes, {{MAJOR_TOBIAS_FIRST}}, I will marry you!' The ballroom erupts. The Queen herself smiles, she does love a good love story. YOU HAVE WON: TRUE LOVE ENDING.",
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  power_ending: {
    character: 'Queen Charlotte', text:
      'You play society like a chessboard, charming the Queen and the ton alike. When you finally marry, it is a political alliance as much as a love match. YOU HAVE WON: POWER COUPLE ENDING.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  elope: {
    character: '{{MAJOR_TOBIAS}}', text:
      "You meet {{MAJOR_TOBIAS_FIRST}} at midnight at the posting inn. 'I am certain,' you say firmly. You marry in Gretna Green over the anvil. Society is scandalized, but your love endures. YOU HAVE WON: ROMANTIC SCANDAL ENDING.",
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  refuse_meeting: {
    dynamicTokens: ['CHILDHOOD_FRIEND'], text:
      "You choose safety over scandal. Years later, you marry {{CHILDHOOD_FRIEND}} the baker's son. It is a kind, comfortable life, and you have children who never know hunger. ENDING: THE LIFE YOU KNEW.",
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  death: {
    text:
      'A carriage wheel shatters in the rain, and fate is cruel. The ton will whisper about your daring until the next scandal arrives. Your story ends here.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  scandal_end: {
    character: '{{MAJOR_FINCH_TITLE_FAMILY}}', text:
      "The scandal swells beyond repair, and {{MAJOR_FINCH_TITLE_FAMILY}}'s presses keep it alive. Doors close, invitations vanish, and your name becomes a warning whispered to young ladies. ENDING: CAST OUT BY SOCIETY.",
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  banished_end: {
    character: 'Mother', text:
      'You slip away from society, returning to the life you knew. Your mother greets you with tired relief, but the weight of what might have been lingers. ENDING: EXILE FROM SOCIETY.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  queen_favour_end: {
    character: 'Queen Charlotte', text:
      'The Queen keeps you close, trusting your discretion. Your family is secure, and your name becomes known at court. ENDING: THE QUEEN\'S FAVOUR.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  heartbreak_end: {
    text:
      'You choose caution and family over ambition. The ache of what you surrendered never fully leaves. ENDING: THE PRICE OF SAFETY.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  reconciliation_end: {
    character: '{{MAJOR_TOBIAS}}', text:
      'You keep {{MAJOR_TOBIAS_FIRST}} out of the scandal by sacrificing your own advantage. He finds you afterward, steady and grateful, and together you step away from the ton on your own terms. ENDING: QUIET RECONCILIATION.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  home_evening_vigil: {
    character: 'Mother', text:
      "Night settles over the modest home, and your mother keeps her sewing close. She studies you over the candle flame, as if weighing the cost of every hope you carry.",
    choices: [{ text: 'Confide your hopes', next: 'mother_story', relationship: 1 },
    { text: 'Ask about work at the houses', next: 'sewing_shift', relationship: 0 },
    { text: 'Slip out for fresh air', next: 'market', relationship: 0 },],
  },
  home_rent_threat: {
    character: 'Mother', text:
      "A sharp knock at the door brings the landlord's warning. Your mother exhales through her nose, pride and worry fighting in her face.",
    choices: [{ text: 'Offer to take extra work', next: 'sewing_shift', relationship: 1 },
    { text: 'Seek a patron at the reception', next: 'maid_position', relationship: 0 },
    { text: 'Ask for help in town', next: 'market', relationship: 0 },],
  },
  home_storm_glass: {
    character: 'Mother', text:
      'Rain taps the panes while you fold linen and plan your next step. Your mother keeps pace beside you, the silence between you saying everything.',
    choices: [{ text: 'Stay in and finish the work', next: 'chores', relationship: 1 },
    { text: 'Ask to visit the market', next: 'market', relationship: -1 },
    { text: 'Ask about the {{MAJOR_TOBIAS_FAMILY}} household', next: 'ball_inquiry', relationship: 0 },],
  },
  home_letter_seal: {
    character: 'Mother', text:
      'You find an old seal tucked in the drawer and imagine the letter it might send. Your mother touches your shoulder, a quiet warning in her gaze.',
    choices: [{ text: 'Ask about the estranged cousin', next: 'cousin_letter', relationship: 0 },
    { text: 'Swear to find your own way', next: 'determined', relationship: -1 },
    { text: 'Focus on practical work', next: 'sewing_shift', relationship: 1 },],
  },
  home_candle_confidant: {
    dynamicTokens: ['CHILDHOOD_FRIEND'], characters: ['{{CHILDHOOD_FRIEND}}'], text:
      "{{CHILDHOOD_FRIEND}} stops by with a loaf and a soft smile, speaking in a low voice so your mother will not hear. He offers his help without asking for anything in return.",
    choices: [{ text: 'Take his offer and leave together', next: 'garden_walk', relationship: 1, character: '{{CHILDHOOD_FRIEND}}' },
    { text: 'Thank him and stay home', next: 'home_evening_vigil', relationship: 0, character: '{{CHILDHOOD_FRIEND}}' },
    { text: 'Ask him for gossip', next: 'market', relationship: 0, character: '{{CHILDHOOD_FRIEND}}' },],
  },
  home_needle_oath: {
    character: 'Mother', text:
      "You and your mother work in silence until she finally says, 'Promise me you will not lose yourself for a title.' The plea lands like a weight in your chest.",
    choices: [{ text: 'Promise her you will be careful', next: 'ball_inquiry', relationship: 1 },
    { text: 'Refuse to promise anything', next: 'determined', relationship: -1 },
    { text: 'Change the subject to your cousin', next: 'family_illness', relationship: 0 },],
  },
  market_hidden_note: {
    character: '{{MAJOR_BEATRIX}}', text:
      'At the glove stall, {{MAJOR_BEATRIX}} recognizes you and slides a folded note beneath the silk. Her smile is gentle, but her eyes are sharp.',
    choices: [{ text: 'Read the note at once', next: 'glove_return', relationship: 1, character: '{{MAJOR_BEATRIX}}' },
    { text: 'Tuck it away and keep moving', next: 'market', relationship: 0 },
    { text: 'Ask for her advice', next: 'workhouse_offer', relationship: 1, character: '{{MAJOR_BEATRIX}}' },],
  },
  market_rumour_sheet: {
    text:
      'A boy hawking scandal sheets mentions {{MAJOR_FINCH_TITLE_FAMILY}} and the Society Circular. The ink is barely dry, but the damage is already done.',
    choices: [{ text: 'Ask who {{MAJOR_FINCH_TITLE_FAMILY}} is', next: 'salon_invitation', relationship: 0, character: '{{MAJOR_FINCH_TITLE_FAMILY}}' },
    { text: 'Ignore the chatter', next: 'market', relationship: 0 },
    { text: 'Seek safer company', next: 'tea_room', relationship: 0 },],
  },
  market_carriage_sight: {
    character: '{{MAJOR_TOBIAS}}', text:
      'A polished carriage rolls past, and you catch a glimpse of {{MAJOR_TOBIAS}} inside. His gaze meets yours for a moment before the curtains fall.',
    choices: [{ text: 'Follow the carriage at a distance', next: 'maid_position', relationship: 0 },
    { text: 'Return to your errands', next: 'market', relationship: 0 },
    { text: 'Tell a maid what you saw', next: 'maid_gossip', relationship: 0 },],
  },
  market_spice_stall: {
    dynamicTokens: ['CHILDHOOD_FRIEND'], characters: ['{{CHILDHOOD_FRIEND}}'], text:
      "The spice stall is loud with laughter, and {{CHILDHOOD_FRIEND}} slips a packet into your palm. His fingers linger just long enough to make your heart jump.",
    choices: [{ text: 'Smile and lean closer', next: 'thomas_chat', relationship: 1, character: '{{CHILDHOOD_FRIEND}}' },
    { text: 'Keep it proper and step back', next: 'market', relationship: 0, character: '{{CHILDHOOD_FRIEND}}' },
    { text: 'Ask about the reception', next: 'maid_gossip', relationship: 0 },],
  },
  market_midday_rain: {
    text:
      'Rain drives the crowd under awnings, and you spot a woman from your street hurrying with a basket. She tells you your mother has been asking for you.',
    choices: [{ text: 'Return home quickly', next: 'home_evening_vigil', relationship: 0 },
    { text: 'Finish your errands first', next: 'market', relationship: -1 },
    { text: 'Use the rain as cover and slip away', next: 'dynamic_event', relationship: 0 },],
  },
  market_muslin_bargain: {
    character: '{{MAJOR_SABINE}}', text:
      'A bolt of muslin is laid out for inspection, and {{MAJOR_SABINE_TITLE_FAMILY}} appears beside it as if she never tires of watching the city. Her gaze lingers on you.',
    choices: [{ text: 'Curtsy and speak with candor', next: 'patronage_offer', relationship: 1, character: '{{MAJOR_SABINE}}' },
    { text: 'Keep your head down', next: 'market', relationship: 0 },
    { text: 'Ask about the court reception', next: 'royal_notice', relationship: 0 },],
  },
  estate_gate_wait: {
    dynamicTokens: ['HOUSEKEEPER'], characters: ['{{HOUSEKEEPER}}'], text:
      'You wait near the estate gate while servants hurry by. {{HOUSEKEEPER}} inspects you as if weighing whether you are trouble or promise.',
    choices: [{ text: 'Offer your help immediately', next: 'maid_position', relationship: 0 },
    { text: 'Ask about the evening schedule', next: 'professional_maid', relationship: 0 },
    { text: 'Step away before she dismisses you', next: 'market', relationship: 0 },
    { text: 'Linger along the estate path', next: 'location_event', relationship: 0 },],
  },
  estate_corridor_glance: {
    character: '{{MAJOR_TOBIAS}}', text:
      'In a quiet corridor, {{MAJOR_TOBIAS}} passes you with a nod that feels warmer than it should. The moment is brief, but it lingers.',
    choices: [{ text: 'Follow his path', next: 'catch_attention', relationship: 1 },
    { text: 'Keep working and say nothing', next: 'professional_maid', relationship: 0 },
    { text: 'Hide in the music room', next: 'music_room', relationship: 0 },],
  },
  estate_service_stairs: {
    dynamicTokens: ['HOUSEKEEPER'], characters: ['{{HOUSEKEEPER}}'], text:
      'On the service stairs, {{HOUSEKEEPER}} stops you with a quiet warning about being seen by guests. Her tone leaves no space for argument.',
    choices: [{ text: 'Agree and return to duty', next: 'professional_maid', relationship: 0 },
    { text: 'Ask to be moved elsewhere', next: 'kitchen_return', relationship: 0 },
    { text: 'Slip away anyway', next: 'observe_society', relationship: 0 },],
  },
  estate_laundry_steam: {
    character: '{{MAJOR_SABINE}}', text:
      "Steam fogs the servants' corridor as linens are carried through. {{MAJOR_SABINE_TITLE_FAMILY}} passes, skirts whispering, and you feel her notice you.",
    choices: [{ text: 'Curtsy and offer your name', next: 'duchess_rivington', relationship: 1, character: '{{MAJOR_SABINE}}' },
    { text: 'Avoid her notice', next: 'professional_maid', relationship: 0 },
    { text: 'Follow her at a distance', next: 'observe_society', relationship: 0 },],
  },
  estate_gallery_pause: {
    character: '{{MAJOR_IMOGEN}}', text:
      'You pause before a portrait in the gallery, and {{MAJOR_IMOGEN}} appears at your side with a thin smile. Her gaze is a blade.',
    choices: [{ text: 'Hold her gaze', next: 'rival_confrontation', relationship: 0, character: '{{MAJOR_IMOGEN}}' },
    { text: 'Retreat to the kitchens', next: 'kitchen_return', relationship: 0 },
    { text: 'Slip into the ballroom', next: 'observe_society', relationship: 0 },],
  },
  estate_conservatory_path: {
    character: '{{MAJOR_IMOGEN}}', text:
      'The path to the conservatory is quiet, and {{MAJOR_IMOGEN}} steps into your way as if she had been waiting. Her words are sweet, her meaning sharp.',
    choices: [{ text: 'Answer with measured poise', next: 'conservatory_whisper', relationship: 0, character: '{{MAJOR_IMOGEN}}' },
    { text: 'Refuse to be drawn in', next: 'kitchen_return', relationship: 0 },
    { text: 'Pretend you did not hear her', next: 'observe_society', relationship: 0 },],
  },
  ballroom_encore: {
    character: '{{MAJOR_TOBIAS}}', text:
      'The musicians begin an encore, and {{MAJOR_TOBIAS_FIRST}} is suddenly near enough to speak. The press of bodies hides the way his hand brushes yours.',
    choices: [{ text: 'Let the touch linger', next: 'catch_attention', relationship: 2 },
    { text: 'Step back into the crowd', next: 'observe_society', relationship: 0 },
    { text: 'Slip to the terrace for air', next: 'garden_gate_lanterns', relationship: 0 },],
  },
  ballroom_masked_corner: {
    character: '{{MAJOR_FINCH_TITLE_FAMILY}}', text:
      'A masked figure gestures you into a quiet corner and mentions {{MAJOR_FINCH_TITLE_FAMILY}}. The message is brief, but the implication is clear.',
    choices: [{ text: 'Follow the hint', next: 'salon_invitation', relationship: 0, character: '{{MAJOR_FINCH_TITLE_FAMILY}}' },
    { text: 'Refuse and return to the floor', next: 'observe_society', relationship: 0 },
    { text: 'Find {{MAJOR_SABINE_TITLE_FAMILY}}', next: 'duchess_rivington', relationship: 0 },],
  },
  ballroom_gossip_ring: {
    character: '{{MAJOR_IMOGEN}}', text:
      'A ring of debutantes parts, and {{MAJOR_IMOGEN}} smiles as if she owns the air. The conversation turns to you in slow, glittering pieces.',
    choices: [{ text: 'Challenge her openly', next: 'rival_confrontation', relationship: -1, character: '{{MAJOR_IMOGEN}}' },
    { text: 'Smile and withdraw', next: 'kitchen_return', relationship: 0 },
    { text: 'Seek {{MAJOR_TOBIAS_FIRST}} for cover', next: 'catch_attention', relationship: 1 },],
  },
  ballroom_private_balcony: {
    character: '{{MAJOR_TOBIAS}}', text:
      'You slip onto a shadowed balcony, and {{MAJOR_TOBIAS_FIRST}} follows. The city is a blur below as his voice turns low and close, asking what you truly want.',
    choices: [{ text: 'Admit you want him', next: 'physical_tension', relationship: 2 },
    { text: 'Insist on proper courtship', next: 'suggest_courtship', relationship: 1 },
    { text: 'Step away before it goes too far', next: 'kitchen_return', relationship: -1 },],
  },
  ballroom_champagne_spill: {
    character: '{{MAJOR_SABINE}}', text:
      'A spilled glass draws the eye of {{MAJOR_SABINE_TITLE_FAMILY}}. She studies you for a heartbeat too long, then says nothing.',
    choices: [{ text: 'Apologize and steady yourself', next: 'professional_maid', relationship: 0 },
    { text: 'Ask her for guidance', next: 'duchess_rivington', relationship: 1, character: '{{MAJOR_SABINE}}' },
    { text: 'Disappear into the crowd', next: 'observe_society', relationship: 0 },],
  },
  ballroom_whispered_wager: {
    character: '{{MAJOR_TOBIAS}}', text:
      'You overhear a wager about which lord will claim your next dance. {{MAJOR_TOBIAS_FIRST}} hears it too, his jaw tightening before he meets your eyes.',
    choices: [{ text: 'Accept his offered hand', next: 'catch_attention', relationship: 1 },
    { text: 'Refuse the game entirely', next: 'kitchen_return', relationship: 0 },
    { text: 'Play along for leverage', next: 'political_game', relationship: 1 },],
  },
  garden_gate_lanterns: {
    character: '{{MAJOR_TOBIAS}}', text:
      'Lanterns sway at the garden gate, and {{MAJOR_TOBIAS_FIRST}} finds you there. His voice is soft, almost reverent, as he asks for a moment alone.',
    choices: [{ text: 'Give him that moment', next: 'physical_tension', relationship: 2 },
    { text: 'Insist on a chaperone', next: 'chaperoned_meeting', relationship: -1 },
    { text: 'Return to the ballroom', next: 'observe_society', relationship: 0 },],
  },
  garden_hedge_listen: {
    character: '{{MAJOR_IMOGEN}}', text:
      'Behind the hedges, you hear {{MAJOR_IMOGEN}} speaking your name with a laugh. She notices you and does not bother to stop.',
    choices: [{ text: 'Confront her', next: 'rival_confrontation', relationship: -1, character: '{{MAJOR_IMOGEN}}' },
    { text: 'Walk away with dignity', next: 'garden_gate_lanterns', relationship: 0 },
    { text: 'Tell {{MAJOR_SABINE_TITLE_FAMILY}}', next: 'rivington_intervention', relationship: 0, character: '{{MAJOR_SABINE}}' },],
  },
  garden_moonwalk: {
    character: '{{MAJOR_TOBIAS}}', text:
      'Moonlight catches the line of his jaw as {{MAJOR_TOBIAS_FIRST}} walks beside you. The air is cool, the silence warm, and you feel the pull between you tighten.',
    choices: [{ text: 'Let him draw closer', next: 'physical_tension', relationship: 2 },
    { text: 'Ask him to wait for daylight', next: 'suggest_courtship', relationship: 1 },
    { text: 'Step away before it becomes rumor', next: 'kitchen_return', relationship: -1 },],
  },
  garden_fountain_vow: {
    character: '{{MAJOR_SABINE}}', text:
      'At the fountain, {{MAJOR_SABINE_TITLE_FAMILY}} speaks as if to the water, offering you a path through the season if you can keep your wits.',
    choices: [{ text: 'Accept her patronage', next: 'society_lessons', relationship: 2, character: '{{MAJOR_SABINE}}' },
    { text: 'Decline with gratitude', next: 'heartbreak_end', relationship: -1 },
    { text: 'Ask for time', next: 'maid_position', relationship: 0 },],
  },
  garden_orchard_turn: {
    character: '{{MAJOR_TOBIAS}}', text:
      'The orchard is quiet, and {{MAJOR_TOBIAS_FIRST}} confesses he has been searching for you. His hand hovers near your waist, waiting for permission.',
    choices: [{ text: 'Give him permission', next: 'physical_tension', relationship: 2 },
    { text: 'Say not here, not now', next: 'kitchen_return', relationship: 0 },
    { text: 'Ask him to speak of the future', next: 'suggest_courtship', relationship: 1 },],
  },
  garden_rose_thorns: {
    character: '{{MAJOR_IMOGEN}}', text:
      "A rose catches your sleeve, and {{MAJOR_IMOGEN}} reaches to free it, her smile sharp. 'Careful,' she says, 'thorns are greedy.'",
    choices: [{ text: 'Answer her with calm', next: 'rival_confrontation', relationship: 0, character: '{{MAJOR_IMOGEN}}' },
    { text: 'Thank her and move on', next: 'garden_gate_lanterns', relationship: 0 },
    { text: 'Return inside', next: 'observe_society', relationship: 0 },],
  },
  library_lamp_whisper: {
    character: '{{MAJOR_TOBIAS}}', text:
      'The library lamps are low, and {{MAJOR_TOBIAS_FIRST}} stands between the shelves as if he has been waiting. His voice is a whisper when he says your name.',
    choices: [{ text: 'Step into the shadows with him', next: 'physical_tension', relationship: 2 },
    { text: 'Ask for honesty first', next: 'honest_confession', relationship: 1 },
    { text: 'Leave before anyone sees', next: 'kitchen_return', relationship: -1 },],
  },
  library_catalogue: {
    character: '{{MAJOR_SABINE}}', text:
      'You find {{MAJOR_SABINE_TITLE_FAMILY}} in the library, inspecting a catalogue of patrons. She asks if you understand the cost of a favor.',
    choices: [{ text: 'Say you understand', next: 'duchess_rivington', relationship: 1, character: '{{MAJOR_SABINE}}' },
    { text: 'Say you will not be purchased', next: 'heartbreak_end', relationship: -1 },
    { text: 'Ask for guidance instead', next: 'royal_notice', relationship: 0 },],
  },
  library_afterhours: {
    character: '{{MAJOR_TOBIAS}}', text:
      'After hours, the library feels like a secret. {{MAJOR_TOBIAS_FIRST}} closes the door with care, and the silence between you becomes heavier than the books.',
    choices: [{ text: 'Let him hold you close', next: 'physical_tension', relationship: 2 },
    { text: 'Ask him to court you properly', next: 'suggest_courtship', relationship: 1 },
    { text: 'Leave before the lock clicks', next: 'kitchen_return', relationship: -1 },],
  },
  library_stacks_rumor: {
    text:
      "A stack of pamphlets bears {{MAJOR_FINCH_TITLE_FAMILY}}'s imprint. The words are bold, and the whispers around him are bolder.",
    choices: [{ text: 'Ask to meet him', next: 'salon_invitation', relationship: 0, character: '{{MAJOR_FINCH_TITLE_FAMILY}}' },
    { text: 'Hide the pamphlet', next: 'kitchen_return', relationship: 0 },
    { text: 'Leave it where it lies', next: 'observe_society', relationship: 0 },],
  },
  library_quiet_bargain: {
    character: 'Queen Charlotte', text:
      'You are told the Queen is in the next room with her closest attendants. The air feels thin, as if the court itself is listening.',
    choices: [{ text: 'Seek her notice', next: 'queen_approval', relationship: 1, character: 'Queen Charlotte' },
    { text: 'Avoid the royal rooms', next: 'kitchen_return', relationship: 0 },
    { text: 'Wait in the hall', next: 'royal_presentation', relationship: 0 },],
  },
  library_silent_oath: {
    character: '{{MAJOR_TOBIAS}}', text:
      'You find a quiet corner and {{MAJOR_TOBIAS_FIRST}} joins you without a word. He offers his hand, palm up, like a vow he is not ready to speak aloud.',
    choices: [{ text: 'Take his hand', next: 'physical_tension', relationship: 2 },
    { text: 'Ask for clarity', next: 'why_care', relationship: 1 },
    { text: 'Withdraw with care', next: 'kitchen_return', relationship: 0 },],
  },
  royal_gallery_hush: {
    character: 'Queen Charlotte', text:
      'The royal gallery is all marble and whisper. Queen Charlotte turns her attention to you, and the room stills.',
    choices: [{ text: 'Offer a graceful curtsy', next: 'queen_approval', relationship: 2, character: 'Queen Charlotte' },
    { text: 'Step back and observe', next: 'royal_presentation', relationship: 0 },
    { text: 'Ask for a discreet role', next: 'court_service', relationship: 1, character: 'Queen Charlotte' },],
  },
  royal_petition: {
    character: 'King George III', text:
      'You are ushered toward the King, whose attention flickers like a candle. The Queen watches with a guarded calm.',
    choices: [{ text: 'Answer with patience', next: 'king_george_meeting', relationship: 1, character: 'King George III' },
    { text: 'Let the Queen lead', next: 'queen_favour_end', relationship: 1, character: 'Queen Charlotte' },
    { text: 'Withdraw quietly', next: 'court_service', relationship: 0 },],
  },
  royal_whisper_line: {
    character: 'Queen Charlotte', text:
      'A lady-in-waiting offers you a message for Queen Charlotte, and the invitation feels like a test.',
    choices: [{ text: 'Deliver it yourself', next: 'queen_approval', relationship: 1, character: 'Queen Charlotte' },
    { text: 'Pass it to a servant', next: 'court_service', relationship: 0 },
    { text: 'Decline the risk', next: 'heartbreak_end', relationship: -1 },],
  },
  royal_chapel: {
    character: 'Queen Charlotte', text:
      'In the royal chapel, the Queen kneels in silence. You feel the weight of eyes on you even in prayer.',
    choices: [{ text: 'Speak with restraint', next: 'queen_approval', relationship: 1, character: 'Queen Charlotte' },
    { text: 'Ask for your family', next: 'court_service', relationship: 1 },
    { text: 'Leave quietly', next: 'heartbreak_end', relationship: -1 },],
  },
  royal_mirror: {
    character: '{{MAJOR_IMOGEN}}', text:
      'You catch your reflection in the gilded mirror and see {{MAJOR_IMOGEN}} behind you. Her smile is a polished blade.',
    choices: [{ text: 'Turn and face her', next: 'rival_confrontation', relationship: -1, character: '{{MAJOR_IMOGEN}}' },
    { text: 'Ignore her and move on', next: 'royal_presentation', relationship: 0 },
    { text: 'Seek {{MAJOR_SABINE_TITLE_FAMILY}}', next: 'rivington_intervention', relationship: 0, character: '{{MAJOR_SABINE}}' },],
  },
  royal_courtship_whisper: {
    character: '{{MAJOR_TOBIAS}}', text:
      'In the edge of the court, {{MAJOR_TOBIAS_FIRST}} murmurs that he would choose you even here. The danger of that admission makes your pulse race.',
    choices: [{ text: 'Tell him to be careful', next: 'suggest_courtship', relationship: 1 },
    { text: 'Ask him to prove it', next: 'open_courtship', relationship: 2 },
    { text: 'Step away to protect him', next: 'heartbreak_end', relationship: -1 },],
  },
  kitchen_spill: {
    dynamicTokens: ['HOUSEKEEPER'], characters: ['{{HOUSEKEEPER}}'], text:
      'A tray tips in the kitchen, and {{HOUSEKEEPER}} snaps her orders while you scramble to make it right. The heat rises with her temper.',
    choices: [{ text: 'Apologize and work faster', next: 'professional_maid', relationship: 0 },
    { text: 'Ask to be moved elsewhere', next: 'kitchen_return', relationship: 0 },
    { text: 'Slip out to the ballroom', next: 'observe_society', relationship: 0 },],
  },
  kitchen_afterhours: {
    character: '{{MAJOR_TOBIAS}}', text:
      'Long after the last plate is cleared, you spot {{MAJOR_TOBIAS_FIRST}} at the doorway as if he has been searching the halls. He says your name in a voice meant for no one else.',
    choices: [{ text: 'Step toward him', next: 'physical_tension', relationship: 2 },
    { text: 'Ask him to wait outside', next: 'suggest_courtship', relationship: 1 },
    { text: 'Send him away', next: 'kitchen_return', relationship: -1 },],
  },
  kitchen_gossip_circle: {
    text:
      "The maids trade stories like coin, and your mother's name is spoken with respect. It steadies you more than you expect.",
    choices: [{ text: 'Hold your head higher', next: 'professional_maid', relationship: 0 },
    { text: 'Return to the ballroom', next: 'observe_society', relationship: 0 },
    { text: 'Go home early', next: 'family_illness', relationship: 0 },],
  },
  kitchen_private_pantry: {
    character: '{{MAJOR_TOBIAS}}', text:
      "In the shadow of the pantry door, {{MAJOR_TOBIAS_FIRST}}'s gaze lingers on your lips. The thought of slipping away together feels dangerously easy.",
    choices: [{ text: 'Let him kiss you', next: 'passionate_kiss', relationship: 2 },
    { text: 'Say you will not be reckless', next: 'suggest_courtship', relationship: 1 },
    { text: 'Leave before it grows', next: 'kitchen_return', relationship: -1 },],
  },
  kitchen_orders: {
    dynamicTokens: ['HOUSEKEEPER'], characters: ['{{HOUSEKEEPER}}'], text:
      '{{HOUSEKEEPER}} assigns you to the wine service, her eyes daring you to fail. The ballroom beckons through the door.',
    choices: [{ text: 'Serve with care', next: 'professional_maid', relationship: 0 },
    { text: 'Use the post to watch the dancers', next: 'observe_society', relationship: 0 },
    { text: 'Seek {{MAJOR_TOBIAS_FIRST}} with your tray', next: 'catch_attention', relationship: 1 },],
  },
  kitchen_late_confession: {
    character: '{{MAJOR_TOBIAS}}', text:
      'You hear {{MAJOR_TOBIAS_FIRST}} behind you before you see him. His voice is soft as he asks if you ever think of a life beyond the walls.',
    choices: [{ text: 'Say you do', next: 'why_care', relationship: 1 },
    { text: 'Say it is a foolish dream', next: 'impossible_love', relationship: 0 },
    { text: 'Ask him what he wants', next: 'physical_tension', relationship: 2 },],
  },
  park_bench_confession: {
    character: '{{MAJOR_TOBIAS}}', text:
      'You sit on a quiet bench, and {{MAJOR_TOBIAS_FIRST}} arrives with a look you cannot quite read. The city hums beyond the trees.',
    choices: [{ text: 'Invite him to sit', next: 'agree_meeting', relationship: 1 },
    { text: 'Ask what he wants of you', next: 'why_care', relationship: 1 },
    { text: 'Leave before anyone notices', next: 'refuse_meeting', relationship: -1 },],
  },
  park_rain_shelter: {
    dynamicTokens: ['CHILDHOOD_FRIEND'], characters: ['{{CHILDHOOD_FRIEND}}'], text:
      'A sudden shower sends you under a tree with {{CHILDHOOD_FRIEND}}. He laughs and offers his cloak, eyes warm.',
    choices: [{ text: 'Take the cloak and thank him', next: 'thomas_chat', relationship: 1, character: '{{CHILDHOOD_FRIEND}}' },
    { text: 'Decline and hurry home', next: 'home_evening_vigil', relationship: 0 },
    { text: 'Walk with him awhile', next: 'garden_walk', relationship: 1, character: '{{CHILDHOOD_FRIEND}}' },],
  },
  park_folly_mist: {
    character: '{{MAJOR_TOBIAS}}', text:
      'Mist curls around the folly as {{MAJOR_TOBIAS_FIRST}} draws close. His hands hover at your waist, waiting for your nod.',
    choices: [{ text: 'Nod and let him hold you', next: 'physical_tension', relationship: 2 },
    { text: 'Ask for a promise instead', next: 'suggest_courtship', relationship: 1 },
    { text: 'Say this must end', next: 'call_it_mistake', relationship: -2 },],
  },
  park_procession: {
    character: 'Queen Charlotte', text:
      'A royal procession passes through the park, and Queen Charlotteâ€™s carriage glitters in the sun. The crowd bows low.',
    choices: [{ text: 'Step forward and curtsy', next: 'queen_approval', relationship: 1, character: 'Queen Charlotte' },
    { text: 'Remain in the crowd', next: 'market', relationship: 0 },
    { text: 'Leave before you are noticed', next: 'home_evening_vigil', relationship: 0 },],
  },
  park_lantern_challenge: {
    character: '{{MAJOR_IMOGEN}}', text:
      'At dusk, {{MAJOR_IMOGEN}} appears with a lantern and a question about your intentions. Her tone dares you to answer.',
    choices: [{ text: 'Answer without fear', next: 'rival_confrontation', relationship: -1, character: '{{MAJOR_IMOGEN}}' },
    { text: 'End the conversation politely', next: 'park_bench_confession', relationship: 0 },
    { text: 'Walk away', next: 'market', relationship: 0 },],
  },
  park_secret_letter: {
    text:
      "A folded letter waits beneath a bench, signed with {{MAJOR_FINCH_TITLE_FAMILY}}'s seal. It asks for a meeting you are not sure you should take.",
    choices: [{ text: 'Accept the invitation', next: 'finch_offer', relationship: 0, character: '{{MAJOR_FINCH_TITLE_FAMILY}}' },
    { text: 'Refuse and tear the note', next: 'heartbreak_end', relationship: -1 },
    { text: 'Seek advice first', next: 'duchess_rivington', relationship: 0 },],
  },
  carriage_wait: {
    character: '{{MAJOR_SABINE}}', text:
      'A carriage stands ready while {{MAJOR_SABINE_TITLE_FAMILY}} speaks with a patron. She glances toward you, as if to invite you along.',
    choices: [{ text: 'Accept the invitation', next: 'society_lessons', relationship: 1, character: '{{MAJOR_SABINE}}' },
    { text: 'Decline and remain', next: 'kitchen_return', relationship: 0 },
    { text: 'Ask for time', next: 'maid_position', relationship: 0 },
    { text: 'Let the night drift on', next: 'location_event', relationship: 0 },],
  },
  carriage_gate_signal: {
    character: '{{MAJOR_TOBIAS}}', text:
      'At the carriage gate, {{MAJOR_TOBIAS_FIRST}} offers his hand to help you step down. The touch is brief and far too intimate.',
    choices: [{ text: 'Let it linger', next: 'physical_tension', relationship: 2 },
    { text: 'Withdraw quickly', next: 'kitchen_return', relationship: 0 },
    { text: 'Ask him to be careful', next: 'suggest_courtship', relationship: 1 },],
  },
  carriage_drawn_shade: {
    character: '{{MAJOR_TOBIAS}}', text:
      'Inside the dim carriage, the curtains are drawn and the world feels far away. Tobiasâ€™s voice turns low as he asks if you have ever wanted to be held without consequence.',
    choices: [{ text: 'Say yes', next: 'physical_tension', relationship: 2 },
    { text: 'Say not like this', next: 'suggest_courtship', relationship: 1 },
    { text: 'Open the curtain', next: 'kitchen_return', relationship: 0 },],
  },
  carriage_mist_return: {
    text:
      'The carriage rattles through fog, and you think of your mother waiting at home. The distance between your world and hers feels wider than ever.',
    choices: [{ text: 'Return home', next: 'home_evening_vigil', relationship: 0 },
    { text: 'Press on toward the estate', next: 'maid_position', relationship: 0 },
    { text: 'Change your mind and return to town', next: 'market', relationship: 0 },],
  },
  carriage_rattle_secret: {
    text:
      "A courier hands you a note stamped with {{MAJOR_FINCH_TITLE_FAMILY}}'s seal as the carriage jolts. It promises opportunity, but the ink looks like trouble.",
    choices: [{ text: 'Read it now', next: 'finch_offer', relationship: 0, character: '{{MAJOR_FINCH_TITLE_FAMILY}}' },
    { text: 'Hide it for later', next: 'kitchen_return', relationship: 0 },
    { text: 'Destroy it', next: 'heartbreak_end', relationship: -1 },],
  },
  carriage_after_dance: {
    character: '{{MAJOR_TOBIAS}}', text:
      'After a dance, {{MAJOR_TOBIAS_FIRST}} sees you to the carriage and lingers at the door. His gaze promises more than the night allows.',
    choices: [{ text: 'Ask to see him again', next: 'agree_meeting', relationship: 1 },
    { text: 'Tell him it was a mistake', next: 'call_it_mistake', relationship: -2 },
    { text: 'Ask for a public declaration', next: 'open_courtship', relationship: 2 },],
  },
  secret_union_end: {
    character: '{{MAJOR_TOBIAS}}', text:
      'You meet {{MAJOR_TOBIAS_FIRST}} in a quiet chapel at dawn. The vows are simple, the consequences vast. ENDING: SECRET UNION.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  public_reform_end: {
    character: 'Queen Charlotte', text:
      'You speak before the court with steady courage, and the Queen grants her blessing. The ton grumbles, but a new path opens. ENDING: PUBLIC REFORM.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  quiet_respect_end: {
    character: 'Mother', text:
      'You choose a modest life, but not a small one. Your home is steady, your pride intact. ENDING: QUIET RESPECT.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  widow_patron_end: {
    character: '{{MAJOR_SABINE}}', text:
      "{{MAJOR_SABINE_TITLE_FAMILY}} pairs you with a wealthy widow patron, and you learn to move through salons with a strategist's grace. ENDING: THE WIDOW'S PATRONAGE.",
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  exile_abroad_end: {
    text:
      'The scandal grows too loud, and you leave England with only your name and your nerve. A new life begins abroad. ENDING: EXILE OVERSEAS.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  broken_engagement_end: {
    character: '{{MAJOR_TOBIAS}}', text:
      'The engagement collapses under pressure from both families. You part with grace, but the ache lingers. ENDING: BROKEN ENGAGEMENT.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  kept_secret_end: {
    character: '{{MAJOR_TOBIAS}}', text:
      'You and {{MAJOR_TOBIAS_FIRST}} choose secrecy over scandal. The passion remains, but so does the distance. ENDING: KEPT SECRET.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  lost_letters_end: {
    text:
      'A cache of letters vanishes, and with them your chance at a different future. The silence after is its own verdict. ENDING: LOST LETTERS.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  family_duty_end: {
    character: 'Mother', text:
      'You choose your family over the glittering court. The choice is hard, but the home you keep is warm. ENDING: FAMILY DUTY.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  found_ally_end: {
    character: '{{MAJOR_SABINE}}', text:
      'A powerful ally keeps you safe as you rise on your own merits. The ton learns your name in a new tone. ENDING: FOUND ALLY.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  court_blackmail_end: {
    text:
      'A whispered bargain binds you to the court in ways you never intended. You survive, but the price is steep. ENDING: COURT BLACKMAIL.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  rivals_truce_end: {
    character: '{{MAJOR_IMOGEN}}', text:
      "You and {{MAJOR_IMOGEN_FIRST}} settle into a wary truce, each recognizing the other's strength. The season turns in your favor. ENDING: RIVALS' TRUCE.",
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  solitary_power_end: {
    character: 'Queen Charlotte', text:
      'You rise through wit and strategy alone. Love is absent, but your influence is undeniable. ENDING: SOLITARY POWER.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  forbidden_heir_end: {
    character: '{{MAJOR_TOBIAS}}', text:
      '{{MAJOR_TOBIAS_FIRST}} holds your hand when a child is born in quiet and raised in secrecy, loved fiercely but kept from the world. ENDING: FORBIDDEN HEIR.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
  faded_romance_end: {
    character: '{{MAJOR_TOBIAS}}', text:
      'Your romance with {{MAJOR_TOBIAS_FIRST}} fades into something tender but distant. You remember the season as a dream that changed you. ENDING: FADED ROMANCE.',
    choices: [{ text: 'Return to menu to start a new story', next: 'start', relationship: 0 }],
  },
};

export const scenes = Object.fromEntries(
  Object.entries(baseScenes).map(([sceneId, scene]) => [
    sceneId,
    {
      ...scene,
      settingId: scene.settingId || inferSettingId(sceneId) || defaultSettingId,
      text: wrapSceneText(sceneId, scene.text, scene.settingId),
    },
  ])
);

