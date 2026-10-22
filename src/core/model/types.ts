import type { z } from 'zod';
import type {
  actionKindSchema,
  actionSchema,
  commentSchema,
  grafcetKindSchema,
  grafcetSchema,
  projectMetaSchema,
  projectSchema,
  stepKindSchema,
  stepSchema,
  transitionSchema,
  variableDirectionSchema,
  variableSchema,
  variableTypeSchema,
} from './schema';

export type Id = string;
export interface Point {
  x: number;
  y: number;
}

export type VariableType = z.infer<typeof variableTypeSchema>;
export type VariableDirection = z.infer<typeof variableDirectionSchema>;
export type Variable = z.infer<typeof variableSchema>;
export type StepKind = z.infer<typeof stepKindSchema>;
export type Step = z.infer<typeof stepSchema>;
export type Transition = z.infer<typeof transitionSchema>;
export type ActionKind = z.infer<typeof actionKindSchema>;
export type Action = z.infer<typeof actionSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type GrafcetKind = z.infer<typeof grafcetKindSchema>;
export type Grafcet = z.infer<typeof grafcetSchema>;
export type ProjectMeta = z.infer<typeof projectMetaSchema>;
export type Project = z.infer<typeof projectSchema>;

/** Kinds of selectable diagram elements inside one grafcet. */
export type ElementKind = 'step' | 'transition' | 'action' | 'comment';
