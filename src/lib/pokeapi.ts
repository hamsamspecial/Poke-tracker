import { API, CATEGORIES } from './constants';

export async function cachedFetch(url: string) {
  const key = 'poke:' + url;
  const cached = localStorage.getItem(key);
  if (cached) return JSON.parse(cached);
  const res = await fetch(url);
  if (!res.ok) throw new Error('PokeAPI error: ' + res.status);
  const data = await res.json();
  localStorage.setItem(key, JSON.stringify(data));
  return data;
}

export async function pickStarterByCategory(categoryKey: keyof typeof CATEGORIES) {
  const type = CATEGORIES[categoryKey].pokeType;
  const typeData = await cachedFetch(`${API}/type/${type}`);
  const list = typeData.pokemon.map((p: any) => p.pokemon);
  
  // Try up to 5 times to find a valid base species (to avoid mega/gmax forms that break the chain)
  for (let i = 0; i < 5; i++) {
    const chosen = list[Math.floor(Math.random() * list.length)];
    try {
      // Get the actual pokemon data
      const pokemonData = await cachedFetch(chosen.url);
      // Get the true base species url
      if (pokemonData.species && pokemonData.species.url) {
        const speciesData = await cachedFetch(pokemonData.species.url);
        if (speciesData.evolution_chain && speciesData.evolution_chain.url) {
          return speciesData.name; // return the true species name
        }
      }
    } catch (e) {
      console.warn("Retrying pickStarter...", e);
    }
  }
  // Fallback defaults if API fails
  const fallbacks: Record<string, string> = { fire: 'charmander', water: 'squirtle', grass: 'bulbasaur', electric: 'pikachu', psychic: 'abra', normal: 'eevee', fairy: 'clefairy', steel: 'magnemite' };
  return fallbacks[type] || 'eevee';
}

export async function getEvolutionStages(speciesName: string): Promise<string[]> {
  try {
    const species = await cachedFetch(`${API}/pokemon-species/${speciesName}`);
    const chainData = await cachedFetch(species.evolution_chain.url);

    const stages: string[] = [];
    let node = chainData.chain;
    while (node) {
      stages.push(node.species.name);
      node = node.evolves_to && node.evolves_to.length > 0 ? node.evolves_to[0] : null;
    }
    return stages;
  } catch (e) {
    console.error("Error in getEvolutionStages", e);
    return [speciesName]; // fallback to itself
  }
}

export function stageIndexFromStreak(streak: number, chainLength: number): number {
  let idx = 0;
  if (streak >= 3) idx = 1;
  if (streak >= 7) idx = 2;
  return Math.min(idx, chainLength - 1);
}

export async function getSprite(speciesName: string): Promise<string> {
  try {
    // We fetch the default variety of the species
    const species = await cachedFetch(`${API}/pokemon-species/${speciesName}`);
    const defaultVariety = species.varieties.find((v: any) => v.is_default)?.pokemon;
    const url = defaultVariety ? defaultVariety.url : `${API}/pokemon/${speciesName}`;
    
    const p = await cachedFetch(url);
    return p.sprites.other['official-artwork'].front_default || p.sprites.front_default;
  } catch (e) {
    console.error("Error fetching sprite for", speciesName, e);
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/pokemon-egg.png';
  }
}
