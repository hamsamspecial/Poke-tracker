export const CATEGORIES = {
  life:      { labelKo: '생활',  color: '#E3350D', pokeType: 'fire',     emoji: '🏠', egg: '/egg-red.png'    },
  study:     { labelKo: '학습',  color: '#F6C244', pokeType: 'electric', emoji: '📚', egg: '/egg-yellow.png' },
  health:    { labelKo: '건강',  color: '#2A75BB', pokeType: 'water',    emoji: '💪', egg: '/egg-blue.png'   },
  mind:      { labelKo: '마음',  color: '#3DA35D', pokeType: 'grass',    emoji: '🧘', egg: '/egg-green.png'  },
  challenge: { labelKo: '도전',  color: '#8E5FBF', pokeType: 'psychic',  emoji: '⚡', egg: '/egg-purple.png' },
  relation:  { labelKo: '관계',  color: '#FF7F50', pokeType: 'normal',   emoji: '🤝', egg: '/egg-orange.png' },
  leisure:   { labelKo: '여가',  color: '#FF69B4', pokeType: 'fairy',    emoji: '🎨', egg: '/egg-pink.png'   },
  economy:   { labelKo: '경제',  color: '#20B2AA', pokeType: 'steel',    emoji: '💰', egg: '/egg-navy.png'   },
} as const;

export const API = 'https://pokeapi.co/api/v2';
