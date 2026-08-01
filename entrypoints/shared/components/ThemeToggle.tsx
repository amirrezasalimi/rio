import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/theme';

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const dark = theme === 'dark';
  const label = dark ? 'Use light theme' : 'Use dark theme';
  const ThemeIcon = dark ? Sun : Moon;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={dark}
      onClick={toggleTheme}
      className={`inline-flex shrink-0 items-center justify-center rounded-xl border border-border bg-control text-muted shadow-sm transition hover:border-primary-300 hover:bg-control-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${compact ? 'size-8' : 'gap-2 px-3 py-2 text-xs font-semibold'}`}
    >
      <ThemeIcon className="size-4" />
      {!compact && <span>{dark ? 'Light' : 'Dark'}</span>}
    </button>
  );
}
