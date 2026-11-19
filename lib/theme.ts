/**
 * FieldJobs shared design tokens.
 *
 * Source of truth for the site's visual refresh: a clean, professional,
 * trade/industrial B2B palette (LinkedIn/Indeed territory) instead of the
 * old orange/purple/gradient "AI template" look.
 *
 * These values MUST stay in sync with the CSS custom properties defined in
 * `app/globals.css` (`:root` block). Components that render with Tailwind
 * utility classes should use the matching class names (e.g. `bg-brand-600`,
 * `text-ink`, `border-border`) instead of importing this file. Components
 * that still use inline `style={{...}}` objects (notably `app/page.tsx`)
 * should import `theme` from here instead of hardcoding one-off hex values,
 * so future palette tweaks only happen in one place.
 */

export const theme = {
  colors: {
    brand: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a5f',
    },
    accent: {
      50: '#fffbeb',
      200: '#fde68a',
      500: '#f59e0b',
      600: '#d97706',
    },
    ink: '#0f172a',
    body: '#334155',
    muted: '#64748b',
    subtle: '#94a3b8',
    surface: '#f8fafc',
    surfaceAlt: '#f1f5f9',
    border: '#e2e8f0',
    success: '#16a34a',
    successBg: '#f0fdf4',
    warning: '#d97706',
    warningBg: '#fffbeb',
    danger: '#dc2626',
    dangerBg: '#fef2f2',
    white: '#ffffff',
  },
  shadow: {
    card: '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.08)',
    cardHover: '0 4px 12px rgba(15, 23, 42, 0.10)',
    modal: '0 20px 40px rgba(15, 23, 42, 0.18)',
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
  },
} as const

/**
 * Icon conventions (lucide-react) — use these consistently instead of
 * emoji anywhere in the UI:
 *  - Inline metadata / badge icons: size 14-16, color theme.colors.muted
 *    (or white/accent when on a colored background).
 *  - Button icons: size 18-20, inherit button text color.
 *  - Section / empty-state icons: size 32-40, color theme.colors.subtle.
 *  - Stroke width: default (2) everywhere for visual consistency.
 */
export default theme
