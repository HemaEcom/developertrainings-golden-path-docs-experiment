---
title: "HEMA Design System (HDS / Tompouce)"
---

> **Storybook:** [Browse components](https://hema-design-system-dev.enterprise-dev-libraries.ui.hema.digital)
> **Repo:** [hema-design-system](https://github.com/HemaEcom/hema-design-system)

## What Is HDS?

The HEMA Design System (internally **Tompouce**) provides React components, Tailwind CSS presets, and brand assets. Every MFE uses HDS for visual consistency and WCAG 2.0 AA accessibility.

## Packages

| Package | Purpose |
|---------|---------|
| `@hema/hds-components-react` | React components (Button, Carousel, HemaLogo, etc.) |
| `@hema/hds-tailwindcss-presets` | Tailwind CSS v4 preset with HEMA design tokens |
| `@hema/hds-assets` | Brand fonts (HurmeHEMA), icons |

## Quick Setup

```bash
cd src/
npm install @hema/hds-components-react @hema/hds-assets @hema/hds-tailwindcss-presets
npm install -D tailwindcss@4 @tailwindcss/postcss postcss
```

**`postcss.config.mjs`:**
```js
const postcssConfig = { plugins: { '@tailwindcss/postcss': {} } };
export default postcssConfig;
```

**`styles/globals.css`:**
```css
@import 'tailwindcss' prefix(hds);
@import '@hema/hds-tailwindcss-presets';

@source "../node_modules/@hema/hds-components-react";
@source "../node_modules/@hema/omni-web-app-shell-shell";
```

**Root layout font:**
```tsx
import { hurmeHema } from '@hema/hds-assets/next/font';

<body className={`${hurmeHema.variable} root hds:bg-light-primary`}>
```

## Key Conventions

- **All Tailwind classes are prefixed with `hds:`** — e.g., `hds:flex`, `hds:p-4`, `hds:bg-light-primary`
- **Tailwind CSS v4** — No `tailwind.config.ts` file; configuration is via CSS imports
- **`@source` directives** — Required so Tailwind scans HDS/Shell packages for class names
- **RC versions** — MFEs typically use RC builds; use `overrides` in package.json to align

## Usage

```tsx
import { Button } from '@hema/hds-components-react';

export function MyComponent() {
  return <Button variant="primary">Add to cart</Button>;
}
```

## Further Reading

- [Storybook (all components + props)](https://hema-design-system-dev.enterprise-dev-libraries.ui.hema.digital)
- [Installation docs](https://hema-design-system-dev.enterprise-dev-libraries.ui.hema.digital/?path=/docs/react-installation--docs)
- [Migration guide (v1 → v2)](https://github.com/HemaEcom/hema-design-system/blob/main/docs/MIGRATION-V2.md)
- [Repo README](https://github.com/HemaEcom/hema-design-system/blob/main/README.md)
