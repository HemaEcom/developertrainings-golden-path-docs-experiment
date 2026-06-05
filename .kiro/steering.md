# Project Steering

## Project Identity

**Name:** Frontend Golden Path — Customer-Facing MFEs
**Scope:** This Golden Path documents the recommended way to build **customer-facing** micro-frontends at HEMA (hema100 project). It covers the public website: product pages, content/inspiration, promotions, and related services.

**Audience:** Frontend developers building or maintaining customer-facing MFEs at HEMA. Assumes TypeScript/React proficiency. Does NOT assume prior knowledge of HEMA infrastructure, CDK, or internal tooling.

**What this is NOT:**
- This is not the Internal Apps Golden Path (that's a separate, emerging initiative for back-office/internal tooling)
- This is not a general company-wide engineering handbook — it's specific to the customer-facing frontend platform

### Related Golden Paths

| Golden Path | Scope | Status |
|-------------|-------|--------|
| **This one** — Customer-Facing MFEs | Public website (hema.nl, hema.com) | Active, iterating |
| Internal Apps | Back-office tools, admin dashboards, internal services | Emerging — not yet documented |

---

## Writing Preferences

### Tone
- Plain, everyday English
- Direct and practical — get to the point
- Conversational but professional — not academic, not overly casual
- Speak to the reader as a peer developer ("you", not "the developer")
- State facts, not aspirations — if something isn't done yet, say so

### Structure
- Follow Diataxis: tutorials (learning), how-tos (doing), reference (looking up), explanations (understanding)
- One topic per page
- Short paragraphs, tables over long prose
- Code examples should be real (from actual repos), not hypothetical
- Mark unfinished sections with `:::note` admonitions, not hidden TODO comments
- Every page should help someone DO something or UNDERSTAND something specific

### What to avoid
- Filler introductions ("In this section we will explore...")
- Redundant content across pages — link, don't repeat
- Speculative/aspirational content presented as fact
- Overly long pages — split if > 200 lines of content

---

## Diagrams

### Tool: D2 (via astro-d2 plugin)

We use [D2](https://d2lang.com/) for all architectural diagrams, rendered inline via the `astro-d2` integration with sketch mode enabled.

### Preferences

| Preference | Rule |
|------------|------|
| **Orientation** | Always `direction: down` (vertical/top-down) |
| **Why** | Horizontal diagrams are too compressed for Starlight's page width — items and text become unreadable |
| **Nesting** | Avoid deep nesting (max 1 level). Flat nodes with descriptive labels are more readable |
| **Labels** | Put key info in node labels using `\n` for multi-line. Don't rely on child nodes for simple info |
| **Colors** | Use soft fills to group by concern: green (#E8F5E9) for CMS/source, blue (#E3F2FD) for MFEs, yellow (#FFF9C4) for triggers/users, purple (#F3E5F5) for platform, orange (#FFCCBC) for external |
| **Connections** | Label edges only when the relationship isn't obvious |
| **Complexity** | If a diagram has > 6-7 nodes, split into multiple diagrams or simplify |

### Example (good)

```d2
direction: down

source: "Thing A\n(with context)" {
  style.fill: "#E8F5E9"
}

target: "Thing B\n(with context)" {
  style.fill: "#E3F2FD"
}

source -> target: "relationship"
```

---

## Tech Stack (Documentation Site)

| Tool | Purpose |
|------|---------|
| [Astro](https://astro.build/) | Static site generator |
| [Starlight](https://starlight.astro.build/) | Documentation theme |
| [astro-d2](https://github.com/blurry-dev/astro-d2) | D2 diagram rendering (sketch mode) |
| Markdown/MDX | Content format |
| GitHub Pages | Hosting (`hemaecom.github.io`) |

### Build & Preview

```bash
npm run dev        # Local dev server at localhost:4321
npm run build      # Build to ./docs/
```

---

## Content Organization

```
src/content/docs/golden-path/
├── overview.md              # Landing page
├── tutorial/                # Step-by-step: create your first MFE
├── onboarding/              # Quick reference, env config, patterns
├── infrastructure/          # CDK, Docker, deployment models
├── gateway/                 # CloudFront routing, registration, sitemaps
├── ci-cd/                   # Pipeline, Butler, testing
├── cms/                     # Sanity CMS integration
├── data-apis/               # PODS, Kong, session sharing
├── environments/            # Environment map
├── performance/             # Caching, CDN
├── security/                # WAF, headers
├── monitoring/              # Observability
└── adrs/                    # Architecture Decision Records summary
```

### Sidebar ordering

Use explicit `sidebar.order` in frontmatter within each section. The narrative order should follow the developer journey: understand → set up → build → integrate → deploy → operate.

---

## Iteration Process

1. All changes get a CHANGELOG entry (see `CHANGELOG.md`)
2. Conventions (like diagram orientation) are recorded in the CHANGELOG header
3. Build must pass before considering a change done (`npm run build`)
4. Prefer small, focused iterations over large rewrites

---

## Architecture Decision Sources

ADRs and RFCs are the architectural inputs that shape the Golden Path. They live in Confluence:

- **ADRs**: [COCO Space → Architecture → ADRs](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786)
- **RFCs**: [COCO Space → Architecture → RFCs](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6052642846)
- **Architectural Principles**: [COCO Space → Architecture → Principles](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6149636117)
- **Architectural Standards**: [COCO Space → Architecture → Standards](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6149701644)

The Golden Path synthesizes these decisions into practical guidance. When referencing an ADR, always link directly to its Confluence page.
