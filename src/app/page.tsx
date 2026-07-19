'use client';

import { useState, useEffect } from 'react';
import { CATEGORIES } from '@/lib/constants';
import { Habit, CategoryKey } from '@/lib/types';
import { pickStarterByCategory, getEvolutionStages, getSprite, stageIndexFromStreak } from '@/lib/pokeapi';

// ── 카테고리 키 목록 (8방향 배치, 인덱스 4=중앙)
const BLOCK_CATEGORY_MAP: (CategoryKey | null)[] = [
  'life',      // 0: 좌상
  'study',     // 1: 상
  'health',    // 2: 우상
  'mind',      // 3: 좌
  null,        // 4: 중앙 (포켓볼)
  'challenge', // 5: 우
  'relation',  // 6: 좌하
  'leisure',   // 7: 하
  'economy',   // 8: 우하
];

// ── 카테고리 전체 정보 (constants에서 가져오되 타입 안전)
type CatInfo = {
  labelKo: string;
  color: string;
  emoji: string;
  egg: string;
};
const CAT = CATEGORIES as Record<string, CatInfo>;

// ── 포켓볼 SVG (중앙 코어) ─────────────────────────────────────────────────
function PokeballSVG({ size = 80 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width={size} height={size}
      style={{ filter: 'drop-shadow(0 4px 12px rgba(227,53,13,0.5))' }}>
      <circle cx="50" cy="50" r="47" fill="#1a1a2e" stroke="#FFD700" strokeWidth="2.5"/>
      <path d="M3 50 A47 47 0 0 1 97 50 Z" fill="#E3350D"/>
      <path d="M3 50 A47 47 0 0 0 97 50 Z" fill="#F0F0F0"/>
      <line x1="3" y1="50" x2="97" y2="50" stroke="#1a1a2e" strokeWidth="5.5"/>
      <circle cx="50" cy="50" r="16" fill="#1a1a2e"/>
      <circle cx="50" cy="50" r="11" fill="white" stroke="#1a1a2e" strokeWidth="2.5"/>
      <circle cx="50" cy="50" r="5" fill="#F5F0DC" stroke="#1a1a2e" strokeWidth="1.5"/>
      <ellipse cx="30" cy="28" rx="8" ry="5" fill="white" opacity="0.2" transform="rotate(-20,30,28)"/>
    </svg>
  );
}

// ── 알 이미지 컴포넌트 (실제 PNG 사용) ────────────────────────────────────
function EggImg({
  catKey, size = 48, dimmed = false, colorOverride
}: {
  catKey: string; size?: number; dimmed?: boolean; colorOverride?: string;
}) {
  const cat = CAT[catKey];
  const eggSrc = cat?.egg || '/egg-red.png';
  const color = colorOverride || cat?.color || '#fff';

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <img
        src={eggSrc}
        alt={`${cat?.labelKo || ''} 알`}
        width={size}
        height={size * 1.1}
        style={{
          objectFit: 'contain',
          filter: dimmed
            ? 'grayscale(0.3) brightness(0.8)'
            : `drop-shadow(0 3px 8px ${color}88)`,
          transition: 'all 0.2s',
        }}
      />
    </div>
  );
}

// ── 빈 셀 생성 ─────────────────────────────────────────────────────────────
const makeEmptyHabits = (n: number): Habit[] =>
  Array.from({ length: n }).map((_, i) => ({
    id: `h${i}`, title: '', category: 'life' as CategoryKey,
    cellIndex: i, streak: 0, bestStreak: 0, lastCheckedDate: null, pokemon: null,
  }));

const DEFAULT_HABITS = makeEmptyHabits(81);
const EGG_SPRITE = 'https://img.pokemondb.net/sprites/items/pokemon-egg.png';

type PokedexEntry = { name: string; spriteUrl: string };

// ── 메인 ───────────────────────────────────────────────────────────────────
export default function Home() {
  const [boardMode, setBoardMode] = useState<'3x3' | '9x9'>('3x3');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [pokedex, setPokedex] = useState<PokedexEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; desc: string; imgUrl: string | null } | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<CategoryKey>('life');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [isPokedexOpen, setIsPokedexOpen] = useState(false);

  useEffect(() => {
    const h = localStorage.getItem('poke_habits_v3');
    const d = localStorage.getItem('poke_dex_v2');
    setHabits(h ? JSON.parse(h) : DEFAULT_HABITS);
    if (d) setPokedex(JSON.parse(d));
    setLoading(false);
  }, []);

  const saveHabits = (hs: Habit[]) => {
    setHabits(hs);
    localStorage.setItem('poke_habits_v3', JSON.stringify(hs));
  };

  const addToPokedex = (name: string, spriteUrl: string) => {
    setPokedex(prev => {
      if (prev.some(p => p.name === name)) return prev;
      const next = [...prev, { name, spriteUrl }];
      localStorage.setItem('poke_dex_v2', JSON.stringify(next));
      return next;
    });
  };

  const openEdit = (idx: number, forceCat?: CategoryKey) => {
    const h = habits[idx];
    setEditTitle(h?.title || '');
    setEditCategory(forceCat || (h?.category as CategoryKey) || 'life');
    setEditingIndex(idx);
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const next = [...habits];
    next[editingIndex] = { ...next[editingIndex], title: editTitle || '새 목표', category: editCategory };
    saveHabits(next);
    setEditingIndex(null);
  };

  const completeToday = async (habit: Habit, idx: number) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const today = new Date().toLocaleDateString('sv-SE');
      if (habit.lastCheckedDate === today) {
        setModalData({ title: '완료!', desc: '오늘은 이미 했어요! 내일 또 해봐요! 😊', imgUrl: habit.pokemon?.spriteUrl || EGG_SPRITE });
        return;
      }
      const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE');
      const cons = habit.lastCheckedDate === yesterday;
      const nh = { ...habit };
      nh.streak = cons ? nh.streak + 1 : 1;
      nh.bestStreak = Math.max(nh.bestStreak, nh.streak);
      nh.lastCheckedDate = today;

      if (!nh.pokemon) {
        setModalData({ title: '알이 움직여요! 🥚✨', desc: '포켓몬이 태어나려 해요!', imgUrl: EGG_SPRITE });
        const starter = await pickStarterByCategory(nh.category);
        const chain = await getEvolutionStages(starter);
        const spriteUrl = await getSprite(chain[0]);
        nh.pokemon = { chain, currentStageIndex: 0, hatched: true, spriteUrl };
        addToPokedex(chain[0], spriteUrl);
        setTimeout(() => setModalData({ title: '🎉 태어났어요!', desc: `${chain[0].toUpperCase()}가 깨어났어요!`, imgUrl: spriteUrl }), 1500);
      } else {
        const newIdx = stageIndexFromStreak(nh.streak, nh.pokemon.chain.length);
        if (newIdx > nh.pokemon.currentStageIndex) {
          setModalData({ title: '오잉?! 🌟', desc: '포켓몬이 변하려 해요...!', imgUrl: nh.pokemon.spriteUrl });
          const name = nh.pokemon.chain[newIdx];
          nh.pokemon.currentStageIndex = newIdx;
          const newSprite = await getSprite(name);
          nh.pokemon.spriteUrl = newSprite;
          addToPokedex(name, newSprite);
          setTimeout(() => setModalData({ title: '진화! 🚀', desc: `${name.toUpperCase()}(으)로 진화했어요!`, imgUrl: newSprite }), 2000);
        } else {
          setModalData({ title: '잘했어요! 👍', desc: `${nh.streak}일 연속 성공!`, imgUrl: nh.pokemon.spriteUrl });
        }
      }
      const next = [...habits]; next[idx] = nh; saveHabits(next);
    } catch {
      setModalData({ title: '오류 😢', desc: '다시 눌러보세요.', imgUrl: null });
    } finally {
      setIsProcessing(false);
    }
  };

  const getRealIndex = (blockIdx: number, cellIdx: number) => {
    if (blockIdx === 4 && cellIdx === 4) return -1;
    if (blockIdx !== 4 && cellIdx === 4) return 36 + blockIdx;
    return blockIdx * 9 + cellIdx;
  };

  // ── 에너지 게이지 계산 헬퍼 ──────────────────────────────────────────────
  // 진화 기준: 3일→1진화, 7일→2진화 (stageIndexFromStreak과 동일)
  // 반환: { pct: 0~100, stage: 0|1|2, label, nextLabel, maxed }
  const calcEnergy = (streak: number, chainLen: number) => {
    if (chainLen <= 1) return { pct: 100, stage: 0, label: '최고 단계!', nextLabel: '', maxed: true };
    if (streak >= 7 && chainLen >= 3) return { pct: 100, stage: 2, label: '최고 단계!', nextLabel: '', maxed: true };
    if (streak >= 3) {
      // 2단계 진화 중 (3→7)
      const pct = Math.min(100, ((streak - 3) / 4) * 100);
      return { pct, stage: 1, label: `${streak - 3}/4일`, nextLabel: '2차 진화', maxed: false };
    }
    // 1단계 진화 중 (0→3)
    const pct = Math.min(100, (streak / 3) * 100);
    return { pct, stage: 0, label: `${streak}/3일`, nextLabel: '1차 진화', maxed: false };
  };

  // ── 3×3 기본 모드 렌더 (장애학생 친화 버전) ─────────────────────────────
  const render3x3 = () => {
    const cells = [...Array(9)].map((_, cellIdx) => {
      // 중앙 = 포켓볼
      if (cellIdx === 4) {
        return (
          <div key="center" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            borderRadius: 20, padding: 8,
            background: 'radial-gradient(circle, rgba(227,53,13,0.25) 0%, rgba(26,26,46,0.8) 100%)',
            border: '3px solid rgba(255,215,0,0.6)',
            boxShadow: '0 0 32px rgba(227,53,13,0.3)',
          }}>
            <PokeballSVG size={64} />
            <span style={{ marginTop: 6, fontSize: 13, fontWeight: 900, color: '#FFD700' }}>나의 목표</span>
          </div>
        );
      }

      const realIdx = getRealIndex(4, cellIdx);
      const catKey = BLOCK_CATEGORY_MAP[cellIdx] as CategoryKey;
      const cat = CAT[catKey];
      const habit = habits[realIdx];
      const today = new Date().toLocaleDateString('sv-SE');
      const done = habit?.lastCheckedDate === today;
      const hasPokemon = !!habit?.pokemon;

      // 에너지 게이지 계산
      const streak = habit?.streak || 0;
      const chainLen = habit?.pokemon?.chain.length || 3;
      const energy = hasPokemon ? calcEnergy(streak, chainLen) : null;

      // 게이지 색상: 단계별 그라데이션
      const gaugeColors = ['#4CAF50', '#FF9800', '#E040FB'];
      const gaugeColor = energy ? (gaugeColors[energy.stage] || gaugeColors[0]) : cat.color;

      return (
        <div
          key={cellIdx}
          onClick={() => habit?.title ? completeToday(habit, realIdx) : openEdit(realIdx, catKey)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
            borderRadius: 20, padding: '10px 8px 8px', cursor: 'pointer',
            background: done
              ? `linear-gradient(160deg, ${cat.color}55 0%, ${cat.color}22 100%)`
              : `linear-gradient(160deg, ${cat.color}1A 0%, rgba(26,26,46,0.6) 100%)`,
            border: `3px solid ${done ? cat.color : cat.color + '55'}`,
            boxShadow: done
              ? `0 6px 24px ${cat.color}66, inset 0 1px 0 rgba(255,255,255,0.15)`
              : `0 3px 12px rgba(0,0,0,0.4)`,
            transition: 'all 0.25s',
            position: 'relative', overflow: 'hidden', gap: 0,
          }}
        >
          {/* 배경 빛 효과 (완료 시) */}
          {done && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 18,
              background: `radial-gradient(circle at 50% 30%, ${cat.color}22 0%, transparent 70%)`,
              pointerEvents: 'none',
            }} />
          )}

          {/* 스트릭 뱃지 */}
          {streak > 0 && (
            <div style={{
              position: 'absolute', top: -8, left: -6,
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              color: '#1a1a2e', fontSize: 12, fontWeight: 900,
              padding: '3px 9px', borderRadius: 14,
              boxShadow: '0 3px 10px rgba(255,215,0,0.6)',
            }}>{streak}🔥</div>
          )}

          {/* 수정 버튼 */}
          {habit?.title && (
            <button
              onClick={e => { e.stopPropagation(); openEdit(realIdx, catKey); }}
              style={{
                position: 'absolute', top: 6, right: 6,
                background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8,
                padding: '2px 7px', fontSize: 12, cursor: 'pointer', color: 'white',
              }}
            >✏️</button>
          )}

          {/* 카테고리 뱃지 */}
          <div style={{
            fontSize: 11, fontWeight: 800, color: cat.color,
            background: 'rgba(0,0,0,0.45)', padding: '3px 12px', borderRadius: 20,
            marginBottom: 8, letterSpacing: '-0.3px', flexShrink: 0,
          }}>
            {cat.emoji} {cat.labelKo}
          </div>

          {/* ★ 포켓몬 or 알 이미지 (3x3에서 크게) */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', width: '100%',
          }}>
            {hasPokemon ? (
              <>
                {/* 포켓몬 뒤 광채 */}
                <div style={{
                  position: 'absolute', width: 80, height: 80, borderRadius: '50%',
                  background: `radial-gradient(circle, ${cat.color}44 0%, transparent 70%)`,
                  filter: 'blur(8px)',
                }} />
                <img
                  src={habit!.pokemon!.spriteUrl}
                  alt="pokemon"
                  style={{
                    width: 88, height: 88, objectFit: 'contain', position: 'relative',
                    filter: `drop-shadow(0 4px 14px ${cat.color}88)`,
                    animation: done ? 'pokeBounce 0.6s ease' : undefined,
                  }}
                />
              </>
            ) : (
              <EggImg catKey={catKey} size={58} />
            )}
          </div>

          {/* ★ 변신 에너지 게이지 (포켓몬 있을 때만) */}
          {energy && (
            <div style={{ width: '100%', marginTop: 6, marginBottom: 4 }}>
              {/* 라벨 행 */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 4,
              }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: gaugeColor }}>
                  ⚡ 변신 에너지
                </span>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>
                  {energy.maxed ? '✨ 만렙!' : `→ ${energy.nextLabel} (${energy.label})`}
                </span>
              </div>

              {/* 게이지 트랙 */}
              <div style={{
                width: '100%', height: 10, borderRadius: 10,
                background: 'rgba(0,0,0,0.4)',
                border: `1px solid ${gaugeColor}44`,
                overflow: 'hidden', position: 'relative',
              }}>
                {/* 게이지 fill */}
                <div style={{
                  height: '100%', borderRadius: 10,
                  width: `${energy.pct}%`,
                  background: `linear-gradient(90deg, ${gaugeColor}BB, ${gaugeColor})`,
                  boxShadow: `0 0 8px ${gaugeColor}88`,
                  transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {/* 빛 흐르는 애니메이션 */}
                  <div style={{
                    position: 'absolute', top: 0, left: '-100%', width: '60%', height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                    animation: 'gaugeShine 2s ease-in-out infinite',
                  }} />
                </div>

                {/* 만렙 반짝임 */}
                {energy.maxed && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(90deg, ${gaugeColor}CC, #fff8, ${gaugeColor}CC)`,
                    animation: 'gaugeShine 1.5s ease-in-out infinite',
                  }} />
                )}
              </div>

              {/* 단계 표시 점 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, paddingInline: 2 }}>
                {['1진화', '2진화', '완성'].map((lbl, i) => {
                  const reached = energy.stage > i || (energy.stage === i && energy.pct >= 100);
                  return (
                    <div key={lbl} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: reached ? gaugeColor : 'rgba(255,255,255,0.2)',
                        boxShadow: reached ? `0 0 6px ${gaugeColor}` : 'none',
                        transition: 'all 0.3s',
                      }} />
                      <span style={{ fontSize: 7, color: reached ? gaugeColor : 'rgba(255,255,255,0.25)', fontWeight: 700 }}>
                        {lbl}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 목표 이름 */}
          <div style={{
            fontSize: 12, fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: 1.3,
            padding: '4px 10px', borderRadius: 12, flexShrink: 0,
            background: habit?.title ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.08)',
            border: habit?.title ? 'none' : `1.5px dashed ${cat.color}77`,
            maxWidth: '95%', wordBreak: 'keep-all',
          }}>
            {habit?.title || (
              <span style={{ color: cat.color, opacity: 0.8 }}>+ 목표 입력</span>
            )}
          </div>

          {/* 완료 표시 */}
          {done && (
            <div style={{
              marginTop: 5, fontSize: 11, fontWeight: 900, color: '#4CAF50',
              background: 'rgba(76,175,80,0.2)', padding: '3px 12px', borderRadius: 20,
              flexShrink: 0,
            }}>✔ 오늘 완료!</div>
          )}
        </div>
      );
    });

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        gap: 12, width: '100%', height: '100%',
      }}>
        {cells}
      </div>
    );
  };

  // ── 9×9 만다라 모드 렌더 ────────────────────────────────────────────────
  const render9x9 = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: 'repeat(3, 1fr)',
      gap: 8, width: '100%', height: '100%',
    }}>
      {[0,1,2,3,4,5,6,7,8].map(blockIdx => {
        const blockCatKey = BLOCK_CATEGORY_MAP[blockIdx] as CategoryKey | null;
        const blockCat = blockCatKey ? CAT[blockCatKey] : null;
        const isCenter = blockIdx === 4;
        const isHighlighted = selectedCategory === null || isCenter || blockCatKey === selectedCategory;

        return (
          <div key={blockIdx} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gridTemplateRows: 'repeat(3, 1fr)',
            gap: 3, padding: 6, borderRadius: 18,
            background: isCenter
              ? 'rgba(255,215,0,0.08)'
              : `${blockCat?.color || '#fff'}14`,
            border: isCenter
              ? '2px solid rgba(255,215,0,0.4)'
              : `2px solid ${blockCat?.color || '#fff'}44`,
            opacity: isHighlighted ? 1 : 0.25,
            transition: 'all 0.3s',
          }}>
            {[...Array(9)].map((_, cellIdx) => {
              const realIdx = getRealIndex(blockIdx, cellIdx);

              // 포켓볼 중앙
              if (realIdx === -1) {
                return (
                  <div key={cellIdx} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 12,
                    background: 'radial-gradient(circle, rgba(227,53,13,0.2) 0%, rgba(26,26,46,0.9) 100%)',
                    border: '2px solid rgba(255,215,0,0.5)',
                  }}>
                    <PokeballSVG size={36} />
                    <span style={{ fontSize: 7, fontWeight: 900, color: '#FFD700', marginTop: 2 }}>목표</span>
                  </div>
                );
              }

              // 서브블록 중앙 (카테고리 미러)
              if (blockIdx !== 4 && cellIdx === 4) {
                const habit = habits[realIdx];
                return (
                  <div key={cellIdx} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 10, padding: 3,
                    background: `${blockCat?.color || '#fff'}33`,
                    border: `2px solid ${blockCat?.color || '#fff'}77`,
                    boxShadow: `0 0 10px ${blockCat?.color || '#fff'}33`,
                  }}>
                    {blockCatKey && <EggImg catKey={blockCatKey} size={20} />}
                    <span style={{
                      fontSize: 6, fontWeight: 800, color: blockCat?.color || 'white',
                      marginTop: 2, textAlign: 'center',
                      maxWidth: '95%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {habit?.title || `${blockCat?.emoji}${blockCat?.labelKo}`}
                    </span>
                  </div>
                );
              }

              // 일반 세부목표 셀
              const habit = habits[realIdx];
              const catKey = blockCatKey || (habit?.category as CategoryKey) || 'life';
              const cat = CAT[catKey];
              const today = new Date().toLocaleDateString('sv-SE');
              const done = habit?.lastCheckedDate === today;

              if (!habit?.title) {
                return (
                  <div key={cellIdx}
                    onClick={() => openEdit(realIdx, catKey)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 10, cursor: 'pointer',
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px dashed ${cat?.color || '#fff'}44`,
                      transition: 'all 0.2s',
                    }}>
                    {cat && <EggImg catKey={catKey} size={18} dimmed />}
                    <span style={{ fontSize: 6, color: 'rgba(255,255,255,0.25)', marginTop: 2, fontWeight: 700 }}>+ 추가</span>
                  </div>
                );
              }

              return (
                <div key={cellIdx}
                  onClick={() => completeToday(habit, realIdx)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 10, padding: 3, cursor: 'pointer', position: 'relative',
                    background: done
                      ? `${cat?.color || '#fff'}33`
                      : `${cat?.color || '#fff'}18`,
                    border: `1.5px solid ${done ? cat?.color || '#fff' : (cat?.color || '#fff') + '44'}`,
                    boxShadow: done ? `0 3px 12px ${cat?.color || '#fff'}44` : 'none',
                    transition: 'all 0.2s', overflow: 'hidden',
                  }}>
                  {/* 수정 버튼 */}
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(realIdx, catKey); }}
                    style={{
                      position: 'absolute', top: 1, right: 1,
                      background: 'rgba(255,255,255,0.2)', border: 'none',
                      borderRadius: 4, padding: '1px 3px', fontSize: 8, cursor: 'pointer', color: 'white',
                    }}
                    className="edit-btn"
                  >✏️</button>

                  {habit.streak > 0 && (
                    <div style={{
                      position: 'absolute', top: -3, left: -3,
                      background: '#FFD700', color: '#1a1a2e', fontSize: 7, fontWeight: 900,
                      padding: '1px 4px', borderRadius: 8,
                    }}>{habit.streak}🔥</div>
                  )}

                  {habit.pokemon
                    ? <img src={habit.pokemon.spriteUrl} alt="pokemon"
                        style={{ width: 24, height: 24, objectFit: 'contain', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}/>
                    : cat && <EggImg catKey={catKey} size={18} />
                  }

                  <span style={{
                    fontSize: 6, fontWeight: 700, color: cat?.color || 'white', textAlign: 'center',
                    background: 'rgba(0,0,0,0.4)', padding: '1px 4px', borderRadius: 5,
                    maxWidth: '95%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2,
                  }}>{habit.title}</span>

                  {done && <span style={{ fontSize: 7, color: '#4CAF50', marginTop: 1 }}>✔</span>}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      flexDirection: 'column', gap: 16,
    }}>
      <PokeballSVG size={72} />
      <p style={{ color: '#FFD700', fontSize: 18, fontWeight: 800 }}>불러오는 중...</p>
    </div>
  );

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
      padding: '12px 16px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Segoe UI', 'Noto Sans KR', sans-serif",
    }}>

      {/* ── 헤더 ── */}
      <header style={{
        width: '100%', maxWidth: 960, marginBottom: 14,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 18px', borderRadius: 20,
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,215,0,0.25)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PokeballSVG size={34} />
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#FFD700' }}>PokeTracker</h1>
            <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>만다라트 습관 관리</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setBoardMode(b => b === '3x3' ? '9x9' : '3x3')} style={{
            padding: '8px 14px', borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer',
            background: boardMode === '9x9' ? 'linear-gradient(135deg,#FFD700,#FFA500)' : 'rgba(255,255,255,0.12)',
            color: boardMode === '9x9' ? '#1a1a2e' : 'white',
            border: '1px solid rgba(255,215,0,0.35)', transition: 'all 0.2s',
          }}>
            {boardMode === '3x3' ? '🔲 9×9 만다라' : '🔳 3×3 기본'}
          </button>
          <button onClick={() => setIsPokedexOpen(true)} style={{
            padding: '8px 14px', borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer',
            background: 'linear-gradient(135deg,#E3350D,#FF6B35)', color: 'white', border: 'none',
            boxShadow: '0 4px 12px rgba(227,53,13,0.4)',
          }}>📖 도감 ({pokedex.length})</button>
        </div>
      </header>

      {/* ── 9×9 카테고리 필터 ── */}
      {boardMode === '9x9' && (
        <div style={{ width:'100%', maxWidth:960, marginBottom:12, display:'flex', gap:6, flexWrap:'wrap', justifyContent:'center' }}>
          <button onClick={() => setSelectedCategory(null)} style={{
            padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:800, cursor:'pointer',
            background: selectedCategory===null ? 'rgba(255,215,0,0.9)' : 'rgba(255,255,255,0.1)',
            color: selectedCategory===null ? '#1a1a2e' : 'rgba(255,255,255,0.6)',
            border:'1px solid rgba(255,215,0,0.3)', transition:'all 0.2s',
          }}>전체</button>
          {(Object.entries(CATEGORIES) as [CategoryKey, CatInfo][]).map(([k, c]) => (
            <button key={k} onClick={() => setSelectedCategory(selectedCategory===k ? null : k)} style={{
              padding:'5px 12px', borderRadius:20, fontSize:11, fontWeight:800, cursor:'pointer',
              background: selectedCategory===k ? c.color : 'rgba(255,255,255,0.08)',
              color: selectedCategory===k ? 'white' : 'rgba(255,255,255,0.6)',
              border:`1px solid ${c.color}66`, transition:'all 0.2s',
              boxShadow: selectedCategory===k ? `0 4px 12px ${c.color}66` : 'none',
            }}>{c.emoji} {c.labelKo}</button>
          ))}
        </div>
      )}

      {/* ── 만다라트 보드 ── */}
      <div style={{
        width: '100%', maxWidth: 960, aspectRatio: '1/1',
        padding: 14, borderRadius: 28,
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,215,0,0.18)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}>
        {boardMode === '3x3' ? render3x3() : render9x9()}
      </div>

      <p style={{ marginTop:16, color:'rgba(255,255,255,0.35)', fontSize:12, textAlign:'center' }}>
        칸을 누르면 포켓몬 알이 부화해요! 🥚 | PokeAPI 연동 완료
      </p>

      {/* ── 이벤트 모달 ── */}
      {modalData && (
        <div style={{
          position:'fixed', inset:0, zIndex:50,
          display:'flex', alignItems:'center', justifyContent:'center', padding:16,
          background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)',
        }} onClick={() => setModalData(null)}>
          <div style={{
            background:'rgba(26,26,46,0.97)', backdropFilter:'blur(24px)',
            border:'2px solid rgba(255,215,0,0.4)',
            padding:32, borderRadius:28, maxWidth:340, width:'100%',
            display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center',
            boxShadow:'0 24px 64px rgba(0,0,0,0.8)',
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin:'0 0 14px', fontSize:22, fontWeight:900, color:'#FFD700' }}>{modalData.title}</h2>
            {modalData.imgUrl && (
              <div style={{ position:'relative', width:130, height:130, marginBottom:14 }}>
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)' }}/>
                <img src={modalData.imgUrl} alt="event"
                  style={{ width:'100%', height:'100%', objectFit:'contain', filter:'drop-shadow(0 4px 12px rgba(255,215,0,0.5))' }}/>
              </div>
            )}
            <p style={{ margin:'0 0 22px', fontSize:15, color:'rgba(255,255,255,0.85)', fontWeight:600 }}>{modalData.desc}</p>
            <button onClick={() => setModalData(null)} style={{
              width:'100%', padding:'13px', borderRadius:16, border:'none',
              background:'linear-gradient(135deg,#E3350D,#FF6B35)', color:'white',
              fontWeight:900, fontSize:16, cursor:'pointer',
              boxShadow:'0 6px 20px rgba(227,53,13,0.5)',
            }}>확인</button>
          </div>
        </div>
      )}

      {/* ── 목표 편집 모달 ── */}
      {editingIndex !== null && (() => {
        const forcedCat = editCategory;
        const cat = CAT[forcedCat];
        return (
          <div style={{
            position:'fixed', inset:0, zIndex:50,
            display:'flex', alignItems:'center', justifyContent:'center', padding:16,
            background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)',
          }} onClick={() => setEditingIndex(null)}>
            <div style={{
              background:'rgba(26,26,46,0.98)', backdropFilter:'blur(24px)',
              border:`2px solid ${cat?.color || 'rgba(255,215,0,0.3)'}66`,
              padding:28, borderRadius:28, maxWidth:420, width:'100%',
              boxShadow:'0 24px 64px rgba(0,0,0,0.8)',
            }} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin:'0 0 6px', fontSize:20, fontWeight:900, color:'#FFD700' }}>🎯 목표 설정</h2>
              <p style={{ margin:'0 0 20px', fontSize:13, color:'rgba(255,255,255,0.45)' }}>
                칸에 목표를 적어보세요!
              </p>

              <label style={{ display:'block', fontSize:13, fontWeight:800, color:'rgba(255,255,255,0.55)', marginBottom:8 }}>
                ✏️ 목표 이름
              </label>
              <input
                type="text" value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => e.key==='Enter' && saveEdit()}
                autoFocus
                placeholder="예: 매일 물 한 잔 마시기"
                style={{
                  width:'100%', padding:'12px 16px', borderRadius:14, marginBottom:22,
                  background:'rgba(255,255,255,0.08)', border:'2px solid rgba(255,255,255,0.18)',
                  color:'white', fontSize:16, fontWeight:700, outline:'none', boxSizing:'border-box',
                }}
              />

              <label style={{ display:'block', fontSize:13, fontWeight:800, color:'rgba(255,255,255,0.55)', marginBottom:10 }}>
                🥚 카테고리 (포켓몬 종류)
              </label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8, marginBottom:24 }}>
                {(Object.entries(CATEGORIES) as [CategoryKey, CatInfo][]).map(([k, c]) => {
                  const isSelected = editCategory === k;
                  return (
                    <button key={k} onClick={() => setEditCategory(k)} style={{
                      padding:'10px 4px', borderRadius:14, fontSize:11, fontWeight:900, cursor:'pointer',
                      border:`2px solid ${c.color}`,
                      background: isSelected ? c.color : 'transparent',
                      color: isSelected ? 'white' : c.color,
                      transition:'all 0.2s',
                      display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                      boxShadow: isSelected ? `0 4px 14px ${c.color}66` : 'none',
                    }}>
                      <EggImg catKey={k} size={24} />
                      {c.labelKo}
                    </button>
                  );
                })}
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setEditingIndex(null)} style={{
                  flex:1, padding:'13px', borderRadius:14,
                  border:'1px solid rgba(255,255,255,0.18)', background:'transparent',
                  color:'rgba(255,255,255,0.55)', fontWeight:800, cursor:'pointer', fontSize:14,
                }}>취소</button>
                <button onClick={saveEdit} style={{
                  flex:2, padding:'13px', borderRadius:14, border:'none',
                  background:'linear-gradient(135deg,#FFD700,#FFA500)',
                  color:'#1a1a2e', fontWeight:900, cursor:'pointer', fontSize:15,
                  boxShadow:'0 6px 20px rgba(255,215,0,0.45)',
                }}>✓ 저장하기</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 도감 모달 ── */}
      {isPokedexOpen && (
        <div style={{
          position:'fixed', inset:0, zIndex:50,
          display:'flex', alignItems:'center', justifyContent:'center', padding:16,
          background:'rgba(0,0,0,0.65)', backdropFilter:'blur(8px)',
        }} onClick={() => setIsPokedexOpen(false)}>
          <div style={{
            background:'rgba(26,26,46,0.97)', backdropFilter:'blur(24px)',
            border:'2px solid rgba(255,215,0,0.3)', padding:28, borderRadius:28,
            maxWidth:680, width:'100%', maxHeight:'80vh',
            display:'flex', flexDirection:'column',
            boxShadow:'0 24px 64px rgba(0,0,0,0.8)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <h2 style={{ margin:0, fontSize:20, fontWeight:900, color:'#FFD700' }}>
                📖 나의 도감 ({pokedex.length}종)
              </h2>
              <button onClick={() => setIsPokedexOpen(false)} style={{
                width:34, height:34, borderRadius:'50%',
                border:'1px solid rgba(255,255,255,0.2)', background:'rgba(255,255,255,0.1)',
                color:'white', cursor:'pointer', fontSize:16,
              }}>✕</button>
            </div>
            <div style={{
              flex:1, overflowY:'auto',
              display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10,
            }}>
              {pokedex.map(e => (
                <div key={e.name} style={{
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  padding:12, borderRadius:16,
                  background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
                }}>
                  <img src={e.spriteUrl} alt={e.name}
                    onError={ev => { (ev.currentTarget as HTMLImageElement).src = EGG_SPRITE; }}
                    style={{ width:52, height:52, objectFit:'contain', filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.5))' }}/>
                  <span style={{ marginTop:6, fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.75)', textTransform:'capitalize' }}>
                    {e.name}
                  </span>
                </div>
              ))}
              {!pokedex.length && (
                <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,0.3)' }}>
                  아직 포켓몬이 없어요! 🥚<br/>습관을 완료하면 나타나요!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        div:hover > .edit-btn { opacity: 1 !important; }
        .edit-btn { opacity: 0; transition: opacity 0.2s; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,215,0,0.3); border-radius: 3px; }
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(255,255,255,0.3); }

        @keyframes gaugeShine {
          0%   { transform: translateX(-100%); }
          60%  { transform: translateX(300%); }
          100% { transform: translateX(300%); }
        }
        @keyframes pokeBounce {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.18) rotate(-4deg); }
          60%  { transform: scale(0.95) rotate(3deg); }
          100% { transform: scale(1); }
        }
        @keyframes eggWiggle {
          0%,100% { transform: rotate(0deg); }
          25%  { transform: rotate(-6deg); }
          75%  { transform: rotate(6deg); }
        }
      `}</style>
    </main>
  );
}
