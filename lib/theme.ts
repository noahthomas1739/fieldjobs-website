/**
 * FieldJobs shared design tokens.
 *
 * Source of truth for the site's palette: the original FieldJobs brand —
 * a warm orange primary (#ff6b35) with neutral slates for text/surfaces,
 * and a gold/amber accent used sparingly for "featured" highlights.
 * Restored to the original orange/purple-era palette at the site owner's
 * request after a brief blue/slate experiment; only the color VALUES
 * changed back — the token names/structure stay the same so the rest of
 * the app keeps reading from a single source of truth.
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
      50: '#fff5f0',
      100: '#ffe8dc',
      200: '#ffd0b5',
      300: '#ffb088',
      400: '#ff8f5c',
      500: '#ff7a42',
      600: '#ff6b35',
      700: '#e55a2b',
      800: '#c2410c',
      900: '#9a3412',
    },
    accent: {
      50: '#fffbeb',
      200: '#ffed4e',
      500: '#ffd700',
      600: '#b8860b',
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
