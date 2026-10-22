import { z } from 'zod';
import { IDENT_RE, LIMITS, SCHEMA_VERSION } from './constants';

// Strict CSP forbids eval/new Function: disable Zod's JIT so it never probes for it.
z.config({ jitless: true });

export { IDENT_RE, LIMITS, SCHEMA_VERSION };

const id = z.string().min(1).max(LIMITS.idLength);
const point = z.object({ x: z.number(), y: z.number() });
const shortText = z.string().max(LIMITS.shortText);
const longText = z.string().max(LIMITS.longText);
const expression = z.string().max(LIMITS.expression);
const identifier = z.string().max(LIMITS.nameLength).regex(IDENT_RE);
const stepNumber = z.int().min(0).max(999_999);

export const variableTypeSchema = z.enum(['BOOL', 'INT', 'REAL', 'TIME']);
export const variableDirectionSchema = z.enum(['input', 'output', 'internal']);

export const variableSchema = z.object({
  id,
  name: identifier,
  type: variableTypeSchema,
  direction: variableDirectionSchema,
  /** BOOL → boolean; INT/REAL → number; TIME → milliseconds. */
  initialValue: z.union([z.boolean(), z.number()]).optional(),
  address: shortText.optional(),
  comment: longText.optional(),
});

export const stepKindSchema = z.enum(['normal', 'initial', 'macro', 'enclosing']);

export const stepSchema = z.object({
  id,
  number: stepNumber,
  kind: stepKindSchema,
  label: shortText.optional(),
  /** Center of the step square, in diagram units. */
  position: point,
  /** Expansion grafcet of a macro-step, or grafcet enclosed by an enclosing step. */
  refGrafcetId: id.optional(),
});

export const transitionSchema = z.object({
  id,
  number: stepNumber.optional(),
  /** Upstream steps. [] = source transition. 2+ = AND convergence. */
  from: z.array(id).max(256),
  /** Downstream steps. [] = sink transition. 2+ = AND divergence. */
  to: z.array(id).max(256),
  receptivity: expression,
  /** Center of the transition bar, in diagram units. */
  position: point,
  /** Manual routing: x of the vertical segment used by upward (loop) links of this transition. */
  routing: z.object({ sideX: z.number().optional() }).optional(),
});

export const actionKindSchema = z.enum([
  'continuous',
  'storedOnActivation',
  'storedOnDeactivation',
  'storedOnEvent',
  'forcing',
]);

export const actionSchema = z.object({
  id,
  /** The step it belongs to, or null for an action not attached to any step (never executed). */
  stepId: id.nullable(),
  /** Top-left corner of an unattached action (attached actions are placed right of their step). */
  position: point.optional(),
  /** Display order within the step's action list (left to right). */
  order: z.int().min(0),
  kind: actionKindSchema,
  /** continuous: output name · stored: `X := expr` · forcing: `G2{8}`. */
  text: expression,
  /** continuous: assignment condition · storedOnEvent: the event · others: optional guard. */
  condition: expression.optional(),
});

export const commentSchema = z.object({
  id,
  text: longText,
  /** Top-left corner of the comment box. */
  position: point,
});

export const grafcetKindSchema = z.enum(['partial', 'macroExpansion', 'enclosed']);

export const grafcetSchema = z.object({
  id,
  name: identifier,
  kind: grafcetKindSchema,
  steps: z.record(z.string(), stepSchema),
  transitions: z.record(z.string(), transitionSchema),
  actions: z.record(z.string(), actionSchema),
  comments: z.record(z.string(), commentSchema),
});

/** Recorded input changes, replayed by the simulator (virtual time in ms from the start). */
export const scenarioEventSchema = z.object({
  t: z.number().min(0),
  name: identifier,
  value: z.union([z.boolean(), z.number()]),
});

export const scenarioSchema = z.object({
  id,
  name: shortText,
  events: z.array(scenarioEventSchema).max(100_000),
});

export const projectMetaSchema = z.object({
  author: shortText,
  company: shortText,
  revision: shortText,
  createdAt: z.string().max(64),
  updatedAt: z.string().max(64),
});

const projectShape = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id,
  name: z.string().min(1).max(200),
  meta: projectMetaSchema,
  variables: z.record(z.string(), variableSchema),
  grafcets: z.record(z.string(), grafcetSchema),
  grafcetOrder: z.array(id),
  scenarios: z.record(z.string(), scenarioSchema).optional(),
});

type ProjectShape = z.infer<typeof projectShape>;

/** Referential integrity: a file that passes this can be rendered and edited without crashes. */
function checkIntegrity(p: ProjectShape, ctx: z.RefinementCtx): void {
  const issue = (message: string, path: (string | number)[]) =>
    ctx.addIssue({ code: 'custom', message, path });

  let elements = 0;
  const seenNames = new Map<string, string>();
  for (const [key, v] of Object.entries(p.variables)) {
    if (key !== v.id) issue(`Variable key "${key}" does not match its id`, ['variables', key]);
    const lower = v.name.toLowerCase();
    if (seenNames.has(lower)) issue(`Duplicate variable name "${v.name}"`, ['variables', key]);
    seenNames.set(lower, key);
  }

  const order = new Set(p.grafcetOrder);
  if (order.size !== p.grafcetOrder.length)
    issue('grafcetOrder contains duplicates', ['grafcetOrder']);
  for (const key of Object.keys(p.grafcets)) {
    if (!order.has(key)) issue(`Grafcet "${key}" missing from grafcetOrder`, ['grafcetOrder']);
  }
  for (const gid of p.grafcetOrder) {
    if (!p.grafcets[gid])
      issue(`grafcetOrder references unknown grafcet "${gid}"`, ['grafcetOrder']);
  }

  const grafcetNames = new Set<string>();
  for (const [gid, g] of Object.entries(p.grafcets)) {
    const at = ['grafcets', gid];
    if (gid !== g.id) issue(`Grafcet key "${gid}" does not match its id`, at);
    if (grafcetNames.has(g.name.toLowerCase())) issue(`Duplicate grafcet name "${g.name}"`, at);
    grafcetNames.add(g.name.toLowerCase());

    for (const [sid, s] of Object.entries(g.steps)) {
      elements++;
      if (sid !== s.id) issue(`Step key "${sid}" does not match its id`, [...at, 'steps', sid]);
      if (s.refGrafcetId !== undefined && !p.grafcets[s.refGrafcetId]) {
        issue(`Step references unknown grafcet "${s.refGrafcetId}"`, [...at, 'steps', sid]);
      }
    }
    for (const [tid, t] of Object.entries(g.transitions)) {
      elements++;
      const tAt = [...at, 'transitions', tid];
      if (tid !== t.id) issue(`Transition key "${tid}" does not match its id`, tAt);
      for (const side of ['from', 'to'] as const) {
        if (new Set(t[side]).size !== t[side].length) issue(`Duplicate step in "${side}"`, tAt);
        for (const sid of t[side]) {
          if (!g.steps[sid]) issue(`Transition references unknown step "${sid}"`, tAt);
        }
      }
    }
    for (const [aid, a] of Object.entries(g.actions)) {
      elements++;
      if (aid !== a.id) issue(`Action key "${aid}" does not match its id`, [...at, 'actions', aid]);
      if (a.stepId === null) {
        if (!a.position) issue('Unattached action without a position', [...at, 'actions', aid]);
      } else if (!g.steps[a.stepId])
        issue(`Action references unknown step "${a.stepId}"`, [...at, 'actions', aid]);
    }
    for (const [cid, c] of Object.entries(g.comments)) {
      elements++;
      if (cid !== c.id)
        issue(`Comment key "${cid}" does not match its id`, [...at, 'comments', cid]);
    }
  }
  for (const [key, sc] of Object.entries(p.scenarios ?? {})) {
    if (key !== sc.id) issue(`Scenario key "${key}" does not match its id`, ['scenarios', key]);
  }
  if (elements > LIMITS.elements) issue(`Too many elements (${elements} > ${LIMITS.elements})`, []);
}

export const projectSchema = projectShape.superRefine(checkIntegrity);
