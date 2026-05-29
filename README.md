# Hema100 Frontend Golden Path

This repo is the **source of truth** for the Hema100 Composable Frontend Golden Path — the recommended way to create, run, and evolve frontend services in the hema100 project.

## What is the Golden Path?

The Golden Path defines the default, well-supported path for building frontend MFEs at HEMA. You can go off-road, but if you follow the path, things just work: infrastructure, CI/CD, shared libraries, gateway registration, CMS integration, and monitoring are all covered.

## Structure

```
├── README.md                  # This file
├── CHANGELOG.md               # Iteration log (changes, sources, gaps)
├── golden-path-master.md      # Main Golden Path document
├── tutorial.md                # Step-by-step tutorial for creating a new MFE
├── audit/
│   └── gap-analysis.md        # Audit results and known gaps
└── sections/
    ├── infrastructure/        # CDK stacks, runtime, pipeline
    ├── gateway/               # CloudFront routing, multi-zone, gateway registration
    ├── libraries/             # Web Shell, HDS, shared packages
    ├── cms/                   # Sanity CMS: schemas, content modeling, MFE integration
    ├── ci-cd/                 # Pipeline, Butler, deployment model
    ├── onboarding/            # Getting started, prerequisites, first service
    ├── data-apis/             # PODS, Sanity, API patterns
    ├── monitoring/            # Observability, alarms, dashboards
    ├── performance/           # Caching, CDN, Core Web Vitals
    ├── security/              # WAF, headers, CSP
    └── environments/          # Environment map, sandbox, staging, prod
```

## How to contribute

1. Create a feature branch from `main`
2. Add or update documentation in the relevant section
3. Log your changes in `CHANGELOG.md`
4. Open a PR for review

## Principles

- **Practical over theoretical** — include commands, file paths, and real examples
- **Repo-backed** — documentation reflects what's actually in the implementation repos
- **Living document** — iterate often, mark gaps with TODOs, keep it current
- **Onboarding-first** — a new developer should be able to follow the path end-to-end
