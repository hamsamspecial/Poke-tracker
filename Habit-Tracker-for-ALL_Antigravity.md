# Habit Tracker for ALL — 프로젝트 브리핑 (Antigravity 초기 지시서)

> 이 문서는 Antigravity가 프로젝트를 처음 시작할 때 읽는 **단일 기준 문서(source of truth)** 입니다.
> 코드를 생성하기 전에 이 문서의 "규칙"과 "고정 매핑"을 반드시 준수하세요.

---

## 0. 한 줄 정의
특수교육대상학생을 포함한 모두를 위한 습관 트래커. **3×3 변형 만다라트**로 목표를 시각화하고,
**PokéAPI**의 포켓몬(부화·진화·수집)을 보상 장치로 결합한다. 핵심 가치는 **쉽고 · 즉각적이고 · 좌절 없는 · 모으는 재미**.

---

## 1. 고정 규칙 (절대 변경 금지)

### 1.1 카테고리 ↔ 컬러 ↔ 포켓몬 타입 매핑
아래 5개는 **하드코딩 상수**로 관리한다. 색상 팔레트는 이 5색으로 제한한다.

| 카테고리(한글) | key | 컬러 | HEX | 포켓몬 타입 | type key |
|---|---|---|---|---|---|
| 생활 습관 | `life` | 빨강 | `#E3350D` | 불 | `fire` |
| 학습 습관 | `study` | 노랑 | `#F6C244` | 전기 | `electric` |
| 건강 습관 | `health` | 파랑 | `#2A75BB` | 물 | `water` |
| 마음챙김 습관 | `mind` | 초록 | `#3DA35D` | 풀 | `grass` |
| 도전 습관 | `challenge` | 보라 | `#8E5FBF` | 에스퍼 | `psychic` |

- 사용자가 각 만다라트 칸에 습관을 만들 때 **위 5개 카테고리 중 하나를 반드시 선택**한다.
- 부화하는 포켓몬은 **해당 카테고리의 타입에 속한 포켓몬만** 랜덤 배정한다.
  (예: 건강 습관 칸 → `/type/water`에서 나온 포켓몬만 부화)
- 누적 성취(도감) 화면의 색 구분도 이 5색만 사용한다.

### 1.2 접근성 규칙 (특수교육 우선)
- 한 화면에 **하나의 주요 행동**. 큰 버튼(최소 터치 영역 64×64px 이상).
- 글자 최소화, **색 + 아이콘 + 포켓몬 이미지**로 의미 전달.
- **성공만 강조**한다. 실패/미완료에 빨간 X, 경고음, 부정적 문구 금지.
- 진화는 **되돌아가지 않는다**(스트릭이 끊겨도 이미 진화한 포켓몬은 유지).
- 애니메이션은 **짧고 예측 가능**하게. 설정에서 사운드/애니메이션 **끄기 옵션** 제공.
- 음성 안내(TTS) + 효과음으로 보상을 청각적으로도 전달.

---

## 2. 기술 스택 & 인프라
- **프레임워크**: Next.js (App Router) + TypeScript + React
- **스타일**: Tailwind CSS (5색 팔레트를 theme에 등록)
- **상태/데이터**: 초기 버전은 로컬 저장(localStorage) → 이후 확장 시 DB
- **인증**: 초기엔 간단한 아이디/비밀번호(로컬) → 확장 시 NextAuth 등
- **외부 API**: PokéAPI `https://pokeapi.co/api/v2` (키·가입 불필요)
- **버전 관리**: GitHub
- **배포**: Vercel
- **캐싱**: PokéAPI 응답과 스프라이트는 반드시 로컬 캐싱(localStorage 또는 IndexedDB).
  같은 요청을 반복 호출하지 말 것(PokéAPI Fair Use 준수).

---

## 3. 화면 구성 & 와이어프레임

### 3.1 화면 흐름도
```
[로그인/가입] → [홈: 3×3 만다라트판] → [칸 탭] → [체크/부화·진화 화면]
                        │
                        ├─→ [도감(컬렉션)]
                        ├─→ [카테고리·습관 설정]  (3×3 ↔ 9×9 전환)
                        └─→ [설정: 사운드/애니메이션/접근성]
```

### 3.2 홈 — 3×3 만다라트판
```
┌─────────────────────────────────────────┐
│  ☰   Habit Tracker for ALL      🔊  ⚙️   │
├───────────────┬───────────────┬───────────┤
│  [학습·노랑]  │  [건강·파랑]  │ [생활·빨강] │
│   🥚→⚡포켓몬  │   🥚→💧포켓몬  │  🥚→🔥포켓몬 │
│   오늘 ✔      │   오늘 □      │  오늘 ✔     │
├───────────────┼───────────────┼───────────┤
│  [마음·초록]  │   ⭐ 파트너   │ [도전·보라] │
│   🥚→🌿포켓몬  │   (대표목표)  │  🥚→🔮포켓몬 │
│   오늘 □      │   진행 5/8    │  오늘 ✔     │
├───────────────┼───────────────┼───────────┤
│   [칸4]       │   [칸5]       │  [칸6]      │
│   ...         │   ...         │  ...        │
└───────────────┴───────────────┴───────────┘
  · 가운데 = 큰 목표 + 대표(파트너) 포켓몬
  · 바깥 8칸 = 매일 실천 습관. 각 칸에 알 또는 포켓몬 + 오늘 체크 상태
  · 칸 배경색 = 카테고리 컬러
```

### 3.3 체크 화면 (칸 탭 시)
```
┌─────────────────────────────────────────┐
│  ← 뒤로              [건강 습관 · 파랑]   │
├─────────────────────────────────────────┤
│                                           │
│            💧 (포켓몬 스프라이트)         │
│              "물 마시기"                  │
│           연속 3일 · 곧 진화!             │
│                                           │
│   ┌───────────────────────────────────┐  │
│   │                                   │  │
│   │         오늘 완료했어요!  ✔        │  │  ← 큰 버튼 1개
│   │                                   │  │
│   └───────────────────────────────────┘  │
│                                           │
│   (탭하면: 효과음 + 부화/진화 애니메이션) │
└─────────────────────────────────────────┘
```

### 3.4 부화 · 진화 애니메이션 시퀀스
```
 [알 흔들림 0.5s] → [빛 번쩍 0.3s] → [포켓몬 등장 + 이름 표시]
   → [TTS: "축하해요! OO가 나왔어요!"] → [도감에 추가]

 진화: [기존 포켓몬 빛에 감싸짐] → [실루엣 변화] → [진화형 등장]
   → [TTS: "OO가 △△로 진화했어요!"]
```

### 3.5 도감(컬렉션)
```
┌─────────────────────────────────────────┐
│  ← 뒤로            나의 도감  (12/50)     │
├─────────────────────────────────────────┤
│  [전체] [🔥불] [⚡전기] [💧물] [🌿풀] [🔮에스퍼]  │  ← 5타입 필터
├─────────────────────────────────────────┤
│  [🖼️] [🖼️] [🖼️] [🖼️]                    │
│  [🖼️] [🖼️] [❔] [❔]   ← 미획득은 실루엣  │
└─────────────────────────────────────────┘
```

### 3.6 카테고리·습관 설정
```
- 칸 선택 → 습관 이름 입력(그림/이모지 선택 가능) → 카테고리 5개 중 택1
- 카테고리 선택 시 컬러와 타입 자동 지정
- [3×3 모드] ↔ [9×9 모드] 토글 (9×9는 동일 로직 확장)
```

---

## 4. 데이터 모델 (초기 localStorage 스키마)

```ts
type CategoryKey = 'life' | 'study' | 'health' | 'mind' | 'challenge';

interface Category {
  key: CategoryKey;
  labelKo: string;   // "생활 습관"
  color: string;     // HEX
  pokeType: string;  // "fire" 등
}

interface Habit {
  id: string;
  title: string;         // "물 마시기"
  category: CategoryKey;
  cellIndex: number;     // 만다라트 칸 위치 (0~8 또는 0~80)
  streak: number;        // 현재 연속 성공 일수
  bestStreak: number;
  lastCheckedDate: string | null; // 'YYYY-MM-DD'
  pokemon: {
    chain: string[];       // 진화 계통 [기본형, 1차, 최종] species name
    currentStageIndex: number; // 0=기본,1=1차,2=최종
    hatched: boolean;
    spriteUrl: string;
  } | null;
}

interface UserData {
  userId: string;
  boardMode: '3x3' | '9x9';
  habits: Habit[];
  pokedex: string[]; // 획득한 species name 목록
}
```

---

## 5. PokéAPI 연동 & 진화 로직 (핵심 코드)

### 5.1 상수 정의
```ts
// lib/constants.ts
export const CATEGORIES = {
  life:      { labelKo: '생활 습관',   color: '#E3350D', pokeType: 'fire' },
  study:     { labelKo: '학습 습관',   color: '#F6C244', pokeType: 'electric' },
  health:    { labelKo: '건강 습관',   color: '#2A75BB', pokeType: 'water' },
  mind:      { labelKo: '마음챙김 습관', color: '#3DA35D', pokeType: 'grass' },
  challenge: { labelKo: '도전 습관',   color: '#8E5FBF', pokeType: 'psychic' },
} as const;

export const API = 'https://pokeapi.co/api/v2';
```

### 5.2 캐시 래퍼 (중복 호출 방지)
```ts
// lib/pokeapi.ts
async function cachedFetch(url: string) {
  const key = 'poke:' + url;
  const cached = localStorage.getItem(key);
  if (cached) return JSON.parse(cached);
  const res = await fetch(url);
  if (!res.ok) throw new Error('PokeAPI error: ' + res.status);
  const data = await res.json();
  localStorage.setItem(key, JSON.stringify(data));
  return data;
}
```

### 5.3 카테고리 타입에 맞는 포켓몬 랜덤 뽑기 (부화용)
```ts
import { API, CATEGORIES } from './constants';

// 해당 타입에서 "진화 전 기본형" 위주로 하나 랜덤 선택
export async function pickStarterByCategory(categoryKey: keyof typeof CATEGORIES) {
  const type = CATEGORIES[categoryKey].pokeType;      // 예: 'water'
  const typeData = await cachedFetch(`${API}/type/${type}`);
  const list = typeData.pokemon.map((p: any) => p.pokemon); // {name,url}[]
  const chosen = list[Math.floor(Math.random() * list.length)];
  return chosen.name; // species 후보
}
```

### 5.4 진화 계통 가져오기 → [기본형, 1차, 최종] 배열로 평탄화
```ts
// evolution-chain을 따라가며 최대 3단계 이름 배열 반환
export async function getEvolutionStages(speciesName: string): Promise<string[]> {
  const species = await cachedFetch(`${API}/pokemon-species/${speciesName}`);
  const chainData = await cachedFetch(species.evolution_chain.url);

  const stages: string[] = [];
  let node = chainData.chain;
  // 첫 번째 진화 경로만 따라감(분기 진화는 첫 갈래 사용)
  while (node) {
    stages.push(node.species.name);
    node = node.evolves_to && node.evolves_to.length > 0 ? node.evolves_to[0] : null;
  }
  return stages; // 예: ['squirtle','wartortle','blastoise']
}
```

### 5.5 스트릭 → 진화 단계 매핑 (동기부여 핵심)
```ts
// 규칙: 부화(체크 1회) = 기본형 / 3일 연속 = 1차 진화 / 7일 연속 = 최종형
export function stageIndexFromStreak(streak: number, chainLength: number): number {
  let idx = 0;                 // 기본형
  if (streak >= 3) idx = 1;    // 1차 진화
  if (streak >= 7) idx = 2;    // 최종 진화
  return Math.min(idx, chainLength - 1); // 진화 단계가 없는 포켓몬은 최대치로 clamp
}

// 스프라이트 URL 얻기
export async function getSprite(speciesName: string): Promise<string> {
  const p = await cachedFetch(`${API}/pokemon/${speciesName}`);
  // 특수교육 대상: 또렷한 도트 스프라이트 우선. 없으면 공식 아트워크.
  return p.sprites.front_default
      || p.sprites.other['official-artwork'].front_default;
}
```

### 5.6 "오늘 완료" 처리 흐름 (의사 코드)
```ts
async function completeToday(habit: Habit) {
  const today = todayStr();
  if (habit.lastCheckedDate === today) return; // 중복 방지

  // 연속 여부 판정
  habit.streak = isYesterday(habit.lastCheckedDate) ? habit.streak + 1 : 1;
  habit.bestStreak = Math.max(habit.bestStreak, habit.streak);
  habit.lastCheckedDate = today;

  // 아직 포켓몬이 없으면 부화
  if (!habit.pokemon) {
    const starter = await pickStarterByCategory(habit.category);
    const chain = await getEvolutionStages(starter);
    habit.pokemon = {
      chain, currentStageIndex: 0, hatched: true,
      spriteUrl: await getSprite(chain[0]),
    };
    playHatchAnimation(); speak(`축하해요! ${chain[0]}가 나왔어요!`);
    addToPokedex(chain[0]);
    return;
  }

  // 진화 체크
  const newIdx = stageIndexFromStreak(habit.streak, habit.pokemon.chain.length);
  if (newIdx > habit.pokemon.currentStageIndex) {
    const name = habit.pokemon.chain[newIdx];
    habit.pokemon.currentStageIndex = newIdx;
    habit.pokemon.spriteUrl = await getSprite(name);
    playEvolveAnimation(); speak(`${name}로 진화했어요!`);
    addToPokedex(name);
  }
  // 진화 없이 성공해도 항상 긍정 피드백
  else { playSuccessChime(); }
}
```

---

## 6. Antigravity 바이브코딩 프롬프트 세트
> 아래 프롬프트를 **순서대로** 하나씩 실행하게 하세요. 각 단계 완료 후 커밋.

### 프롬프트 1 — 프로젝트 골격
```
Next.js(App Router) + TypeScript + Tailwind로 "Habit Tracker for ALL" 웹앱을 초기화해줘.
GitHub 레포로 관리하고 Vercel 배포를 전제로 구성해줘.
lib/constants.ts에 이 문서의 CATEGORIES 5개(생활/학습/건강/마음챙김/도전)와
컬러·포켓몬 타입 매핑을 상수로 넣어줘. Tailwind theme에도 이 5색을 등록해줘.
```

### 프롬프트 2 — 만다라트 홈
```
3×3 만다라트 홈 화면을 만들어줘. 가운데 칸은 큰 목표+파트너 포켓몬,
바깥 8칸은 습관 칸이야. 각 칸 배경은 선택된 카테고리 컬러로 칠하고,
칸에는 알 또는 포켓몬 스프라이트와 "오늘 체크 상태"를 표시해.
칸을 탭하면 체크 화면으로 이동. 버튼은 크게(64px+), 글자보다 색/아이콘 중심으로.
나중에 9×9로 확장 가능하도록 boardMode('3x3'|'9x9') 상태를 둬.
```

### 프롬프트 3 — PokéAPI 연동
```
이 문서 5장의 코드를 기반으로 lib/pokeapi.ts를 구현해줘.
- pickStarterByCategory: 카테고리 타입(/type/{type})에서 포켓몬 랜덤 선택
- getEvolutionStages: /pokemon-species → /evolution-chain 따라가 [기본,1차,최종] 배열
- stageIndexFromStreak: 부화=기본, 3일=1차, 7일=최종
- 모든 fetch는 localStorage 캐시(cachedFetch)로 감싸 중복 호출 방지
```

### 프롬프트 4 — 체크 & 진화 애니메이션
```
체크 화면을 만들어줘. "오늘 완료했어요!" 큰 버튼 1개.
누르면 completeToday 로직 실행: 포켓몬 없으면 부화, 스트릭 조건 맞으면 진화.
부화/진화 시 짧은 애니메이션 + 효과음 + TTS 안내를 재생해.
실패/미완료에는 빨간 X나 경고를 절대 쓰지 말고, 성공만 축하해.
설정에서 사운드/애니메이션을 끌 수 있게 해줘.
```

### 프롬프트 5 — 도감 & 설정
```
도감(컬렉션) 화면: 획득 포켓몬 그리드, 미획득은 실루엣.
상단에 5타입(불/전기/물/풀/에스퍼) 필터 버튼. 색은 카테고리 5색 사용.
설정 화면: 사운드 on/off, 애니메이션 on/off, 글자 크기 옵션.
마지막으로 아이디/비밀번호 기반 간단 로그인(로컬)과 사용자별 데이터 분리를 붙여줘.
```

### 프롬프트 6 — 배포
```
GitHub에 푸시하고 Vercel 배포 설정을 안내해줘.
PokéAPI Fair Use를 위해 캐싱이 잘 동작하는지 점검하고,
포켓몬 이미지/캐릭터 저작권 주의 문구를 README에 넣어줘.
```

---

## 7. 범위 (In-Scope vs Out-of-Scope)

### In-Scope (할 것)
- 아이디/비밀번호 로그인 + 사용자별 데이터 분리(초기 로컬)
- 3×3 변형 만다라트 (카테고리·컬러 자유 설정, 단 컬러/타입은 5종 고정)
- 9×9 만다라트 확장 모드
- PokéAPI 연동 부화·진화·도감 시스템 (타입=카테고리 매핑)
- 접근성 UI(큰 버튼, 성공 강조, 사운드/TTS, 애니메이션 on/off)
- GitHub 관리 + Vercel 배포 + 응답 캐싱

### Out-of-Scope (안 할 것)
- 사용자 간 소셜/랭킹/친구 기능
- 결제·인앱 구매
- 포켓몬 캐릭터의 상업적 배포·수익화 (아래 저작권 주의)
- 완전한 오프라인 지원(초기엔 온라인 기반)
- AI 자동 목표 추천

---

## 8. 저작권 주의 (README에도 명시할 것)
- **PokéAPI 데이터**는 자유롭게 사용 가능하나, **포켓몬 캐릭터·이미지 자체는 닌텐도/게임프리크의 저작권**이다.
- 교육용·교실 내 사용은 무리 없으나, **정식 스토어 배포·상업화 시**에는 자체 오리지널 몬스터로 대체해야 한다.
- PokéAPI **Fair Use Policy** 준수: 응답을 반드시 캐싱하고 불필요한 반복 호출 금지.
