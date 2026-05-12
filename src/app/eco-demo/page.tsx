"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Bird,
  CheckCircle2,
  Droplets,
  Eye,
  MonitorUp,
  MousePointer2,
  Recycle,
  Sparkles,
  Sprout,
  SunMedium,
  Trees,
  Volume2,
  VolumeX,
  Waves
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./EcoDemo.module.css";

type HotspotKey = "river" | "forest" | "animals" | "sky" | "trash";
type ActionKey = "plant" | "water" | "cleanup" | "habitat";
type HypothesisKey = "less-rain" | "fewer-trees" | "pollution" | "no-habitat";
type CauseKey = "fewer-trees" | "hot-ground" | "water-loss" | "animals-leave";
type SoundEffect = "discover" | "select" | "place" | "confirm" | "repair" | "error";
type AudioState = {
  context: AudioContext;
  master: GainNode;
  musicTimer: number | null;
  noteIndex: number;
};

const hotspots: Array<{
  key: HotspotKey;
  label: string;
  short: string;
  clue: string;
  image: string;
  icon: typeof Waves;
}> = [
  {
    key: "river",
    label: "河流",
    short: "水位变低",
    clue: "河边露出了干裂的泥土，小鱼只能待在很浅的水里。",
    image: "/eco-demo/clue-river.svg",
    icon: Waves
  },
  {
    key: "forest",
    label: "森林",
    short: "树变少了",
    clue: "岛中央少了很多树，地面被太阳晒得很热。",
    image: "/eco-demo/clue-forest.svg",
    icon: Trees
  },
  {
    key: "animals",
    label: "动物",
    short: "动物离开",
    clue: "小鸟很少停下来，因为它们找不到合适的休息地方。",
    image: "/eco-demo/clue-animals.svg",
    icon: Bird
  },
  {
    key: "sky",
    label: "天空",
    short: "雨云很薄",
    clue: "天空有云，但雨很少，植物需要更多水分。",
    image: "/eco-demo/clue-sky.svg",
    icon: SunMedium
  },
  {
    key: "trash",
    label: "河岸垃圾",
    short: "垃圾堆在河边",
    clue: "河岸边有塑料和纸盒，垃圾可能会影响水源，也会让动物不敢靠近。",
    image: "/eco-demo/action-cleanup.svg",
    icon: Recycle
  }
];

const hypotheses: Array<{ key: HypothesisKey; label: string; detail: string }> = [
  { key: "less-rain", label: "下雨变少", detail: "河流和植物都缺水。" },
  { key: "fewer-trees", label: "树木减少", detail: "土地更热，也更难保住水分。" },
  { key: "pollution", label: "水边垃圾", detail: "垃圾会影响水源和动物。" },
  { key: "no-habitat", label: "栖息地不足", detail: "动物没有安全停留的位置。" }
];

const causeCards: Array<{
  key: CauseKey;
  title: string;
  detail: string;
  icon: typeof Trees;
}> = [
  { key: "fewer-trees", title: "树变少", detail: "树荫减少，土地更容易变热。", icon: Trees },
  { key: "hot-ground", title: "土地变热", detail: "水分蒸发更快，植物更难恢复。", icon: SunMedium },
  { key: "water-loss", title: "河水变少", detail: "鱼和植物都缺少水分。", icon: Waves },
  { key: "animals-leave", title: "动物离开", detail: "没有水、树荫和安全休息点。", icon: Bird }
];

const causeOrder: CauseKey[] = ["fewer-trees", "hot-ground", "water-loss", "animals-leave"];

const actions: Array<{
  key: ActionKey;
  title: string;
  effect: string;
  targetLabel: string;
  score: number;
  image: string;
  icon: typeof Sprout;
}> = [
  {
    key: "plant",
    title: "种下树苗",
    effect: "树林变密，土地开始降温。",
    targetLabel: "森林空地",
    score: 28,
    image: "/eco-demo/action-plant.svg",
    icon: Sprout
  },
  {
    key: "water",
    title: "保护水源",
    effect: "河水恢复，小鱼有了活动空间。",
    targetLabel: "干浅河道",
    score: 26,
    image: "/eco-demo/action-water.svg",
    icon: Droplets
  },
  {
    key: "cleanup",
    title: "清理垃圾",
    effect: "河岸变干净，动物敢靠近水边。",
    targetLabel: "河岸垃圾",
    score: 22,
    image: "/eco-demo/action-cleanup.svg",
    icon: Recycle
  },
  {
    key: "habitat",
    title: "搭建鸟巢",
    effect: "小鸟回到岛上，生态更热闹。",
    targetLabel: "高高树枝",
    score: 24,
    image: "/eco-demo/action-habitat.svg",
    icon: Bird
  }
];

const hotspotPositions: Record<HotspotKey, { left: number; top: number }> = {
  river: { left: 52.5, top: 61.5 },
  forest: { left: 35.5, top: 55.5 },
  animals: { left: 70.5, top: 48.5 },
  sky: { left: 70, top: 18 },
  trash: { left: 69.5, top: 73 }
};

const repairTargets: Record<ActionKey, { left: number; top: number }> = {
  plant: { left: 35.5, top: 63 },
  water: { left: 52.5, top: 73 },
  cleanup: { left: 68.5, top: 73 },
  habitat: { left: 73, top: 52 }
};

const initialReason = "我觉得树少了以后，土地会变热，水也更容易变少，所以要先种树并保护水源。";

export default function EcoDemoPage() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioState | null>(null);
  const [observed, setObserved] = useState<HotspotKey[]>([]);
  const [hypothesis, setHypothesis] = useState<HypothesisKey>("fewer-trees");
  const [causeChain, setCauseChain] = useState<CauseKey[]>([]);
  const [appliedActions, setAppliedActions] = useState<ActionKey[]>([]);
  const [studentReason, setStudentReason] = useState(initialReason);
  const [selectedCause, setSelectedCause] = useState<CauseKey | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionKey | null>(null);
  const [draggingLens, setDraggingLens] = useState(false);
  const [lens, setLens] = useState({ left: 22, top: 27 });
  const [coachNote, setCoachNote] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(false);

  const restorationScore = Math.min(
    100,
    appliedActions.reduce((sum, actionKey) => sum + (actions.find((action) => action.key === actionKey)?.score ?? 0), 12)
  );
  const activeHypothesis = hypotheses.find((item) => item.key === hypothesis) ?? hypotheses[0];
  const latestClue = observed.length ? hotspots.find((item) => item.key === observed[observed.length - 1]) : null;
  const stage = getStage(observed.length, causeChain.length, appliedActions.length);
  const aiQuestion = useMemo(
    () => buildAiQuestion(observed.length, causeChain, hypothesis, appliedActions, studentReason, coachNote),
    [observed.length, causeChain, hypothesis, appliedActions, studentReason, coachNote]
  );

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio?.musicTimer) window.clearInterval(audio.musicTimer);
      void audio?.context.close();
    };
  }, []);

  function ensureAudio() {
    if (typeof window === "undefined") return null;
    if (audioRef.current) return audioRef.current;
    const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    const context = new AudioCtor();
    const master = context.createGain();
    master.gain.value = 0.42;
    master.connect(context.destination);
    audioRef.current = { context, master, musicTimer: null, noteIndex: 0 };
    return audioRef.current;
  }

  function playTone(audio: AudioState, frequency: number, duration: number, volume: number, delay = 0, type: OscillatorType = "sine") {
    const startAt = audio.context.currentTime + delay;
    const oscillator = audio.context.createOscillator();
    const gain = audio.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(audio.master);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.05);
  }

  function playSound(effect: SoundEffect) {
    if (!soundEnabled) return;
    const audio = ensureAudio();
    if (!audio) return;
    void audio.context.resume();
    if (effect === "discover") {
      playTone(audio, 659, 0.16, 0.12, 0, "triangle");
      playTone(audio, 880, 0.22, 0.1, 0.12, "triangle");
    } else if (effect === "select") {
      playTone(audio, 523, 0.12, 0.06, 0, "sine");
    } else if (effect === "place") {
      playTone(audio, 523, 0.13, 0.07, 0, "triangle");
      playTone(audio, 659, 0.14, 0.07, 0.1, "triangle");
      playTone(audio, 784, 0.18, 0.06, 0.2, "triangle");
    } else if (effect === "confirm") {
      playTone(audio, 392, 0.08, 0.1, 0, "square");
      playTone(audio, 784, 0.16, 0.12, 0.08, "triangle");
      playTone(audio, 1046, 0.28, 0.1, 0.2, "triangle");
    } else if (effect === "repair") {
      [523, 659, 784, 1046].forEach((frequency, index) => playTone(audio, frequency, 0.2, 0.07, index * 0.09, "triangle"));
    } else {
      playTone(audio, 220, 0.12, 0.05, 0, "sawtooth");
      playTone(audio, 174, 0.18, 0.04, 0.09, "sawtooth");
    }
  }

  function startMusic(audio: AudioState) {
    if (audio.musicTimer) return;
    const playPhrase = () => {
      const phrases = [
        [392, 494, 587],
        [440, 523, 659],
        [392, 523, 587],
        [330, 392, 494]
      ];
      const phrase = phrases[audio.noteIndex % phrases.length];
      phrase.forEach((frequency, index) => playTone(audio, frequency, 0.58, 0.032, index * 0.2, "triangle"));
      playTone(audio, phrase[0] / 2, 1.4, 0.018, 0, "sine");
      audio.noteIndex += 1;
    };
    playPhrase();
    audio.musicTimer = window.setInterval(playPhrase, 2600);
  }

  async function toggleSound() {
    const audio = ensureAudio();
    if (!audio) return;
    if (soundEnabled) {
      if (audio.musicTimer) window.clearInterval(audio.musicTimer);
      audio.musicTimer = null;
      setSoundEnabled(false);
      return;
    }
    await audio.context.resume();
    setSoundEnabled(true);
    startMusic(audio);
    playTone(audio, 587, 0.18, 0.08, 0, "triangle");
    playTone(audio, 784, 0.26, 0.07, 0.16, "triangle");
  }

  function collectObservation(key: HotspotKey) {
    const alreadyObserved = observed.includes(key);
    setObserved((current) => (current.includes(key) ? current : [...current, key]));
    const clue = hotspots.find((item) => item.key === key);
    setCoachNote(clue ? `发现线索：${clue.short}。把它放进证据板，再找下一条证据。` : "");
    if (!alreadyObserved) playSound("discover");
  }

  function updateLensFromPointer(clientX: number, clientY: number) {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = clamp(((clientX - rect.left) / rect.width) * 100, 8, 92);
    const top = clamp(((clientY - rect.top) / rect.height) * 100, 10, 90);
    setLens({ left, top });
  }

  function collectNearestHotspot() {
    const nearest = hotspots
      .map((hotspot) => {
        const position = hotspotPositions[hotspot.key];
        return {
          hotspot,
          distance: Math.hypot(position.left - lens.left, position.top - lens.top)
        };
      })
      .sort((a, b) => a.distance - b.distance)[0];

    if (nearest && nearest.distance < 13) {
      collectObservation(nearest.hotspot.key);
    } else {
      setCoachNote("放大镜还没靠近线索。试着拖到闪光问号附近。");
    }
  }

  function selectCauseCard(key: CauseKey) {
    if (observed.length < 2) {
      setCoachNote("先收集至少两条观察证据，再开始排原因链。");
      playSound("error");
      return;
    }
    if (causeChain.includes(key)) return;
    const card = causeCards.find((item) => item.key === key);
    setSelectedCause(key);
    setCoachNote(card ? `已拿起「${card.title}」。现在把它放到下面高亮的空槽里。` : "");
    playSound("select");
  }

  function placeCauseInSlot(slotIndex: number, droppedKey?: CauseKey) {
    const key = droppedKey ?? selectedCause;
    if (!key) {
      setCoachNote("先选择一张原因卡，再把它放进下面的空槽。");
      playSound("error");
      return;
    }
    if (causeChain.includes(key)) return;
    if (slotIndex !== causeChain.length) {
      setCoachNote("请按顺序放入原因卡：先填最上面的空槽。");
      playSound("error");
      return;
    }
    const expected = causeOrder[slotIndex];
    if (key !== expected) {
      const card = causeCards.find((item) => item.key === key)?.title ?? "这张卡";
      setCoachNote(`${card}暂时不能放在第 ${slotIndex + 1} 位。先想一想：哪件事更早发生？`);
      playSound("error");
      return;
    }
    setCauseChain((current) => [...current, key]);
    setSelectedCause(null);
    setCoachNote(slotIndex === causeOrder.length - 1 ? "因果链完成了。现在把修复工具投放到小岛上。" : "放入成功。继续拿起下一张原因卡，再放到下一个空槽。");
    playSound("place");
  }

  function selectActionCard(actionKey: ActionKey) {
    setSelectedAction(actionKey);
    const action = actions.find((item) => item.key === actionKey);
    setCoachNote(action ? `已拿起「${action.title}」。小岛上「${action.targetLabel}」已经高亮，点那个目标完成投放。` : "");
    playSound("select");
    window.setTimeout(() => {
      sceneRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }

  function applyAction(actionKey: ActionKey) {
    setAppliedActions((current) => (current.includes(actionKey) ? current : [...current, actionKey]));
    setSelectedAction(actionKey);
    const action = actions.find((item) => item.key === actionKey);
    setCoachNote(action ? `${action.title}成功，小岛马上发生变化：${action.effect}` : "");
    playSound("repair");
  }

  function handleTargetAction(targetKey: ActionKey, droppedKey?: ActionKey) {
    const actionKey = droppedKey ?? selectedAction;
    if (!actionKey) {
      setCoachNote("先选择一张修复工具卡，再点小岛上的目标区域。");
      playSound("error");
      return;
    }
    if (actionKey !== targetKey) {
      const selected = actions.find((item) => item.key === actionKey)?.title ?? "这个工具";
      const target = actions.find((item) => item.key === targetKey)?.targetLabel ?? "这里";
      setCoachNote(`${selected}不太适合放在${target}。换一个目标试试看。`);
      playSound("error");
      return;
    }
    playSound("confirm");
    applyAction(actionKey);
  }

  function resetDemo() {
    setObserved([]);
    setHypothesis("fewer-trees");
    setCauseChain([]);
    setAppliedActions([]);
    setSelectedCause(null);
    setSelectedAction(null);
    setDraggingLens(false);
    setLens({ left: 22, top: 27 });
    setCoachNote("");
    setStudentReason(initialReason);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <span>路演 Demo</span>
          <h1>AI 生态探险课：拯救小岛生态</h1>
          <p>拖动放大镜找证据，排列生态因果链，再把修复工具投放到小岛上，完成一节可投屏展示的互动科学课。</p>
        </div>
        <div className={styles.headerMascot} aria-hidden="true">
          <img src="/eco-demo/mascot.svg" alt="" />
          <div>
            <strong>小岛能量站</strong>
            <span>{restorationScore}%</span>
          </div>
        </div>
        <nav>
          <Link href="/preview">
            <ArrowLeft size={18} /> 返回预览
          </Link>
          <button className={styles.soundButton} type="button" aria-pressed={soundEnabled} onClick={toggleSound}>
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            {soundEnabled ? "声音已开" : "开启声音"}
          </button>
          <button type="button" onClick={resetDemo}>重置课堂</button>
        </nav>
      </header>

      <section className={styles.flowStrip} aria-label="课堂流程">
        <FlowStep active={stage === "observe"} done={observed.length >= 2} index="01" title="放大镜观察" />
        <FlowStep active={stage === "reason"} done={causeChain.length === causeOrder.length} index="02" title="证据推理" />
        <FlowStep active={stage === "repair"} done={appliedActions.length === actions.length} index="03" title="动手修复" />
        <FlowStep active={stage === "summary"} done={stage === "summary"} index="04" title="投屏成果" />
      </section>

      <section className={styles.board}>
        <aside className={styles.leftRail}>
          <div className={styles.stepCard}>
            <span className={styles.stepIndex}>01</span>
            <h2>我的发现</h2>
            <p>拖动放大镜到小岛上的闪光问号，至少收集 2 条证据。</p>
            <div className={styles.clueList}>
              {hotspots.map((hotspot) => {
                const Icon = hotspot.icon;
                const isObserved = observed.includes(hotspot.key);
                return (
                  <div
                    className={isObserved ? styles.clueItemActive : styles.clueItem}
                    key={hotspot.key}
                    data-testid={`observe-${hotspot.key}`}
                  >
                    <img className={styles.clueImage} src={hotspot.image} alt="" aria-hidden="true" />
                    <span className={styles.clueIcon}><Icon size={18} /></span>
                    <span>{hotspot.label}</span>
                    <strong>{isObserved ? hotspot.short : "待观察"}</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.stepCard}>
            <span className={styles.stepIndex}>02</span>
            <h2>原因连线</h2>
            <p>按生态变化的先后顺序，把原因卡放进链条里。</p>
            <div className={styles.causeDeck}>
              {causeCards.map((item) => {
                const Icon = item.icon;
                const used = causeChain.includes(item.key);
                const selected = selectedCause === item.key;
                return (
                  <button
                    className={used ? styles.causeCardUsed : selected ? styles.causeCardSelected : styles.causeCard}
                    disabled={used || observed.length < 2}
                    draggable={!used && observed.length >= 2}
                    key={item.key}
                    type="button"
                    data-testid={`cause-${item.key}`}
                    aria-pressed={selected}
                    onClick={() => selectCauseCard(item.key)}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", item.key);
                      selectCauseCard(item.key);
                    }}
                  >
                    <Icon size={18} />
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </button>
                );
              })}
            </div>
            <div className={styles.causeChain} aria-label="生态因果链">
              {causeOrder.map((key, index) => {
                const item = causeCards.find((card) => card.key === causeChain[index]);
                const isNextSlot = !item && index === causeChain.length;
                return (
                  <button
                    className={item ? styles.chainSlotFilled : isNextSlot && selectedCause ? styles.chainSlotReady : styles.chainSlot}
                    key={key}
                    type="button"
                    data-testid={`cause-slot-${index + 1}`}
                    onClick={() => placeCauseInSlot(index)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      placeCauseInSlot(index, event.dataTransfer.getData("text/plain") as CauseKey);
                    }}
                  >
                    <span>{index + 1}</span>
                    <strong>{item ? item.title : "等待放入"}</strong>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className={styles.stagePanel}>
          <div className={styles.stageTop}>
            <div>
              <span>生态恢复进度</span>
              <strong>{restorationScore}%</strong>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressBar} style={{ width: `${restorationScore}%` }} />
            </div>
          </div>

          <div ref={sceneRef} className={styles.islandScene} aria-label="生态小岛互动场景">
            <div className={styles.sceneRibbon}>
              <Sparkles size={16} />
              <span>{stage === "observe" ? `已发现 ${observed.length}/${hotspots.length} 条线索` : stage === "repair" ? "投放修复工具" : "观察小岛变化"}</span>
            </div>
            <EcoIsland appliedActions={appliedActions} restorationScore={restorationScore} />

            {hotspots.map((hotspot) => {
              const isObserved = observed.includes(hotspot.key);
              return (
                <div
                  className={isObserved ? styles.hotspotButtonObserved : styles.hotspotButton}
                  key={hotspot.key}
                  style={{ left: `${hotspotPositions[hotspot.key].left}%`, top: `${hotspotPositions[hotspot.key].top}%` }}
                  data-testid={`hotspot-${hotspot.key}`}
                  role="img"
                  aria-label={`观察${hotspot.label}`}
                >
                  <span className={styles.hotspotPulse} />
                  <span className={styles.hotspotDot}>{isObserved ? "✓" : "?"}</span>
                </div>
              );
            })}

            {actions.map((action) => {
              const applied = appliedActions.includes(action.key);
              const selected = selectedAction === action.key;
              return (
                <button
                  className={applied ? styles.repairTargetDone : selected ? styles.repairTargetSelected : styles.repairTarget}
                  key={action.key}
                  style={{ left: `${repairTargets[action.key].left}%`, top: `${repairTargets[action.key].top}%` }}
                  type="button"
                  data-testid={`target-${action.key}`}
                  aria-label={`投放到${action.targetLabel}`}
                  onClick={() => handleTargetAction(action.key)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleTargetAction(action.key, event.dataTransfer.getData("text/plain") as ActionKey);
                  }}
                >
                  {applied ? <CheckCircle2 size={20} /> : <MousePointer2 size={18} />}
                  <span>{action.targetLabel}</span>
                </button>
              );
            })}

            <button
              className={draggingLens ? styles.lensDragging : styles.lens}
              style={{ left: `${lens.left}%`, top: `${lens.top}%` }}
              type="button"
              aria-label="拖动放大镜观察小岛"
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setDraggingLens(true);
                updateLensFromPointer(event.clientX, event.clientY);
              }}
              onPointerMove={(event) => {
                if (draggingLens) updateLensFromPointer(event.clientX, event.clientY);
              }}
              onPointerUp={(event) => {
                event.currentTarget.releasePointerCapture(event.pointerId);
                updateLensFromPointer(event.clientX, event.clientY);
                setDraggingLens(false);
                collectNearestHotspot();
              }}
            >
              <Eye size={30} />
            </button>
            {observed.length === 0 && (
              <div
                className={styles.lensBubble}
                style={{ left: `calc(${lens.left}% + 56px)`, top: `calc(${lens.top}% - 64px)` }}
              >
                拖动放大镜到问号上找线索
              </div>
            )}
          </div>

          <div className={styles.liveClue}>
            <MousePointer2 size={18} />
            <span>{latestClue ? latestClue.clue : "拖动放大镜靠近问号，松手后就能收集第一条线索。"}</span>
          </div>
        </section>

        <aside className={styles.rightRail}>
          <div className={styles.stepCard}>
            <span className={styles.stepIndex}>03</span>
            <h2>修复工具箱</h2>
            <p>拖一张工具卡到小岛目标点，或先点工具再点目标点。</p>
            <div className={styles.actionGrid}>
              {actions.map((action) => {
                const Icon = action.icon;
                const applied = appliedActions.includes(action.key);
                const selected = selectedAction === action.key;
                return (
                  <button
                    className={applied ? styles.actionApplied : selected ? styles.actionSelected : styles.actionCard}
                    draggable
                    key={action.key}
                    type="button"
                    data-testid={`tool-${action.key}`}
                    aria-pressed={selected}
                    onClick={() => selectActionCard(action.key)}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", action.key);
                      selectActionCard(action.key);
                    }}
                  >
                    <Icon size={20} />
                    <img className={styles.actionImage} src={action.image} alt="" aria-hidden="true" />
                    <strong>{action.title}</strong>
                    <span>{applied ? action.effect : `目标：${action.targetLabel}`}</span>
                    {selected && !applied && <em className={styles.actionNudge}>去小岛点「{action.targetLabel}」</em>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.stepCard}>
            <span className={styles.stepIndex}>猜想</span>
            <h2>我的判断</h2>
            <div className={styles.hypothesisGrid}>
              {hypotheses.map((item) => (
                <button
                  className={item.key === hypothesis ? styles.hypothesisActive : styles.hypothesis}
                  key={item.key}
                  type="button"
                  onClick={() => setHypothesis(item.key)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.aiCoach}>
            <div>
              <img className={styles.aiAvatar} src="/eco-demo/mascot.svg" alt="" aria-hidden="true" />
              <span>
                <Sparkles size={18} />
                <strong>AI 探险导师</strong>
              </span>
            </div>
            <p>{aiQuestion}</p>
          </div>

          <label className={styles.reasonBox}>
            我的解释
            <textarea value={studentReason} onChange={(event) => setStudentReason(event.target.value)} />
          </label>
        </aside>
      </section>

      <section className={styles.bigScreen}>
        <div>
          <span><MonitorUp size={18} /> 大屏投屏预览</span>
          <h2>我的生态修复方案</h2>
          <p>路演时可以投屏展示学生收集的证据、因果链、修复行动和 AI 追问。</p>
        </div>
        <div className={styles.screenStats}>
          <div><strong>{observed.length}/{hotspots.length}</strong><span>证据卡</span></div>
          <div><strong>{causeChain.length}/4</strong><span>因果链</span></div>
          <div><strong>{appliedActions.length}/4</strong><span>修复行动</span></div>
          <div><strong>{activeHypothesis.label}</strong><span>当前猜想</span></div>
        </div>
      </section>
    </main>
  );
}

function FlowStep({ active, done, index, title }: { active: boolean; done: boolean; index: string; title: string }) {
  return (
    <div className={done ? styles.flowStepDone : active ? styles.flowStepActive : styles.flowStep}>
      <span>{done ? "✓" : index}</span>
      <strong>{title}</strong>
    </div>
  );
}

function EcoIsland({
  appliedActions,
  restorationScore
}: {
  appliedActions: ActionKey[];
  restorationScore: number;
}) {
  const hasTrees = appliedActions.includes("plant");
  const hasWater = appliedActions.includes("water");
  const isClean = appliedActions.includes("cleanup");
  const hasHabitat = appliedActions.includes("habitat");
  const isHealthy = restorationScore > 70;

  return (
    <svg className={styles.islandSvg} viewBox="0 0 940 620" role="img" aria-label="可互动生态小岛">
      <defs>
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff4a8" />
          <stop offset="100%" stopColor="#f7b84b" />
        </radialGradient>
        <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8ee6ff" />
          <stop offset="58%" stopColor="#baf4ff" />
          <stop offset="100%" stopColor="#ecfbff" />
        </linearGradient>
        <linearGradient id="ground" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={restorationScore > 60 ? "#a8e675" : "#bad36b"} />
          <stop offset="100%" stopColor={restorationScore > 60 ? "#65be5d" : "#8fb656"} />
        </linearGradient>
        <linearGradient id="dryGround" x1="0" x2="1">
          <stop offset="0%" stopColor="#d7bd63" />
          <stop offset="100%" stopColor="#b99247" />
        </linearGradient>
      </defs>

      <rect width="940" height="620" rx="30" fill="url(#sky)" />
      <circle className={styles.sun} cx="790" cy="105" r="48" fill="url(#sunGlow)" />
      <g className={styles.clouds} fill="#ffffff" opacity=".88">
        <ellipse cx="185" cy="95" rx="46" ry="22" />
        <ellipse cx="228" cy="90" rx="34" ry="28" />
        <ellipse cx="270" cy="102" rx="52" ry="24" />
        <ellipse cx="600" cy="78" rx="44" ry="20" />
        <ellipse cx="642" cy="72" rx="32" ry="26" />
        <ellipse cx="678" cy="84" rx="48" ry="22" />
      </g>

      <path
        d="M0 384 C100 345 185 366 274 344 C390 315 501 345 610 333 C733 319 830 348 940 326 V620 H0 Z"
        fill="url(#ground)"
      />
      <path
        d="M0 463 C108 414 222 431 336 412 C473 390 580 422 712 398 C803 382 875 396 940 378 V620 H0 Z"
        fill="#4aa85e"
        opacity={isHealthy ? ".68" : ".34"}
      />
      <path
        d="M164 486 C220 387 329 354 461 365 C609 377 721 445 742 548 C588 595 334 600 164 486 Z"
        fill="url(#dryGround)"
        opacity={restorationScore > 60 ? ".28" : ".72"}
      />
      <path
        d="M173 488 C240 407 349 384 471 395 C594 406 676 458 708 534"
        fill="none"
        stroke="#f5e1a3"
        strokeWidth="12"
        strokeLinecap="round"
        opacity=".62"
      />

      <path
        className={hasWater ? styles.riverFull : styles.riverLow}
        d="M430 330 C482 374 552 390 559 456 C567 531 491 557 486 620"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M430 330 C482 374 552 390 559 456 C567 531 491 557 486 620" fill="none" stroke="#d7f8ff" strokeWidth="8" strokeLinecap="round" opacity=".55" />

      <g className={styles.treeGroup}>
        <Tree x={255} y={414} healthy={hasTrees} />
        <Tree x={334} y={375} healthy={hasTrees} />
        <Tree x={647} y={385} healthy={hasTrees} />
        <Tree x={725} y={426} healthy={hasTrees} />
        {hasTrees && (
          <>
            <Tree x={420} y={404} healthy />
            <Tree x={764} y={480} healthy />
            <Tree x={189} y={492} healthy />
            <Tree x={555} y={356} healthy />
          </>
        )}
      </g>

      {!isClean && (
        <g className={styles.trash}>
          <rect x="616" y="488" width="34" height="20" rx="4" fill="#ef7a62" />
          <rect x="660" y="470" width="25" height="18" rx="3" fill="#f3d36b" />
          <circle cx="640" cy="452" r="10" fill="#7456d8" />
        </g>
      )}

      <g className={hasWater ? styles.fishShow : styles.fishHide}>
        <Fish x={520} y={456} />
        <Fish x={498} y={548} />
      </g>

      <g className={hasHabitat ? styles.birdsShow : styles.birdsHide}>
        <BirdShape x={668} y={246} />
        <BirdShape x={734} y={292} />
        <circle cx="675" cy="354" r="18" fill="#b2773e" />
        <circle cx="675" cy="354" r="9" fill="#f5e7c1" />
      </g>

      {hasWater && (
        <g className={styles.rain} stroke="#dff7ff" strokeWidth="5" strokeLinecap="round">
          <line x1="594" y1="118" x2="578" y2="156" />
          <line x1="638" y1="113" x2="622" y2="151" />
          <line x1="682" y1="122" x2="666" y2="160" />
        </g>
      )}

      {isHealthy && (
        <g className={styles.sparkleBurst} fill="#fff7a6">
          <path d="M214 220l8 18 18 8-18 8-8 18-8-18-18-8 18-8z" />
          <path d="M725 368l7 14 14 7-14 7-7 14-7-14-14-7 14-7z" />
          <path d="M572 150l6 12 12 6-12 6-6 12-6-12-12-6 12-6z" />
        </g>
      )}
    </svg>
  );
}

function Tree({ x, y, healthy }: { x: number; y: number; healthy: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-8" y="18" width="16" height="34" rx="4" fill="#876443" />
      <circle cx="0" cy="8" r={healthy ? 30 : 22} fill={healthy ? "#2f9f63" : "#8d8b52"} />
      <circle cx="-18" cy="17" r={healthy ? 20 : 14} fill={healthy ? "#47b879" : "#9b9359"} />
      <circle cx="18" cy="18" r={healthy ? 20 : 14} fill={healthy ? "#48bf7a" : "#a5965e"} />
    </g>
  );
}

function Fish({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="0" rx="18" ry="9" fill="#ffcf5c" />
      <path d="M-18 0 L-31 -10 L-31 10 Z" fill="#ffb347" />
      <circle cx="8" cy="-2" r="2" fill="#24405f" />
    </g>
  );
}

function BirdShape({ x, y }: { x: number; y: number }) {
  return (
    <path d={`M${x} ${y} q18 -18 36 0 q-18 -8 -36 0 q-18 -8 -36 0 q18 -18 36 0`} fill="none" stroke="#24405f" strokeWidth="6" strokeLinecap="round" />
  );
}

function getStage(observedCount: number, causeCount: number, actionCount: number) {
  if (observedCount < 2) return "observe";
  if (causeCount < causeOrder.length) return "reason";
  if (actionCount < actions.length) return "repair";
  return "summary";
}

function buildAiQuestion(
  observedCount: number,
  causeChain: CauseKey[],
  hypothesis: HypothesisKey,
  actionsApplied: ActionKey[],
  reason: string,
  coachNote: string
) {
  if (coachNote) return coachNote;
  if (observedCount < 2) return "先拖动放大镜找至少两个观察线索。你能比较一下河流和森林发生了什么变化吗？";
  if (causeChain.length < causeOrder.length) return "证据已经够了。先点一张原因卡把它拿起来，再放到下面的空槽里。";
  if (!reason.trim()) return "因果链完成了。请用一句话解释：你为什么这样判断？";
  if (actionsApplied.length === 0) return "现在进入修复任务。先选一张工具卡，再把它放到小岛上合适的位置。";
  if (hypothesis === "pollution" && !actionsApplied.includes("cleanup")) return "如果你认为水边垃圾是原因，可以试试把清理工具放到河岸垃圾区。";
  if (actionsApplied.length < 3) return "小岛正在恢复。你还能补充一个不同类型的修复方案，让水、树和动物同时受益吗？";
  if (actionsApplied.length < actions.length) return "已经很接近完整修复了。最后检查：动物回来还需要什么安全停留点？";
  return "你的方案已经完整。路演时可以让 AI 追问：哪一条观察证据最能支持你的修复选择？";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
