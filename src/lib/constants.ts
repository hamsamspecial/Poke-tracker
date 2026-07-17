export const CATEGORIES = {
  life:      { labelKo: '생활 습관',   color: '#E3350D', pokeType: 'fire' },
  study:     { labelKo: '학습 습관',   color: '#F6C244', pokeType: 'electric' },
  health:    { labelKo: '건강 습관',   color: '#2A75BB', pokeType: 'water' },
  mind:      { labelKo: '마음챙김 습관', color: '#3DA35D', pokeType: 'grass' },
  challenge: { labelKo: '도전 습관',   color: '#8E5FBF', pokeType: 'psychic' },
} as const;

export const API = 'https://pokeapi.co/api/v2';
