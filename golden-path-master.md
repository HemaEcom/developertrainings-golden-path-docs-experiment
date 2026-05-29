# Hema100 Composable Frontend Golden Path

> Source: [Confluence COCO Space - Page ID 6290538583](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6290538583)
> Version: 18 | Last synced: 2026-05-28

---

## 1. Purpose

The **Frontend Golden Path** defines the default and recommended way to create, run, and evolve frontend services within the **hema100 project**.

Its goal is to help teams:

- Build new frontend services faster
- Make good decisions by default
- Stay aligned with platform, architecture, and business goals
- Reduce cognitive load and avoid reinvention

This Golden Path is intended to be owned and evolved by a frontend chapter and acts as a paved road:

> **You can go off-road, but if you follow the path, things just work.**

Inspired by well-known engineering practices and literature:

- *Accelerate* — fast flow, stability, and low friction
- *Spotify Model* — autonomy with alignment
- *Building Micro-frontends* — independent delivery with strong contracts

## 2. What the Golden Path Is (and Is Not)

The Frontend Golden Path is designed to be **fully aligned with HEMA's existing System Architecture Principles**, while being scoped specifically to the **hema100 project**.

Those principles already establish the ***why*** at system level (modularity, scalability, agility, ownership).

The Golden Path focuses on the ***how*** for frontend services.

**The Golden Path is:**

- A set of common patterns, not rigid rules
- A practical translation of architecture principles into frontend decisions
- A starter kit plus guidance, not just documentation
- A way to encode platform decisions once so teams don't repeat them
- A shared understanding of how frontend services are built here

**The Golden Path is not:**

- A redefinition of company architecture principles
- A replacement for ADRs, RFCs, or system-level governance
- A framework teams are forced to use
- A blocker for experimentation
- A one-time document (it evolves with the platform)

## 3. Golden Path Principles

The Frontend Golden Path is built on seven core principles that enable teams to deliver value quickly while maintaining quality and consistency.

### Composable Architecture
*Build with building blocks, not monoliths*

Build with independent, reusable capabilities rather than monoliths. Micro-frontend architecture enables parallel development and independent deployment.

### Open and Flexible Framework
*Paved road, not a walled garden*

The Golden Path is a paved road, not a walled garden. Teams can deviate when they have good reasons, documented through ADRs and RFCs. The platform evolves based on team feedback and contributions, balancing autonomy with alignment.

### Reusable Solutions
*Solve once, use everywhere*

Solve problems once and use everywhere. Backstage templates provide production-ready scaffolding, CDK constructs encapsulate infrastructure best practices, and shared libraries (web-core, web-shell, Tompouce HDS) provide common functionality. Teams focus on differentiation, not reinventing wheels.

### Short Feedback Cycles
*Deploy early, deploy often*

Deploy early and often. Automated CI/CD pipelines move code from commit to production quickly. Fast build times, comprehensive monitoring, and rapid rollback capabilities enable teams to learn and iterate faster.

### Feature Sandbox Environments
*Test in production-like conditions before production*

Test in production-like conditions before production. Ephemeral PR-based environments are created automatically for every feature branch, enabling realistic testing and stakeholder review. Environments are automatically cleaned up when branches are merged or deleted.

### Frontend Configuration & Good Practices

Quality and consistency by default. TypeScript for type safety, ESLint and Prettier for code consistency, Vitest for testing, and WCAG 2.0 AA accessibility built into components. Performance budgets, security scanning, and documented coding standards reduce cognitive load and ensure maintainability.

### DORA Metrics Alignment

These principles directly support the four key metrics:

- **Deployment Frequency:** Automated CI/CD, PR environments, Butler automation
- **Lead Time for Changes:** Templates, reusable solutions, composable architecture
- **Time to Restore Service:** Automated rollback, monitoring, feature flags
- **Change Failure Rate:** Sandbox testing, automated tests, progressive deployment

By following the Golden Path, teams get production-ready infrastructure, CI/CD pipelines, monitoring, security, and compliance configured from day one, reducing time to first deployment.

## 4. Core Concept: Service-Oriented Frontend

The core definition of **what a service is** and how services are organized across our IT landscape is already documented and shared at organizational level and applies to the hema100 project as well.

**Source of truth:** *Understanding Services in Our IT Landscape* (internal documentation)

This Golden Path **does not redefine or duplicate** that model.

Instead, it:

- Builds **on top of the existing service definition**
- Applies it specifically to **frontend services**
- Clarifies how frontend services fit into the broader service ecosystem

Throughout this document, when we refer to a *frontend service*, we mean:

> A service as defined by the company, implemented with frontend responsibilities and capabilities.

## 5. Open Contribution Model (ADRs & RFCs)

The Frontend Golden Path is not a closed or static document.

Our company culture encourages **organic, open contribution** through tools such as:

- **Architecture Decision Records (ADRs)** to capture concrete decisions
- **Requests for Comments (RFCs)** to propose, discuss, and evolve ideas

The Golden Path reflects the **direction emerging from these instruments**:

- It consolidates agreed decisions
- It documents proven patterns
- It makes implicit knowledge explicit

In this sense, the Golden Path should be seen as an **open framework** for the frontend platform:

- Informed by real usage
- Shaped by teams
- Curated by the Frontend Platform Team

ADRs and RFCs are inputs. The Golden Path is the living synthesis.

### 5.1 List of Related ADRs

- Teams SHOULD use NextJS
- Use PODS to get the product data
- Use Newsletter API
- Use Sanity directly for the editorial content

## 6. Golden Path Lifecycle

- Create with **template** → Build → Deploy → Operate
- Default tooling and automation at each stage

## 7. DevOps & Delivery

- CI/CD expectations for frontend services
- PR-based environments and short-lived stacks
- Platform-managed deployment automation, with **Butler** as the current implementation

## 8. Infrastructure CDK

The base infrastructure for the microfrontend setup is described in the following diagram. It outlines the core components, environment structure, and how services are connected across the platform.

> [Infrastructure Diagram - Screenshot 2026-02-12](https://hemaecom.atlassian.net/wiki/download/attachments/6290538583/Screenshot%202026-02-12%20at%2012.00.02.png)

There is also a spike created to investigate and validate some of the assumptions and technical decisions related to this setup:

- [Hema100 - Production Infrastructure](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/...)

As a practical reference, the current CDK implementation in the **omni-web-content** repository can be used as inspiration and starting point. It already follows this architecture and can help accelerate the setup of new microfrontend services while keeping alignment with the defined structure.

- https://github.com/HemaEcom/omni-web-content-frontend
