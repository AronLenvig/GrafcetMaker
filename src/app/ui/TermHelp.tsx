import * as Popover from '@radix-ui/react-popover';
import { useTranslation } from 'react-i18next';
import { tDynamic } from '@/i18n/dynamic';
import { openHelp } from '../help/helpStore';

/** Glossary terms and the help page explaining each one. */
export const TERM_HELP = {
  step: ['grafcet-basics', 'steps'],
  transition: ['grafcet-basics', 'transitions-and-receptivities'],
  receptivity: ['expressions', 'operators'],
  action: ['actions', null],
  storedAction: ['actions', 'stored-actions'],
  event: ['actions', 'stored-actions'],
  assignmentCondition: ['actions', 'continuous-actions'],
  macroStep: ['hierarchy', 'macro-steps'],
  enclosingStep: ['hierarchy', 'enclosing-steps'],
  forcingOrder: ['hierarchy', 'forcing-orders'],
  partialGrafcet: ['hierarchy', 'several-partial-grafcets'],
  variable: ['variables', 'kinds-of-variables'],
} as const;

export type Term = keyof typeof TERM_HELP;

/**
 * A small "?" next to a standard GRAFCET term: shows its definition and links to the help page.
 * A popover rather than a tooltip so it works with the keyboard and on touch screens.
 */
export function TermHelp({ term }: { term: Term }) {
  const { t } = useTranslation();
  const name = tDynamic(t, `glossary.${term}.name`);
  const [page, anchor] = TERM_HELP[term];
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={t('glossary.whatIs', { term: name })}
        title={t('glossary.whatIs', { term: name })}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border-strong text-[10px] leading-none font-semibold text-muted hover:border-accent hover:text-accent"
      >
        ?
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 flex w-72 flex-col gap-2 rounded-md border border-border bg-surface p-3 text-text shadow-pop"
        >
          <p>
            <strong className="font-semibold">{name}</strong>:{' '}
            {tDynamic(t, `glossary.${term}.text`)}
          </p>
          <Popover.Close asChild>
            <button
              type="button"
              onClick={() => openHelp(page, anchor)}
              className="self-start text-xs font-medium text-accent underline"
            >
              {t('help.learnMore')}
            </button>
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
