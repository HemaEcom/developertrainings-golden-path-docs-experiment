import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://hemaecom.github.io',
  base: '/developertrainings-golden-path-docs-experiment',
  outDir: './docs',
  integrations: [
    starlight({
      title: 'Frontend Golden Path',
      description: 'The recommended way to build frontend MFEs at HEMA',
      logo: {
        src: './public/hema-logo.svg',
      },
      customCss: ['./src/styles/hema-theme.css'],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/HemaEcom/developertrainings-golden-path-docs-experiment',
        },
      ],
      sidebar: [
        {
          label: 'Golden Path',
          autogenerate: { directory: 'golden-path' },
        },
      ],
    }),
  ],
});
