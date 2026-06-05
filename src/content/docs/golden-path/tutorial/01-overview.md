---
title: "Tutorial: Build Your First MFE"
description: From zero to production — create a HEMA micro-frontend step by step.
sidebar:
  order: 1
---

## Hey there! 👋

Ready to build a micro-frontend at HEMA? This tutorial takes you from an empty repo to a fully deployed service that's part of the hema.nl/hema.com ecosystem.

By the end, you'll have a real, production-ready service with all the bells and whistles:

- ✅ **Next.js 15+** with App Router and standalone Docker output
- ✅ **AWS infrastructure** (ECS Fargate + ALB or OpenNext/Lambda) managed entirely by CDK
- ✅ **CI/CD pipeline** that deploys on every push to main
- ✅ **HEMA Design System** for consistent, accessible UI
- ✅ **Web Shell** wrapping your app with header, footer, and analytics
- ✅ **Internationalization** across 5 locales and 2 domains
- ✅ **Sanity CMS** integration for content-driven pages
- ✅ **Gateway registration** so CloudFront routes traffic to you
- ✅ **Testing** with Vitest (unit) and Playwright BDD (e2e)
- ✅ **Feature sandboxes** — every branch gets its own environment

## How It Works (The Big Picture)

At HEMA, the online store is made of **micro-frontends** — independent Next.js apps that each own a piece of the customer experience. To the customer, it's one website. To us, each service is independent and deployable on its own.

```d2
direction: right

customer: Customer {
  shape: person
}

gateway: CloudFront Gateway {
  shape: cloud
  router: Routing Function {
    shape: hexagon
  }
}

content: Content MFE {
  shape: rectangle
  style.fill: "#E8F5E9"
  label: "/inspiratie/*"
}

yours: Your New Service {
  shape: rectangle
  style.fill: "#E0F7FA"
  style.stroke-dash: 3
  label: "/your-route/*\n(could be here!)"
}

pdp: PDP MFE {
  shape: rectangle
  style.fill: "#E3F2FD"
  label: "/p/*.html"
}

account: Account MFE {
  shape: rectangle
  style.fill: "#FFF3E0"
  label: "/account/*"
}

sfcc: SFCC (legacy) {
  shape: rectangle
  style.fill: "#FFEBEE"
  style.stroke-dash: 3
  label: "/* (default fallback)"
}

customer -> gateway: HTTPS
gateway.router -> content
gateway.router -> yours: {
  style.stroke-dash: 3
}
gateway.router -> pdp
gateway.router -> account
gateway.router -> sfcc: {
  style.stroke-dash: 3
}
```

Each MFE registers its routes with the Gateway and shares the Web Shell and Design System with all other MFEs.

Most MFEs run as **Docker containers on ECS Fargate** — this is the default for high-traffic pages (content, PDP). For lighter or bursty-traffic services (e.g., account pages), there's also the **OpenNext (serverless/Lambda)** option. This tutorial follows the ECS Fargate path.

## Reference Implementations

Need to peek at how it's done? These repos follow the Golden Path:

- 🛒 [omni-web-catalog-pdp](https://github.com/HemaEcom/omni-web-catalog-pdp) — Product pages, PODS/GraphQL, Kong auth, server actions
- 📝 [omni-web-content-frontend](https://github.com/HemaEcom/omni-web-content-frontend) — Content pages, Sanity CMS, live preview, sitemaps

## Before You Start

Make sure you have:

- **SSO Access** — Active HEMA account
- **AWS CLI** — Configured with HEMA credentials ([how to get access](https://servicecatalog.ui.hema.digital/docs/default/component/metis-general/aws/aws-access/))
- **Node.js 22+** — Check with `node --version`
- **Git** — Configured with HEMA GitHub access
- **Service Catalog** — Access to https://servicecatalog.ui.hema.digital
- **Service Name** — Approved by the platform team

## Let's Go! 🚀

| Part | What you'll do | Time estimate |
|------|---------------|---------------|
| [1. Foundation Setup](/developertrainings-golden-path-docs-experiment/golden-path/tutorial/02-foundation) | Create repo, request AWS accounts | 30 min + wait time |
| [2. CI/CD Pipeline](/developertrainings-golden-path-docs-experiment/golden-path/tutorial/03-cicd-pipeline) | Deploy your pipeline to AWS | 15 min |
| [3. Next.js App Setup](/developertrainings-golden-path-docs-experiment/golden-path/tutorial/04-nextjs-setup) | Scaffold app, Docker, routes | 45 min |
| [4. Core Capabilities](/developertrainings-golden-path-docs-experiment/golden-path/tutorial/05-capabilities) | HDS, Shell, i18n, CMS, testing, APIs | 2–3 hours |
| [5. Deployment](/developertrainings-golden-path-docs-experiment/golden-path/tutorial/06-deployment) | Butler sandboxes, pipeline flow | 30 min |
| [6. Local Development](/developertrainings-golden-path-docs-experiment/golden-path/tutorial/07-local-dev) | Run locally, env vars, daily workflow | 20 min |

:::tip
You don't need to do everything in one sitting! Parts 1–3 get you a deployable skeleton. Part 4 adds capabilities one by one. Parts 5–6 are operational knowledge you'll use daily.
:::
