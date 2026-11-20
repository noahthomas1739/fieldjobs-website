/**
 * FieldJobs shared design tokens.
 *
 * Palette (color-psychology pass, replacing the orange/purple-era values
 * restored in e126f9fc): a confident BLUE primary ("brand") paired with a
 * WARM ORANGE accent — the classic "trust + action" pairing (Indeed's
 * apply buttons, Amazon's buy buttons) that lets CTAs pop against a
 * credible, trustworthy base. See the matching comment block in
 * `app/globals.css` for the full rationale behind each color.
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
      50: '#ebf5ff',
      100: '#e1effe',
      200: '#c3ddfd',
      300: '#a4cafe',
      400: '#76a9fa',
      500: '#3f83f8',
      600: '#1c64f2',
      700: '#1a56db',
      800: '#1e429f',
      900: '#233876',
    },
    accent: {
      50: '#fff7ed',
      200: '#fed7aa',
      500: '#fb923c',
      600: '#c2410c',
      700: '#9a3412',
    },
    // Tier-differentiation colors for pricing tiers (e.g. Enterprise vs
    // Unlimited) — kept distinct from brand/accent so paid tiers read as
    // deliberate upgrades rather than competing for the same CTA attention.
    tier2: {
      50: '#f5f3ff',
      200: '#ddd6fe',
      300: '#c4b5fd',
      500: '#8b5cf6',
      600: '#7c3aed',
      700: '#6d28d9',
    },
    tier3: {
      50: '#eef2ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
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
