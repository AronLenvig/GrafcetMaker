/**
 * Diagrams of the website guide (<!-- figure: id | caption --> in docs/guide/<lang>.md), built like
 * the help figures with the editor's model and SVG exporter, in the words of each language.
 */
import { build } from '@/app/help/figures';
import type { Grafcet } from '@/core/model/types';
import type { Lang } from './locales';

interface Words {
  start: string;
  stop: string;
  motor: string;
  initialStep: string;
  transition: string;
  stepAction: string;
  loopBack: string;
  left: string;
  right: string;
  drill: string;
  clamp: string;
  done1: string;
  done2: string;
  lamp: string;
  horn: string;
  alarm: string;
  counter: string;
  reset: string;
  heater: string;
  end: string;
  macroNote: string;
}

// Receptivities and assignments must stay valid identifiers: ASCII letters, digits and _. Russian,
// Chinese and Hindi keep the English names: variables are usually named in English there.
const WORDS: Record<Lang, Words> = {
  en: {
    start: 'start',
    stop: 'stop',
    motor: 'Motor',
    initialStep: 'initial step',
    transition: 'transition + receptivity',
    stepAction: 'step with an action',
    loopBack: 'loop back (upward arrow)',
    left: 'Left',
    right: 'Right',
    drill: 'Drill',
    clamp: 'Clamp',
    done1: 'done1',
    done2: 'done2',
    lamp: 'Lamp',
    horn: 'Horn',
    alarm: 'alarm',
    counter: 'C',
    reset: 'reset',
    heater: 'Heater',
    end: 'end',
    macroNote: 'macro-step: its expansion\nis drawn on its own sheet',
  },
  fr: {
    start: 'dcy',
    stop: 'arret',
    motor: 'Moteur',
    initialStep: 'étape initiale',
    transition: 'transition + réceptivité',
    stepAction: 'étape et son action',
    loopBack: 'retour (flèche vers le haut)',
    left: 'Gauche',
    right: 'Droite',
    drill: 'Percer',
    clamp: 'Serrer',
    done1: 'fin1',
    done2: 'fin2',
    lamp: 'Lampe',
    horn: 'Klaxon',
    alarm: 'alarme',
    counter: 'C',
    reset: 'raz',
    heater: 'Chauffage',
    end: 'fin',
    macroNote: 'macro-étape : son expansion\nest dessinée à part',
  },
  de: {
    start: 'start',
    stop: 'stopp',
    motor: 'Motor',
    initialStep: 'Anfangsschritt',
    transition: 'Transition + Transitionsbedingung',
    stepAction: 'Schritt mit Aktion',
    loopBack: 'Rückführung (Pfeil nach oben)',
    left: 'Links',
    right: 'Rechts',
    drill: 'Bohren',
    clamp: 'Spannen',
    done1: 'fertig1',
    done2: 'fertig2',
    lamp: 'Lampe',
    horn: 'Hupe',
    alarm: 'alarm',
    counter: 'Z',
    reset: 'reset',
    heater: 'Heizung',
    end: 'ende',
    macroNote: 'Makroschritt: seine Expansion\nsteht auf einem eigenen Blatt',
  },
  es: {
    start: 'marcha',
    stop: 'paro',
    motor: 'Motor',
    initialStep: 'etapa inicial',
    transition: 'transición + receptividad',
    stepAction: 'etapa con una acción',
    loopBack: 'retorno (flecha hacia arriba)',
    left: 'Izquierda',
    right: 'Derecha',
    drill: 'Taladrar',
    clamp: 'Sujetar',
    done1: 'fin1',
    done2: 'fin2',
    lamp: 'Lampara',
    horn: 'Bocina',
    alarm: 'alarma',
    counter: 'C',
    reset: 'reset',
    heater: 'Calefactor',
    end: 'fin',
    macroNote: 'macroetapa: su expansión\nse dibuja en otra hoja',
  },
  da: {
    start: 'start',
    stop: 'stop',
    motor: 'Motor',
    initialStep: 'initialtrin',
    transition: 'transition + transitionsbetingelse',
    stepAction: 'trin med en aktion',
    loopBack: 'tilbageføring (pil opad)',
    left: 'Venstre',
    right: 'Hoejre',
    drill: 'Bor',
    clamp: 'Klem',
    done1: 'klar1',
    done2: 'klar2',
    lamp: 'Lampe',
    horn: 'Horn',
    alarm: 'alarm',
    counter: 'C',
    reset: 'reset',
    heater: 'Varme',
    end: 'slut',
    macroNote: 'makrotrin: dets ekspansion\ntegnes på et separat ark',
  },
  sv: {
    start: 'start',
    stop: 'stopp',
    motor: 'Motor',
    initialStep: 'initialsteg',
    transition: 'övergång + övergångsvillkor',
    stepAction: 'steg med en aktion',
    loopBack: 'återgång (pil uppåt)',
    left: 'Upp',
    right: 'Ned',
    drill: 'Borra',
    clamp: 'Fixera',
    done1: 'klar1',
    done2: 'klar2',
    lamp: 'Lampa',
    horn: 'Siren',
    alarm: 'alarm',
    counter: 'C',
    reset: 'reset',
    heater: 'Element',
    end: 'slut',
    macroNote: 'makrosteg: dess expansion\nritas på ett eget blad',
  },
  pt: {
    start: 'partida',
    stop: 'parada',
    motor: 'Motor',
    initialStep: 'etapa inicial',
    transition: 'transição + receptividade',
    stepAction: 'etapa com uma ação',
    loopBack: 'retorno (seta para cima)',
    left: 'Esquerda',
    right: 'Direita',
    drill: 'Furar',
    clamp: 'Fixar',
    done1: 'fim1',
    done2: 'fim2',
    lamp: 'Lampada',
    horn: 'Buzina',
    alarm: 'alarme',
    counter: 'C',
    reset: 'reset',
    heater: 'Aquecedor',
    end: 'fim',
    macroNote: 'macroetapa: sua expansão\né desenhada em folha própria',
  },
  pl: {
    start: 'start',
    stop: 'stop',
    motor: 'Silnik',
    initialStep: 'krok początkowy',
    transition: 'tranzycja + warunek',
    stepAction: 'krok z akcją',
    loopBack: 'powrót (strzałka w górę)',
    left: 'Lewo',
    right: 'Prawo',
    drill: 'Wiercenie',
    clamp: 'Zacisk',
    done1: 'kon1',
    done2: 'kon2',
    lamp: 'Lampa',
    horn: 'Syrena',
    alarm: 'alarm',
    counter: 'C',
    reset: 'reset',
    heater: 'Grzalka',
    end: 'koniec',
    macroNote: 'makrokrok: jego rozwinięcie\nrysuje się na osobnym arkuszu',
  },
  ru: {
    start: 'start',
    stop: 'stop',
    motor: 'Motor',
    initialStep: 'начальный шаг',
    transition: 'переход + условие перехода',
    stepAction: 'шаг с действием',
    loopBack: 'возврат (стрелка вверх)',
    left: 'Left',
    right: 'Right',
    drill: 'Drill',
    clamp: 'Clamp',
    done1: 'done1',
    done2: 'done2',
    lamp: 'Lamp',
    horn: 'Horn',
    alarm: 'alarm',
    counter: 'C',
    reset: 'reset',
    heater: 'Heater',
    end: 'end',
    macroNote: 'макрошаг: его развёртка\nизображается на отдельном листе',
  },
  zh: {
    start: 'start',
    stop: 'stop',
    motor: 'Motor',
    initialStep: '初始步',
    transition: '转换 + 转换条件',
    stepAction: '带动作的步',
    loopBack: '返回（向上箭头）',
    left: 'Left',
    right: 'Right',
    drill: 'Drill',
    clamp: 'Clamp',
    done1: 'done1',
    done2: 'done2',
    lamp: 'Lamp',
    horn: 'Horn',
    alarm: 'alarm',
    counter: 'C',
    reset: 'reset',
    heater: 'Heater',
    end: 'end',
    macroNote: '宏步：其展开图\n画在单独的图纸上',
  },
  hi: {
    start: 'start',
    stop: 'stop',
    motor: 'Motor',
    initialStep: 'प्रारंभिक स्टेप',
    transition: 'ट्रांज़िशन + रिसेप्टिविटी',
    stepAction: 'एक्शन वाला स्टेप',
    loopBack: 'लूप बैक (ऊपर की ओर तीर)',
    left: 'Left',
    right: 'Right',
    drill: 'Drill',
    clamp: 'Clamp',
    done1: 'done1',
    done2: 'done2',
    lamp: 'Lamp',
    horn: 'Horn',
    alarm: 'alarm',
    counter: 'C',
    reset: 'reset',
    heater: 'Heater',
    end: 'end',
    macroNote: 'मैक्रो-स्टेप: इसका विस्तार\nअलग शीट पर बनाया जाता है',
  },
};

export function guideFigures(lang: Lang): Record<string, () => Grafcet> {
  const w = WORDS[lang];
  return {
    /** The parts of a grafcet, labelled. */
    anatomy: () =>
      build((b) => {
        const s0 = b.step(0, 0, { kind: 'initial' });
        const s1 = b.step(1, 2, { actions: [['continuous', w.motor]] });
        b.tr([s0], [s1], w.start, 1);
        b.tr([s1], [s0], w.stop, 3);
        b.note(w.initialStep, 0, 170);
        b.note(w.transition, 1, 170);
        b.note(w.stepAction, 2, 270);
        b.note(w.loopBack, 3, 170);
      }),

    /** OR divergence and convergence: one of two branches. */
    or: () =>
      build((b) => {
        const s0 = b.step(0, 0, { kind: 'initial', x: 150 });
        const s1 = b.step(1, 2, { x: 100, actions: [['continuous', w.left]] });
        const s2 = b.step(2, 2, { x: 260, actions: [['continuous', w.right]] });
        const s3 = b.step(3, 4, { x: 150 });
        b.tr([s0], [s1], 'a', 1, 100);
        b.tr([s0], [s2], '/a * b', 1, 260);
        b.tr([s1], [s3], 'c', 3, 100);
        b.tr([s2], [s3], 'd', 3, 260);
      }),

    /** AND divergence and convergence: both branches at once. */
    and: () =>
      build((b) => {
        const s0 = b.step(0, 0, { kind: 'initial', x: 150 });
        const s1 = b.step(1, 2, { x: 100, actions: [['continuous', w.drill]] });
        const s2 = b.step(2, 2, { x: 260, actions: [['continuous', w.clamp]] });
        const s3 = b.step(3, 4, { x: 150 });
        b.tr([s0], [s1, s2], w.start, 1, 150);
        b.tr([s1, s2], [s3], `${w.done1} * ${w.done2}`, 3, 150);
      }),

    /** Continuous, conditional and stored actions on one step. */
    actions: () =>
      build((b) => {
        b.step(4, 0, {
          actions: [
            ['continuous', w.lamp],
            ['continuous', w.horn, w.alarm],
            ['storedOnActivation', `${w.counter} := ${w.counter} + 1`],
            ['storedOnEvent', `${w.counter} := 0`, `↑${w.reset}`],
          ],
        });
      }),

    /** A timer receptivity. */
    timer: () =>
      build((b) => {
        const s0 = b.step(0, 0, { kind: 'initial' });
        const s1 = b.step(1, 2, { actions: [['continuous', w.heater]] });
        b.tr([s0], [s1], `↑${w.start}`, 1);
        b.tr([s1], [s0], '5s/X1', 3);
      }),

    /** A macro-step in its grafcet. */
    macro: () =>
      build((b) => {
        const s0 = b.step(0, 0, { kind: 'initial' });
        const m = b.step(10, 2, { kind: 'macro' });
        b.tr([s0], [m], w.start, 1);
        b.tr([m], [s0], w.end, 3);
        b.note(w.macroNote, 2, 150);
      }),
  };
}
