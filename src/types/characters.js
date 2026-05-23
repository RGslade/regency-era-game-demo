export const characterProfiles = [
  { name: 'Queen Charlotte', category: 'royalty', importance: 'high' },
  { name: 'King George III', category: 'royalty', importance: 'high' },
  { name: 'Duchess Sabine Rivington', category: 'noble', importance: 'high' },
  { name: 'Lord Alistair Rivington', category: 'noble', importance: 'high' },
  { name: 'Lady Maren Rivington', category: 'noble', importance: 'medium' },
  { name: 'Colonel Gideon Rivington', category: 'noble', importance: 'medium' },
  { name: 'Lady Petra Rivington', category: 'noble', importance: 'medium' },
  { name: 'Earl Cedric Ashbourne', category: 'noble', importance: 'high' },
  { name: 'Lady Helena Ashbourne', category: 'noble', importance: 'high' },
  { name: 'Lord Tobias Ashbourne', category: 'noble', importance: 'high' },
  { name: 'Lady Eliza Ashbourne', category: 'noble', importance: 'medium' },
  { name: 'Captain Hugh Ashbourne', category: 'noble', importance: 'medium' },
  { name: 'Lady Beatrix Glasswick', category: 'noble', importance: 'high' },
  { name: 'Edmund Glasswick', category: 'noble', importance: 'medium' },
  { name: 'Lady Imogen Glasswick', category: 'noble', importance: 'high' },
  { name: 'Elias Glasswick', category: 'noble', importance: 'medium' },
  { name: 'Clara Glasswick', category: 'noble', importance: 'medium' },
  { name: 'Mr. Finch', category: 'town', importance: 'medium' },
  { name: 'Mother', category: 'family', importance: 'high' },
];

export const importantCharacters = characterProfiles.filter((profile) => profile.importance === 'high').map((profile) => profile.name);

export const getCharacterProfile = (name) => characterProfiles.find((profile) => profile.name === name) || null;

export const getCharacterCategory = (name) => {
  const profile = getCharacterProfile(name);
  if (profile) {
    return profile.category;
  }
  if (name?.includes('Queen') || name?.includes('King')) {
    return 'royalty';
  }
  if (name?.includes('Lady') || name?.includes('Lord') || name?.includes('Duke')) {
    return 'noble';
  }
  return 'town';
};
