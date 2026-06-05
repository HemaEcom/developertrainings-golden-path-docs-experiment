# Golden Path Architecture Image — Generation Prompt

Use this prompt in ChatGPT (with DALL-E or image generation) to create the main Golden Path architecture visual.

## The Architecture (What the Image Should Represent)

```
                         ┌─────────────────────┐
                         │     Customer         │
                         │  hema.nl / hema.com  │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   CloudFront Gateway │
                         │  (routing function)  │
                         └──┬───┬───┬───┬──────┘
                            │   │   │   │
              ┌─────────────┘   │   │   └─────────────┐
              ▼                 ▼   ▼                 ▼
     ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌─────┐
     │ Content MFE│   │  PDP MFE   │   │Account MFE │   │SFCC │
     │(ECS Fargate│   │(ECS Fargate│   │  (Lambda)  │   │(leg)│
     └─────┬──────┘   └─────┬──────┘   └────────────┘   └─────┘
           │                 │
           │    ┌────────────┴────────────┐
           │    │                         │
           ▼    ▼                         ▼
     ┌───────────────┐           ┌──────────────┐
     │  Sanity CMS   │           │  PODS (via   │
     │  (content)    │           │  Kong auth)  │
     └───────────────┘           └──────────────┘

     Shared across all MFEs:
     ┌──────────────────────────────────────────┐
     │  Web Shell │ HDS/Tompouce │ CDK Constructs│
     └──────────────────────────────────────────┘
```

## Prompt

```
Create a photorealistic 5-tier decorated cake on a marble cake stand, against a clean white background. The cake represents a micro-frontend platform architecture — each tier is a layer of the system. The style is colorful, playful, and premium — inspired by HEMA's brand (pastel colors: soft blue, pink, green, yellow, cream).

Each tier has dripping icing/frosting and is decorated with small candy elements: pastel-colored building blocks (like LEGO bricks), round sprinkles, chocolate coins with sprinkle patterns, and small candy eggs. Fun and crafted, not childish.

The 5 tiers from BOTTOM to TOP:

**Tier 1 (bottom, largest, soft blue):**
Label: "Platform Infrastructure"
• AWS CDK Constructs (ECS Fargate + ALB)
• CI/CD Pipeline (CodePipeline)
• Butler feature sandboxes
• Monitoring & Alarms

**Tier 2 (pink/cream):**
Label: "Gateway & Routing"
• CloudFront multi-zone distribution
• URL-based routing to MFEs
• VPC Origins (private connectivity)
• Federated sitemaps & SEO

**Tier 3 (soft green):**
Label: "Shared Libraries"
• Web Shell (header, footer, analytics, consent)
• Tompouce/HDS (design system, tokens, components)
• Kong API authentication
• Sanity CMS client & PODS GraphQL client

**Tier 4 (cream/yellow):**
Label: "Application Layer"
• Next.js App Router (standalone Docker)
• Internationalization (next-intl, 5 locales, 2 domains)
• Server Actions & data fetching
• Testing (Vitest + Playwright BDD)

**Tier 5 (top, smallest, soft blue):**
Label: "Your Domain"
• Your MFE — team-owned, independently deployable
• Content pages, product pages, account pages
• Business logic & domain-specific features
• Registered routes on the Gateway

The text should be clearly readable in a clean sans-serif font (printed on fondant strips or piped in chocolate). The feeling: "serious architecture, but we don't take ourselves too seriously." Professional yet delightful — very HEMA.

Aspect ratio: portrait (3:4). High resolution, studio lighting, shallow depth of field.
```

## Why These Layers?

| Tier | What it represents | Key insight |
|------|-------------------|-------------|
| 1. Platform Infrastructure | The AWS foundation every MFE runs on | You don't build this — CDK constructs handle it |
| 2. Gateway & Routing | How traffic reaches your MFE | CloudFront routes by URL path; your MFE registers its routes |
| 3. Shared Libraries | What every MFE consumes | Shell for layout, HDS for UI, clients for data |
| 4. Application Layer | The Next.js conventions and patterns | How you structure your app, handle i18n, test, fetch data |
| 5. Your Domain | The code YOUR team writes | Business logic, pages, features — this is where you add value |

The key message: **layers 1–3 are provided by the platform. Layer 4 is the Golden Path conventions. Layer 5 is where your team focuses.**

## What Changed from the Previous Version

Previous layers:
1. Platform Infrastructure (CDK, Butler)
2. Tompouce (Design System)
3. Frontend Libraries (SDKs)
4. Web Shell (layout, providers)
5. Product Domain Frontend (Next.js app)

Problems with the old version:
- **Gateway was missing** — it's the most important architectural piece (how traffic reaches MFEs)
- **Web Shell was its own layer** — it's actually just a library consumed like any other package
- **Tompouce was separate from other libraries** — in practice, HDS and Shell are both "shared libraries"
- **No mention of data sources** — PODS and Sanity are critical to how MFEs work
- **"Product Domain Frontend" was too specific** — not all MFEs are product pages

The new version groups things by **architectural concern** (infra → routing → shared code → app patterns → your code) rather than by package name.

## Color Palette (HEMA Brand)

- Soft blue: `#A8D5E2`
- Pink: `#F4B8C1`
- Soft green: `#C5E1A5`
- Yellow/cream: `#FFF9C4`
- Cream: `#F5F5F5`

## Tips for Best Results

- If text is hard to read, ask for "text printed on fondant strips" or "labels on ribbon banners"
- Consider generating without text first, then adding text in Figma/Canva
- The cake metaphor works because HEMA's design system is literally called "Tompouce" (a Dutch pastry)
- You may want to add a small "HEMA" logo or tompouce pastry decoration on top
