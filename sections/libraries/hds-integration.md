# HEMA Design System (HDS / Tompouce) Integration

> Source: [hema-design-system repo](https://github.com/HemaEcom/hema-design-system) | [Storybook](https://hema-design-system-dev.enterprise-dev-libraries.ui.hema.digital)
> HDS Version: 2.1.0 | Tailwind CSS: 4.x | React: 19.x

---

## Overview

The HEMA Design System (internally called **Tompouce**) provides React components, design tokens, Tailwind CSS presets, and brand assets. Every MFE in the hema100 project uses HDS for visual consistency and accessibility compliance (WCAG 2.0 AA).

HDS is a monorepo with these packages:

| Package | Purpose |
|---------|---------|
| `@hema/hds-components-react` | React component library (Button, HemaLogo, Carousel, etc.) |
| `@hema/hds-tailwindcss-presets` | Tailwind CSS v4 preset with HEMA design tokens |
| `@hema/hds-assets` | Brand fonts (HurmeHEMA), icons (SVG) |
| `@hema/hds-tokens` | Raw design tokens (colors, spacing, typography) |
| `@hema/hds-css` | Base CSS utilities |

---

## Step-by-Step Integration

### 1. Install Packages

```bash
cd src/
npm install @hema/hds-components-react @hema/hds-assets @hema/hds-tailwindcss-presets
```

**Peer dependencies** (must be in your project):
```bash
npm install react react-dom clsx
npm install cva@npm:class-variance-authority
```

> **Note:** HDS uses RC versions in MFE projects (e.g., `2.1.0-rc.1778855422330`). You may need `overrides` in your `package.json` to align versions:
> ```json
> "overrides": {
>   "@hema/hds-components-react": "^2.1.0-rc.1778855422330"
> }
> ```

### 2. Install Tailwind CSS v4 + PostCSS

```bash
npm install -D tailwindcss@4 @tailwindcss/postcss postcss
```

### 3. Configure PostCSS

Create `postcss.config.mjs`:

```js
const postcssConfig = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default postcssConfig;
```

> **Important:** Tailwind CSS v4 does NOT use a `tailwind.config.ts` file. Configuration is done entirely via CSS imports.

### 4. Configure Global CSS

Create or update `styles/globals.css`:

```css
@import 'tailwindcss' prefix(hds);
@import '@hema/hds-tailwindcss-presets';

@source "../node_modules/@hema/hds-components-react";
@source "../node_modules/@hema/omni-web-app-shell-shell";
```

**Key points:**
- `prefix(hds)` — All Tailwind utilities are prefixed with `hds:` (e.g., `hds:py-3xl`, `hds:mx-auto`)
- `@import '@hema/hds-tailwindcss-presets'` — Loads HEMA design tokens (colors, spacing, typography)
- `@source` directives — Tell Tailwind to scan HDS and Web Shell packages for class usage

### 5. Add Custom Utilities (Optional)

```css
@utility custom-counter {
  counter-reset: item;
}

@utility increment-children {
  & > * {
    counter-increment: item;
  }
}
```

### 6. Layout Utilities

HDS provides standard layout classes:

```css
.hema-100-layout {
  @apply hds:py-3xl hds:max-w-[1280px] hds:mx-auto hds:box-content hds:w-auto hds:page-margin;
}
```

Use this class on content sections to get consistent page margins and max-width.

---

## Using Components

Import components directly from the package:

```tsx
import { Button, HemaLogo, PlainButton } from '@hema/hds-components-react';

export function MyComponent() {
  return (
    <div className="hds:flex hds:gap-md">
      <Button variant="primary" size="md">
        Add to cart
      </Button>
      <HemaLogo />
    </div>
  );
}
```

### Component CSS

HDS components ship with their own styles via `@hema/hds-components-react/style.css`. This is automatically included when you use the `@source` directive in your globals.css.

---

## Using Fonts

HDS provides the HEMA brand font (HurmeHEMA) via `@hema/hds-assets`:

```tsx
// In your root layout.tsx
import '@hema/hds-assets/font/HurmeHEMA.css';
```

Or for Next.js font optimization:
```tsx
import { hemaFont } from '@hema/hds-assets/next/font';
```

---

## Using Icons

Icons are available as SVG files:

```tsx
// Import specific icons
import SearchIcon from '@hema/hds-assets/icons/search.svg';
```

HDS components that need icons accept them as props — check Storybook for each component's API.

---

## Tailwind Class Prefix

Because HDS uses the `prefix(hds)` directive, all Tailwind utility classes must be prefixed:

| Standard Tailwind | HDS Prefixed |
|-------------------|--------------|
| `flex` | `hds:flex` |
| `p-4` | `hds:p-4` |
| `text-lg` | `hds:text-lg` |
| `bg-red-500` | `hds:bg-red-500` |
| `max-w-[1280px]` | `hds:max-w-[1280px]` |

This prevents class collisions between HDS styles and any other CSS in the project.

---

## Vitest Configuration

When testing components that use HDS, you need to inline the HDS package in Vitest:

```ts
// vitest.config.mts
export default defineConfig({
  test: {
    deps: {
      inline: ['tailwind-merge', '@hema/hds-components-react', '@hema/omni-web-app-shell-shell'],
    },
  },
});
```

---

## Design Tokens

HDS design tokens are available via the Tailwind preset. Key token categories:

- **Colors:** Brand colors (hema-red, hema-blue, etc.), semantic colors (success, warning, error)
- **Spacing:** Consistent spacing scale (xs, sm, md, lg, xl, 2xl, 3xl)
- **Typography:** Font sizes, weights, line heights matching HEMA brand
- **Breakpoints:** Responsive breakpoints for mobile, tablet, desktop
- **Shadows:** Elevation levels

Tokens are consumed through Tailwind classes — you don't need to import them directly.

---

## Storybook

Browse all available components, their props, and usage examples:

- **Dev:** https://hema-design-system-dev.enterprise-dev-libraries.ui.hema.digital
- **Prod:** https://hema-design-system.enterprise-libraries.ui.hema.digital

---

## Migration Notes (v1 → v2)

If migrating from HDS v1:
- Tailwind CSS upgraded from v3 to v4 (no more `tailwind.config.ts`)
- PostCSS plugin changed to `@tailwindcss/postcss`
- CSS import syntax changed (see `globals.css` above)
- See `docs/MIGRATION-V2.md` in the hema-design-system repo for full details

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Classes not applying | Ensure `@source` directives include the HDS package path |
| Version conflicts | Use `overrides` in package.json to pin HDS RC versions |
| Font not loading | Import `@hema/hds-assets/font/HurmeHEMA.css` in root layout |
| Build errors with SSR | HDS components are client-compatible; wrap with `'use client'` if needed |
| Tailwind classes not prefixed | All utilities must use `hds:` prefix |

---

## Reference Implementation

See `omni-web-content-frontend/src/` for a complete working integration:
- `styles/globals.css` — CSS setup with prefix and presets
- `postcss.config.mjs` — PostCSS configuration
- `package.json` — Dependency versions and overrides
- `components/` — Real component usage patterns
