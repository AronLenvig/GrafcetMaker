import { useTranslation } from 'react-i18next';
import { ZoomControls } from '@/editor/canvas/ZoomControls';
import { HintBar } from '@/editor/canvas/HintBar';
import { GrafcetTabs } from '@/editor/canvas/GrafcetTabs';
import { formatKeys, runCommand } from '@/editor/commands/registry';
import { useSim } from '@/editor/simulation/simStore';
import { useUi } from '@/editor/store/uiStore';
import { ToolIsland, UndoRedoIsland } from '@/editor/tools/Toolbar';
import { ProblemsBadge, usePanelLabel } from '@/panels/panelParts';
import { LiveIsland } from './collab/LiveIsland';
import { LanguageButton } from './LanguageMenu';
import { MainMenuButton } from './menus';
import { SimBar } from './SimBar';
import {
  PANEL_TABS,
  toggleProperties,
  togglePanel,
  usePropertiesVisible,
  useSheet,
  type SheetTab,
} from './sheet';
import { useSideWidths, useWindowWidth } from './sideWidths';
import { ProblemsIndicator, Title } from './TopBar';
import {
  AlertIcon,
  ChronogramIcon,
  ExportIcon,
  FeedbackIcon,
  GaugeIcon,
  HelpIcon,
  LinkIcon,
  OutlineIcon,
  PropertiesIcon,
  TableIcon,
} from './ui/icons';
import { cx, IconButton, Tip } from './ui/primitives';

/** Top left: the main menu, the project name and the properties toggle. */
function ProjectIsland() {
  const { t } = useTranslation();
  const properties = usePropertiesVisible();
  return (
    <div className="gm-island flex items-center gap-0.5 p-1">
      <MainMenuButton />
      <div className="flex max-w-[min(260px,calc(50vw-260px))] min-w-0">
        <Title />
      </div>
      <Tip label={t('commands.view.toggleRight')} side="bottom">
        <IconButton
          label={t('commands.view.toggleRight')}
          active={properties}
          className="h-9 w-9"
          onClick={toggleProperties}
        >
          <PropertiesIcon size={18} />
        </IconButton>
      </Tip>
    </div>
  );
}

/**
 * Top right: the problems, Export and live collaboration (the share link where this site has no
 * live collaboration; otherwise it is in the File menu).
 */
function ShareIsland() {
  const { t } = useTranslation();
  const shareLink = (
    <div className="hidden md:block">
      <Tip label={t('commands.file.copyLink')} side="bottom">
        <button
          type="button"
          aria-label={t('commands.file.copyLink')}
          onClick={() => runCommand('file.copyLink')}
          className="gm-island flex h-11 w-11 items-center justify-center text-muted hover:bg-surface-2 hover:text-text"
        >
          <LinkIcon size={18} />
        </button>
      </Tip>
    </div>
  );
  return (
    <div className="flex items-center gap-2">
      <div className="gm-island p-1">
        <ProblemsIndicator />
      </div>
      <Tip label={t('commands.file.export')} keys={formatKeys('Mod+E')} side="bottom">
        <button
          type="button"
          aria-label={t('commands.file.export')}
          onClick={() => runCommand('file.export')}
          className="gm-island flex h-11 items-center gap-1.5 px-3 text-[13px] font-medium hover:bg-surface-2"
        >
          <ExportIcon size={16} />
          <span className="hidden lg:inline">{t('export.title')}</span>
        </button>
      </Tip>
      <LiveIsland fallback={shareLink} />
    </div>
  );
}

const PANEL_ICONS: Record<SheetTab, typeof TableIcon> = {
  properties: PropertiesIcon,
  variables: TableIcon,
  problems: AlertIcon,
  simulation: GaugeIcon,
  chronogram: ChronogramIcon,
  outline: OutlineIcon,
};

/** Bottom right: the panels (each opens a floating card), help, feedback and the language. */
function PanelsIsland() {
  const { t } = useTranslation();
  const open = useSheet((s) => s.open);
  const tab = useSheet((s) => s.tab);
  const panelLabel = usePanelLabel();
  return (
    <div className="flex items-center gap-2">
      <nav aria-label={t('panels.label')} className="gm-island flex items-center gap-0.5 p-1">
        {PANEL_TABS.map((x) => {
          const Icon = PANEL_ICONS[x];
          const label = panelLabel(x);
          const on = open && tab === x;
          return (
            <Tip key={x} label={label} side="top">
              <button
                type="button"
                aria-label={label}
                aria-pressed={on}
                onClick={() => togglePanel(x)}
                className={cx(
                  'flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg px-2',
                  on ? 'bg-accent-soft text-accent' : 'text-text hover:bg-surface-2',
                )}
              >
                <Icon size={18} />
                <span className="hidden text-[13px] xl:inline">{label}</span>
                {x === 'problems' && <ProblemsBadge className="text-text" />}
              </button>
            </Tip>
          );
        })}
      </nav>
      <div data-tour="help" className="gm-island flex items-center p-0.5">
        <Tip label={t('commands.help.open')} keys="F1" side="top">
          <IconButton
            label={t('commands.help.open')}
            className="h-9 w-9"
            onClick={() => runCommand('help.open')}
          >
            <HelpIcon size={18} />
          </IconButton>
        </Tip>
        <Tip label={t('commands.help.feedback')} side="top">
          <IconButton
            label={t('commands.help.feedback')}
            className="h-9 w-9"
            onClick={() => runCommand('help.feedback')}
          >
            <FeedbackIcon size={18} />
          </IconButton>
        </Tip>
        <LanguageButton />
      </div>
    </div>
  );
}

function ZoomIsland() {
  const gid = useUi((s) => s.activeGrafcetId);
  const zoom = useUi((s) => (gid ? (s.viewports[gid]?.zoom ?? 1) : 1));
  return gid ? <ZoomControls gid={gid} zoom={zoom} /> : null;
}

/**
 * Desktops and tablets: everything but the diagram floats over it as small islands. Top: menu and
 * project, the tools and Simulate (the simulation controls while simulating) with the hints below
 * them, and problems / Export / share. Bottom: zoom and undo, the grafcet tabs, the panels and help.
 */
export function Islands() {
  const simulating = useSim((s) => s.on);
  const { left, right } = useSideWidths();
  const windowWidth = useWindowWidth();
  const hintWidth = Math.min(720, windowWidth - 2 * Math.max(left, right) - 24);
  return (
    <>
      <header className="pointer-events-none absolute inset-x-3 top-3 z-30 flex items-start justify-between gap-3">
        <div className="pointer-events-auto min-w-0">
          <ProjectIsland />
        </div>
        <div className="pointer-events-auto shrink-0">
          <ShareIsland />
        </div>
        <div className="pointer-events-none absolute top-0 left-1/2 flex max-w-full -translate-x-1/2 flex-col items-center gap-2">
          <div className="pointer-events-auto max-w-full">
            {simulating ? <SimBar /> : <ToolIsland />}
          </div>
          {/* Between the side cards; when they leave too little room the hints step aside. */}
          {hintWidth >= 280 && (
            <div className="pointer-events-auto" style={{ maxWidth: hintWidth }}>
              <HintBar />
            </div>
          )}
        </div>
      </header>
      <footer className="pointer-events-none absolute inset-x-3 bottom-3 z-30 flex items-end gap-2">
        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          <ZoomIsland />
          {!simulating && <UndoRedoIsland />}
        </div>
        <div className="flex min-w-0 flex-1 justify-center">
          <div className="pointer-events-auto min-w-0">
            <GrafcetTabs floating />
          </div>
        </div>
        <div className="pointer-events-auto shrink-0">
          <PanelsIsland />
        </div>
      </footer>
    </>
  );
}
