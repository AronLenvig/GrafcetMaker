/** A help page and, optionally, one of its sections (the English heading's anchor). */
export interface HelpTarget {
  page: string;
  anchor: string | null;
}

const at = (page: string, anchor: string | null = null): HelpTarget => ({ page, anchor });

/** Where F1 leads for each thing the user can be working on (contextHelp). */
export const HELP_TARGETS = {
  step: at('grafcet-basics', 'steps'),
  macroStep: at('hierarchy', 'macro-steps'),
  enclosingStep: at('hierarchy', 'enclosing-steps'),
  transition: at('grafcet-basics', 'transitions-and-receptivities'),
  orBranch: at('grafcet-basics', 'choosing-between-paths-or'),
  andBranch: at('grafcet-basics', 'doing-things-at-the-same-time-and'),
  continuousAction: at('actions', 'continuous-actions'),
  storedAction: at('actions', 'stored-actions'),
  actionWithoutStep: at('actions', 'actions-without-a-step'),
  forcing: at('hierarchy', 'forcing-orders'),
  comment: at('editing', 'comments-and-names'),
  link: at('editing', 'mouse'),
  severalElements: at('editing', 'properties-and-panels'),
  variable: at('variables'),
  simulation: at('simulation'),
  condition: at('expressions'),
  assignment: at('expressions', 'assignments-in-stored-actions'),
} as const satisfies Record<string, HelpTarget>;
