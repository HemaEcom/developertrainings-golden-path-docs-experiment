import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import astroD2 from 'astro-d2';

export default defineConfig({
  site: 'https://hemaecom.github.io',
  base: '/developertrainings-golden-path-docs-experiment',
  outDir: './docs',
  integrations: [
    astroD2({
      sketch: true,
    }),
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
          label: 'Overview',
          items: [
            { label: 'Golden Path', slug: 'golden-path/overview' },
          ],
        },
        {
          label: 'Tutorial',
          autogenerate: { directory: 'golden-path/tutorial' },
        },
        {
          label: 'Onboarding',
          autogenerate: { directory: 'golden-path/onboarding' },
        },
        {
          label: 'Infrastructure',
          autogenerate: { directory: 'golden-path/infrastructure' },
        },
        {
          label: 'Gateway',
          autogenerate: { directory: 'golden-path/gateway' },
        },
        {
          label: 'Libraries',
          autogenerate: { directory: 'golden-path/libraries' },
        },
        {
          label: 'CI/CD',
          autogenerate: { directory: 'golden-path/ci-cd' },
        },
        {
          label: 'CMS',
          autogenerate: { directory: 'golden-path/cms' },
        },
        {
          label: 'Data & APIs',
          autogenerate: { directory: 'golden-path/data-apis' },
        },
        {
          label: 'Environments',
          autogenerate: { directory: 'golden-path/environments' },
        },
        {
          label: 'Performance',
          autogenerate: { directory: 'golden-path/performance' },
        },
        {
          label: 'Security',
          autogenerate: { directory: 'golden-path/security' },
        },
        {
          label: 'Monitoring',
          autogenerate: { directory: 'golden-path/monitoring' },
        },
        {
          label: 'ADRs',
          autogenerate: { directory: 'golden-path/adrs' },
        },
      ],
    }),
  ],
});
