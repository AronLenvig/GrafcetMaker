import type { Id, VariableDirection, VariableType } from '../model/types';

export type Severity = 'error' | 'warning' | 'info';

export type RuleId =
  | 'noInitialStep'
  | 'duplicateStepNumber'
  | 'emptyReceptivity'
  | 'missingEvent'
  | 'missingCondition'
  | 'unattachedAction'
  | 'parseError'
  | 'unknownVariable'
  | 'typeError'
  | 'stepReference'
  | 'writesInput'
  | 'forcingTarget'
  | 'unreachableStep'
  | 'deadEndStep'
  | 'nonExclusiveOr'
  | 'transientLoop'
  | 'parallelOutput'
  | 'macroEntryExit'
  | 'unusedVariable'
  | 'subgrafcetMissing'
  | 'subgrafcetShared'
  | 'subgrafcetUnused'
  | 'macroActions'
  | 'forcingCycle'
  /** Runtime problem reported by the simulator (transient loop). */
  | 'simulation';

export type QuickFix =
  | { kind: 'setReceptivity'; grafcetId: Id; transitionId: Id; value: string }
  | { kind: 'makeInitial'; grafcetId: Id; stepId: Id }
  | { kind: 'createVariable'; name: string; type: VariableType; direction: VariableDirection }
  | { kind: 'renumber'; grafcetId: Id }
  | { kind: 'deleteVariable'; variableId: Id };

export interface Issue {
  ruleId: RuleId;
  severity: Severity;
  /** i18n key of the message (problems.messages.* or expr.errors.*). */
  messageKey: string;
  params: Record<string, string>;
  grafcetId: Id | null;
  /** Elements to highlight; the first one is where a badge is drawn. */
  elementIds: Id[];
  /** For expression issues: which text of the element. */
  field?: 'receptivity' | 'text' | 'condition';
  quickFix?: QuickFix;
}

export const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
