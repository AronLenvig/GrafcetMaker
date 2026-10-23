import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 16, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);

export const MoonIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </Icon>
);

export const MonitorIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </Icon>
);

/** GRAFCET glyph: initial step over a transition bar. */
export const LogoIcon = (p: IconProps) => (
  <Icon {...p} strokeWidth={1.8}>
    <rect x="6" y="2" width="12" height="12" />
    <rect x="8.5" y="4.5" width="7" height="7" />
    <path d="M12 14v8M8 18h8" strokeWidth={2.4} />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const MinusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14" />
  </Icon>
);

export const FitIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5" />
  </Icon>
);

/*
 * Tool icons: light 1.5 strokes with rounded joins (the toolbar look of whiteboard apps), each the
 * GRAFCET symbol the tool places.
 */
export const PointerIcon = (p: IconProps) => (
  <Icon strokeWidth={1.5} {...p}>
    <path d="M6 3.5l12.5 6.2-5.4 1.6 3.6 5.9-2.3 1.4-3.6-5.9-3.9 4.1z" />
  </Icon>
);

export const HandIcon = (p: IconProps) => (
  <Icon strokeWidth={1.5} {...p}>
    <path d="M8 12.5V6a1.5 1.5 0 0 1 3 0v5.5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v5M17 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1.4a6 6 0 0 1-4.7-2.3L3.6 15.4a1.6 1.6 0 0 1 2.4-2.1L8 15" />
  </Icon>
);

/** A step: the square with its links above and below. */
export const StepIcon = (p: IconProps) => (
  <Icon strokeWidth={1.5} {...p}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="1" />
    <path d="M12 2.5v4M12 17.5v4" />
  </Icon>
);

/** A transition: the bar across a link. */
export const TransitionIcon = (p: IconProps) => (
  <Icon strokeWidth={1.5} {...p}>
    <path d="M12 3v18" />
    <path d="M6 12h12" strokeWidth={3} />
  </Icon>
);

/** A comment: the dashed note box. */
export const CommentIcon = (p: IconProps) => (
  <Icon strokeWidth={1.5} {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2" strokeDasharray="3 2.2" />
    <path d="M7.5 10h9M7.5 14h5.5" />
  </Icon>
);

export const UndoIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </Icon>
);

export const RedoIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 14l5-5-5-5" />
    <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </Icon>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Icon>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);

export const ChevronUpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 15l-6-6-6 6" />
  </Icon>
);

export const SearchIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </Icon>
);

export const UploadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
  </Icon>
);

export const PanelBottomIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 14h18" />
  </Icon>
);

/** An action: a step with its action box. */
export const ActionIcon = (p: IconProps) => (
  <Icon strokeWidth={1.5} {...p}>
    <rect x="2.5" y="8" width="7" height="8" rx="1" />
    <path d="M9.5 12h2.5" />
    <rect x="12" y="8" width="9.5" height="8" rx="1" />
  </Icon>
);

export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3l10 18H2z" />
    <path d="M12 10v4M12 17.5v.5" />
  </Icon>
);

export const ErrorIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9l-6 6M9 9l6 6" />
  </Icon>
);

export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.5" />
  </Icon>
);

export const PlayIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4l13 8-13 8z" fill="currentColor" />
  </Icon>
);

export const PauseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor" />
  </Icon>
);

export const StepForwardIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 4l10 8-10 8z" fill="currentColor" />
    <path d="M18 4v16" strokeWidth={3} />
  </Icon>
);

export const ResetIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </Icon>
);

export const RecordIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="6" fill="currentColor" />
  </Icon>
);

export const StopIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="6" y="6" width="12" height="12" fill="currentColor" />
  </Icon>
);

export const MoreIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="5" cy="12" r="1.2" fill="currentColor" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    <circle cx="19" cy="12" r="1.2" fill="currentColor" />
  </Icon>
);

export const BookIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z" />
    <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
  </Icon>
);

export const TableIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18M3 15h18M9 4v16" />
  </Icon>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
);

export const FeedbackIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z" />
    <path d="M9 10.5h6M9 13.5h4" />
  </Icon>
);

export const HelpIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.8M12 17.2v.3" />
  </Icon>
);

export const MenuIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
);

export const EditIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </Icon>
);

/** Step, transition and a new step below (Enter). */
export const AppendIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="8" y="2" width="8" height="6" />
    <path d="M12 8v13M8 13h8" />
    <path d="M12 16v5" strokeDasharray="2 2" />
  </Icon>
);

/** Divergence in AND: the double bar. */
export const ParallelIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v5M3 9h18M3 12h18M6 12v9M18 12v9" />
  </Icon>
);

/** Divergence in OR: one bar, a transition on each branch. */
export const AlternativeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3v6M5 9h14M5 9v12M19 9v12M2.5 15h5M16.5 15h5" />
  </Icon>
);

/** A link back up to an earlier step. */
export const LoopIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 20H6V5h8" />
    <path d="M11 2l3 3-3 3" />
    <rect x="15" y="16" width="6" height="6" />
  </Icon>
);

export const PropertiesIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </Icon>
);

/** Signals over time. */
export const ChronogramIcon = (p: IconProps) => (
  <Icon strokeWidth={1.5} {...p}>
    <path d="M3 9h4V4h5v5h3V4h6M3 20h6v-5h6v5h6" />
  </Icon>
);

/** A tree of elements. */
export const OutlineIcon = (p: IconProps) => (
  <Icon strokeWidth={1.5} {...p}>
    <path d="M4 5h4M8 12h4M8 19h4M6 5v14M6 12h2M6 19h2" />
    <path d="M12 5h8M14 12h6M14 19h6" />
  </Icon>
);

export const LinkIcon = (p: IconProps) => (
  <Icon strokeWidth={1.5} {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3.6-3.6a4 4 0 0 0-5.7-5.7L12.5 5.8" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3.6 3.6a4 4 0 0 0 5.7 5.7l1.1-1.1" />
  </Icon>
);

/** Inputs and outputs of a running simulation. */
export const GaugeIcon = (p: IconProps) => (
  <Icon strokeWidth={1.5} {...p}>
    <path d="M4.5 17a8.5 8.5 0 1 1 15 0" />
    <path d="M12 13l3.5-4" />
    <circle cx="12" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
  </Icon>
);
