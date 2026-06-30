export const TV_SERIAL_REGEX = '\\y(idol|roadies|bigg boss|splitsvilla|khatron ke khiladi|sa re ga ma pa|dance india dance|kapil sharma|masterchef|kbc|kaun banega crorepati|kaisa ye|rangrasiya|kumkum|kyunki|kahaani|kasautii|naagin|yeh rishta|tarak mehta|taarak mehta|cid|savdhaan|crime patrol)\\y';

export const EXPLICIT_REGEX = '\\y(sex|porn|porno|hentai|erotica|erotic|adult|lustful|lust|sensual|naked|prostitute|prostitutes|seduction|sexual|sexually|cuckold|perverted|stepdad|stepdaddy|stepmom|impregnates|incest)\\y';

export const REGION_LANGUAGE_MAP = {
  karnataka: 'kannada',
  maharashtra: 'marathi',
  tamilnadu: 'tamil',
  'tamil nadu': 'tamil',
  kerala: 'malayalam',
  andhra: 'telugu',
  'andhra pradesh': 'telugu',
  india: 'hindi',
};

export const RANKING_WEIGHTS = {
  behavior: 0.24,
  similarity: 0.2,
  popularity: 0.16,
  regional: 0.14,
  time: 0.1,
  emotion: 0.08,
  freshness: 0.05,
  exploration: 0.03,
};

export const GENRE_ROW_CONFIG = [
  ['Action', 'actionMovies', 'Action'],
  ['Comedy', 'comedyMovies', 'Comedy'],
  ['Thriller', 'thrillerMovies', 'Thriller'],
  ['Sci-Fi', 'sciFiMovies', 'Sci-Fi'],
  ['Romance', 'romanceMovies', 'Romance'],
  ['Horror', 'horrorMovies', 'Horror'],
  ['Family Movies', 'familyMovies', 'Family'],
];

export const MAX_CANDIDATE_LIMIT = 500;

