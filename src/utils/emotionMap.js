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
  action: "intense",
  war: "intense",
  thriller: "tense",
  crime: "dark",

  comedy: "happy",
  family: "happy",

  romance: "calm",
  drama: "emotional",

  adventure: "exciting",
  fantasy: "exciting",
  "sci-fi": "exciting",
  "science fiction": "exciting",

  horror: "fear",
  mystery: "curious",

  documentary: "informative",
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