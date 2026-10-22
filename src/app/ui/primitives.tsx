import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDownIcon, CloseIcon, ErrorIcon } from './icons';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'danger' | 'default' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover border border-transparent',
  danger: 'bg-surface text-danger border border-danger hover:bg-danger-soft',
  default: 'bg-surface text-text border border-border hover:bg-surface-2',
  ghost: 'text-text border border-transparent hover:bg-surface-2',
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }
>(function Button({ variant = 'default', size = 'md', className, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-7 px-2 text-xs' : 'h-8 px-3',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    />
  );
});

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }
>(function IconButton({ label, active, className, type = 'button', children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      aria-pressed={rest.role === 'radio' ? undefined : active}
      className={cx(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text disabled:opacity-40',
        active && 'bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

/** Tooltip with an optional keyboard shortcut. */
export function Tip({
  label,
  keys,
  children,
  side = 'right',
}: {
  label: string;
  keys?: string;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <Tooltip.Root delayDuration={400}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          className="z-50 rounded-md border border-border bg-surface px-2 py-1 text-xs text-text shadow-pop"
        >
          {label}
          {keys && <kbd className="ml-2 font-mono text-muted">{keys}</kbd>}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

// ---- Menus ----

export const menuContentClass =
  'z-50 min-w-56 rounded-md border border-border bg-surface p-1 text-text shadow-pop';
const itemClass =
  'flex cursor-default items-center gap-2 rounded px-2 py-1.5 outline-none select-none data-[disabled]:opacity-45 data-[highlighted]:bg-accent-soft data-[highlighted]:text-text';

export function MenuItem({
  children,
  keys,
  onSelect,
  disabled,
}: {
  children: ReactNode;
  keys?: string;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu.Item className={itemClass} onSelect={onSelect} disabled={disabled}>
      <span className="flex-1">{children}</span>
      {keys && <kbd className="font-mono text-xs text-muted">{keys}</kbd>}
    </DropdownMenu.Item>
  );
}

export function MenuCheckItem({
  children,
  checked,
  onCheckedChange,
}: {
  children: ReactNode;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <DropdownMenu.CheckboxItem
      className={itemClass}
      checked={checked}
      onCheckedChange={onCheckedChange}
    >
      <span className="w-4 text-center" aria-hidden="true">
        {checked ? '✓' : ''}
      </span>
      <span className="flex-1">{children}</span>
    </DropdownMenu.CheckboxItem>
  );
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-border" />;
}

export function SubMenu({
  label,
  children,
  disabled,
}: {
  label: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger className={itemClass} disabled={disabled}>
        <span className="flex-1">{label}</span>
        <span aria-hidden="true">›</span>
      </DropdownMenu.SubTrigger>
      <DropdownMenu.Portal>
        <DropdownMenu.SubContent className={menuContentClass} sideOffset={4}>
          {children}
        </DropdownMenu.SubContent>
      </DropdownMenu.Portal>
    </DropdownMenu.Sub>
  );
}

export function Menu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger className="rounded px-2 py-1 text-text hover:bg-surface-2 data-[state=open]:bg-surface-2">
        {label}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={menuContentClass} align="start" sideOffset={4}>
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** Drop-down menu opened from an icon button (panel toolbars). */
export function IconMenu({
  label,
  icon,
  children,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild disabled={disabled}>
        <IconButton label={label} title={label} className="data-[state=open]:bg-surface-2">
          {icon}
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={menuContentClass} align="end" sideOffset={4}>
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ---- Dialogs ----

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  width = 480,
  role,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: number;
  role?: 'dialog' | 'alertdialog';
}) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay" />
        <Dialog.Content
          role={role ?? 'dialog'}
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-surface text-text shadow-pop"
          style={{ width }}
        >
          <div className="flex items-start gap-3 border-b border-border px-4 py-3">
            <Dialog.Title className="flex-1 text-sm font-semibold">{title}</Dialog.Title>
            <Dialog.Close
              className="rounded p-0.5 text-muted hover:bg-surface-2 hover:text-text"
              aria-label={t('common.close')}
            >
              <CloseIcon size={16} />
            </Dialog.Close>
          </div>
          {description ? (
            <Dialog.Description className="px-4 pt-3 text-muted">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          <div className="min-h-0 flex-1 overflow-auto px-4 py-3">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---- Form fields ----

/** Standard text input look (see .gm-input in theme/index.css). */
export const inputClass = 'gm-input';

/** Label above a control, with an optional hint or error below. */
export function Field({
  label,
  htmlFor,
  children,
  hint,
  error,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: ReactNode;
  error?: string | null;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p
          id={htmlFor + '-error'}
          role="alert"
          className="flex items-start gap-1 text-xs text-danger"
        >
          <ErrorIcon size={13} className="mt-px shrink-0" />
          {error}
        </p>
      ) : (
        hint && <div className="text-xs text-muted">{hint}</div>
      )}
    </div>
  );
}

/** Native select styled like the text inputs, with a chevron. */
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { small?: boolean; ghost?: boolean }
>(function Select({ className, small, ghost, children, ...rest }, ref) {
  return (
    <span className="relative block">
      <select
        ref={ref}
        className={cx('gm-input', small && 'gm-input-sm', ghost && 'gm-input-ghost', className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDownIcon
        size={14}
        className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-muted"
      />
    </span>
  );
});
