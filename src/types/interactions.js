export const interactionOptionsByCategory = {
  royalty: [
    { text: 'Offer a respectful curtsy', delta: 1, outcome: 'You show perfect etiquette and gain favour.' },
    { text: 'Speak only when addressed', delta: 0, outcome: 'Your restraint is noted by the court.' },
    { text: 'Misstep in protocol', delta: -2, outcome: 'Your mistake draws a chill from the royal entourage.' },
    { text: 'Overstep with an impertinent remark', delta: -3, outcome: 'The court stiffens at your boldness.' },
    { text: 'Ignore a formal request', delta: -2, outcome: 'The slight is remembered.' },
  ],
  family: [
    { text: 'Share a quiet moment', delta: 1, outcome: 'Your bond feels steadier.' },
    { text: 'Admit your worries', delta: 0, outcome: 'The honesty hangs between you.' },
    { text: 'Snap under pressure', delta: -2, outcome: 'The tension leaves a mark.' },
    { text: 'Dismiss their concern', delta: -2, outcome: 'They fall quiet, wounded by the coldness.' },
    { text: 'Accuse them unfairly', delta: -3, outcome: 'The accusation cuts deeper than you intended.' },
  ],
  noble: [
    { text: 'Exchange a daring compliment', delta: 2, outcome: 'The flirtation lands.' },
    { text: 'Keep the conversation polite', delta: 1, outcome: 'You maintain a graceful distance.' },
    { text: 'Share a bold kiss', delta: 3, outcome: 'It is reckless, and unforgettable.' },
    { text: 'Withdraw before gossip spreads', delta: -1, outcome: 'You retreat to protect yourself.' },
    { text: 'Mock their pride', delta: -2, outcome: 'The smile fades into frost.' },
    { text: 'Refuse a courtesy outright', delta: -2, outcome: 'Your refusal is noted with displeasure.' },
  ],
  staff: [
    { text: 'Thank them for their help', delta: 1, outcome: 'They appreciate the kindness.' },
    { text: 'Stay focused on duty', delta: 0, outcome: 'You keep things professional.' },
    { text: 'Dismiss them sharply', delta: -2, outcome: 'The coldness lingers.' },
    { text: 'Blame them for a mistake', delta: -2, outcome: 'Resentment simmers beneath the surface.' },
    { text: 'Question their competence', delta: -3, outcome: 'The insult stings more than you expected.' },
  ],
  town: [
    { text: 'Share a warm smile', delta: 1, outcome: 'The familiarity grows.' },
    { text: 'Ask for honest advice', delta: 0, outcome: 'They offer a practical insight.' },
    { text: 'Lash out in frustration', delta: -2, outcome: 'The rift widens.' },
    { text: 'Snub them in public', delta: -2, outcome: 'Word of your slight travels quickly.' },
    { text: 'Brush off their warning', delta: -1, outcome: 'They decide you will not be told twice.' },
  ],
};

export const defaultInteractionOptions = [
  { text: 'Offer a polite greeting', delta: 1, outcome: 'You keep the moment cordial.' },
  { text: 'Keep things neutral', delta: 0, outcome: 'Nothing changes between you.' },
  { text: 'End the conversation abruptly', delta: -1, outcome: 'The exchange ends tensely.' },
  { text: 'Make a cutting remark', delta: -2, outcome: 'The remark lands poorly.' },
];

