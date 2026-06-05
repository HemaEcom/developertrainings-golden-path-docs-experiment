---
title: "Architecture Decision Records"
sidebar:
  order: 1
---

> **Confluence**: [ADRs page (all decisions)](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786)

Architecture Decision Records capture significant technical decisions for the hema100 project. They live in Confluence as the source of truth — this page is an index for quick reference.

## ADR Index

| # | Title | Status | Impact on Golden Path |
|---|-------|--------|----------------------|
| [0001](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786) | Build a header/footer component | DRAFT | Web Shell library |
| [0003](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786) | Teams SHOULD use Next.js | DECIDED | Framework choice |
| [0004](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6000803842) | Session sharing between SFCC and Next.js | IN PROGRESS | Cookie-based session |
| [0005](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6062833665) | Use OpenNext for account pages | DECIDED | Alternative deployment model |
| [0007](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5639995418) | Guidelines on client components in design system | DECIDED | HDS usage patterns |
| [0008](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6223953921) | Use PODS to get product data | DECIDED | Data layer (GraphQL) |
| [0009](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6232047668) | Use Sanity directly for editorial content | DECIDED | CMS integration |
| [0010](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6232604673) | CMS NOT to consume Bynder directly | DECIDED | DAM sync architecture |
| [0011](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786) | Use Newsletter API via Kong | DECIDED | API patterns |
| [0012](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786) | Server actions vs API routes | DECIDED | Code patterns |
| [0013](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786) | Use CloudFront Functions for gateway router | DECIDED | Gateway routing & caching |
| [0015](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786) | Auth with API management (Kong) | DECIDED | API authentication |
| [0016](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786) | Multi-zone support | IN PROGRESS | Zone architecture |
| [0017](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786) | URL namespace structure | DECIDED | URL conventions |
| [0018](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786) | Release flow for Tompouce (HDS) | DECIDED | Library releases |
| [0019](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786) | Analytics integration | DONE | Shell analytics |
| [0020](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786) | MFE protection at edge | — | Security (WAF, basic auth) |

### Unnumbered / Draft ADRs

| Title | Impact |
|-------|--------|
| Federated sitemap architecture | SEO / gateway |
| Domain-based locale routing | i18n |
| Visual regression testing for Tompouce | Testing |

:::note
All ADRs are accessible from the [ADRs parent page in Confluence](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786). Go there for the full decision details, analysis, and consequences.
:::

## Where ADRs Are Reflected in This Guide

| ADR Topic | Documented In |
|-----------|---------------|
| Next.js framework | Tutorial |
| Web Shell (header/footer) | Tutorial Part 6 |
| Sanity CMS integration | CMS section |
| Bynder DAM sync | CMS → DAM Sync |
| CloudFront routing + caching | Gateway section, Performance |
| Multi-zone architecture | Gateway → Multi-zone Config |
| Kong API authentication | Data & APIs → Kong Authentication |
| PODS product data | Data & APIs → PODS Integration |
| Session sharing | Data & APIs → Session Sharing |
| URL namespace | Gateway → Multi-zone Config |
| MFE protection (WAF) | Security |
| Domain-based locale routing | Onboarding → i18n Setup |
| Server actions vs API routes | Onboarding |

## ADR Process

ADRs follow the `HEM100-ADR-XXXX` naming convention with statuses: **Draft → In Progress → Decided → Superseded**.

To propose a new architectural decision, create an ADR in Confluence using the template on the [ADRs page](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/5997002786).
