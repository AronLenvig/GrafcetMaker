import { useTranslation } from 'react-i18next';
import { ThemeSwitcher } from '@/theme/ThemeSwitcher';
import { LogoIcon } from './ui/icons';

export function App() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-10 shrink-0 items-center gap-3 border-b border-border bg-surface px-3">
        <LogoIcon size={18} />
        <span className="font-semibold">{t('app.name')}</span>
        <span className="text-muted">{t('app.tagline')}</span>
        <div className="ml-auto">
          <ThemeSwitcher />
        </div>
      </header>
      <main className="flex-1 bg-canvas" />
    </div>
  );
}
