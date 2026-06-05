---
title: Hema100 Frontend Golden Path
description: The recommended way to build frontend MFEs at HEMA — your paved road to production.
---

## Welcome to the Golden Path 👋

The **Frontend Golden Path** is your guide to building frontend services at HEMA. Think of it as the paved road through the forest — you *can* go off-road, but if you follow the path, things just work.

It helps you:

- 🚀 Ship new frontend services faster
- ✅ Make good decisions by default
- 🧭 Stay aligned with platform and architecture goals
- 🧠 Reduce cognitive load — no need to reinvent the wheel

This isn't a rigid rulebook. It's a living guide, shaped by the teams who use it, informed by real-world usage, and curated by the Frontend Platform Team.

---

## What Is the Golden Path?

It's the **default and recommended way** to create, run, and evolve frontend services within the hema100 project. It's fully aligned with HEMA's System Architecture Principles — those define the *why*, the Golden Path focuses on the *how* for frontend.

**The Golden Path is:**
- Common patterns, not rigid rules
- A practical translation of architecture principles into frontend decisions
- A starter kit + guidance — not just documentation
- A shared understanding of how we build things here

**The Golden Path is not:**
- A replacement for ADRs, RFCs, or system-level governance
- A framework you're forced to use
- A blocker for experimentation
- A one-time document — it evolves with the platform

---

## Our Principles

### 🧱 Composable Architecture
Build with independent, reusable building blocks. Each MFE is its own deployable service — teams work in parallel without stepping on each other.

### 🛤️ Open and Flexible Framework
Paved road, not a walled garden. You can deviate when you have good reasons (document it in an ADR!). The platform evolves based on team feedback.

### ♻️ Reusable Solutions
Solve once, use everywhere. Templates give you production-ready scaffolding. CDK constructs handle infra. Shared libraries (Web Shell, HDS) handle the common stuff. You focus on what makes your service unique.

### ⚡ Short Feedback Cycles
Deploy early, deploy often. Automated CI/CD moves code from commit to production quickly. Fast builds, good monitoring, and easy rollback let you iterate with confidence.

### 🏖️ Feature Sandbox Environments
Every feature branch gets its own production-like environment automatically. Test realistically, get stakeholder feedback, then merge with confidence. Butler handles the lifecycle.

### 🎯 Quality by Default
TypeScript, ESLint, Prettier, Vitest, WCAG 2.0 AA accessibility, security headers — all configured from day one. You don't have to think about it; it's already there.

---

## How It All Fits Together

```d2
direction: right

customer: Customer {
  shape: person
}

gateway: CloudFront Gateway {
  shape: cloud
  routing: Routing Function {
    shape: hexagon
  }
}

sfcc: SFCC (Legacy) {
  shape: rectangle
  style.fill: "#FFEBEE"
  style.stroke-dash: 3
}

content: Content MFE {
  shape: rectangle
  style.fill: "#E8F5E9"
  ecs: ECS Fargate
  next: Next.js App
}

pdp: PDP MFE {
  shape: rectangle
  style.fill: "#E3F2FD"
  ecs: ECS Fargate
  next: Next.js App
}

account: Account MFE {
  shape: rectangle
  style.fill: "#FFF3E0"
  lambda: Lambda
}

shared: Shared Platform {
  shape: rectangle
  style.fill: "#F3E5F5"
  kong: Kong API Gateway {
    shape: hexagon
  }
  shell: Web Shell {
    shape: package
  }
  hds: HDS / Tompouce {
    shape: package
  }
  sanity: Sanity CMS {
    shape: cylinder
  }
}

customer -> gateway: HTTPS
gateway.routing -> sfcc: "/* (fallback)" {
  style.stroke-dash: 3
}
gateway.routing -> content: "/inspiratie/*"
gateway.routing -> pdp: "/p/*.html"
gateway.routing -> account: "/account/*"

content -> shared.kong: APIs
content -> shared.shell
content -> shared.hds
content -> shared.sanity
pdp -> shared.kong: APIs
pdp -> shared.shell
pdp -> shared.hds
account -> shared.kong: APIs
```

Each MFE is independent but shares:
- **Web Shell** — consistent header, footer, analytics
- **HDS (Tompouce)** — design system components and tokens
- **Sanity CMS** — content management
- **Gateway** — CloudFront routing to the right service

---

## The Service Lifecycle

```d2
direction: right

create: "Create\n(from template)" {
  shape: rectangle
  style.fill: "#E8F5E9"
}

build: "Build\n(your app)" {
  shape: rectangle
  style.fill: "#E3F2FD"
}

deploy: "Deploy\n(via pipeline)" {
  shape: rectangle
  style.fill: "#FFF3E0"
}

operate: "Operate\n(in production)" {
  shape: rectangle
  style.fill: "#F3E5F5"
}

create -> build -> deploy -> operate
```

At each stage, the Golden Path provides defaults:
- **Create** — Backstage template gives you repo + CDK + CI/CD
- **Build** — Next.js + HDS + Web Shell + i18n + CMS
- **Deploy** — CodePipeline (main) + Butler (feature branches)
- **Operate** — Monitoring, logging, alarms, rollback

---

## Contributing

The Golden Path is an **open framework**. It's shaped by:

- **ADRs** — Architecture Decision Records for concrete decisions ([view all ADRs](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786))
- **RFCs** — Requests for Comments for proposals and discussions
- **Team feedback** — Real usage informs what gets added or changed

ADRs and RFCs are inputs. The Golden Path is the living synthesis.

---

## Ready to Start?

Head to the [Tutorial](/developertrainings-golden-path-docs-experiment/golden-path/tutorial/01-overview) to create your first MFE. ✨
