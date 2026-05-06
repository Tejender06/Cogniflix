/*
FILE: emotionMap.js

PURPOSE:
Provides mappings for emotion-based movie tagging.

FLOW:
Service -> Util -> Value Return

USED BY:
recommendation.service.js

NEXT FLOW:
None

*/
const emotionMap = {
  // Action / High Energy
  action: "intense",
  war: "intense",
  "martial arts": "intense",
  superhero: "intense",
  revenge: "intense",
  survival: "intense",
  
  // Tense / Dark
  thriller: "tense",
  suspense: "tense",
  crime: "dark",
  mafia: "dark",
  gangster: "dark",
  murder: "dark",
  noir: "dark",

  // Happy / Lighthearted
  comedy: "happy",
  family: "happy",
  kids: "happy",
  sitcom: "happy",
  parody: "funny",
  satire: "funny",
  slapstick: "funny",
  
  // Romance / Calm
  romance: "romantic",
  "romantic comedy": "romantic",
  love: "romantic",
  calm: "calm",
  peaceful: "calm",

  // Drama / Emotional
  drama: "emotional",
  tragedy: "emotional",
  heartbreaking: "emotional",
  tearjerker: "emotional",
  melodrama: "emotional",
  "coming of age": "nostalgic",

  // Adventure / Exciting
  adventure: "exciting",
  fantasy: "magical",
  "sci-fi": "mind-bending",
  "science fiction": "mind-bending",
  space: "mind-bending",
  cyberpunk: "mind-bending",
  supernatural: "magical",
  magic: "magical",
  epic: "epic",

  // Fear / Horror
  horror: "fear",
  scary: "fear",
  zombie: "fear",
  vampire: "fear",
  slasher: "fear",
  monster: "fear",
  gore: "fear",

  // Curiosity / Thought-provoking
  mystery: "curious",
  detective: "curious",
  investigation: "curious",
  documentary: "informative",
  biography: "informative",
  history: "historical",
  educational: "informative",
  
  // Musical / Arts
  music: "upbeat",
  musical: "upbeat",
  dance: "upbeat",
};

function mapToEmotion(genres = [], keywords = []) {
  const all = [
    ...genres.map(g => g.toLowerCase()),
    ...keywords.map(k => k.toLowerCase()),
  ];

  for (let tag of all) {
    if (emotionMap[tag]) return emotionMap[tag];
  }

  return "neutral";
}

export { mapToEmotion };