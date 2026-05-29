# Golden Path Tutorial - Create a Frontend Service

> Source: [Confluence COCO Space - Page ID 6316654631](https://hemaecom.atlassian.net/wiki/spaces/COCO/pages/6316654631)
> Version: 27 | Last synced: 2026-05-28

---

## Overview

This guide walks you through creating a production-ready Next.js frontend service at HEMA using the [TypeScript Skeleton Template](https://servicecatalog.ui.hema.digital/catalog/default/template/scaffolder-typescript-skeleton) as a foundation. You'll manually add Next.js application code and AWS infrastructure (CDK) to create a fully deployable service that follows HEMA standards.

## What This Guide Covers

This is a **manual setup tutorial** designed to help you:

- Create a base TypeScript service from the HEMA Service Catalog
- Scaffold a Next.js application with HEMA standards
- Set up AWS infrastructure using CDK
- Configure CI/CD pipeline with DevOps Butler
- Integrate shared HEMA capabilities (Web Shell, HDS, Analytics)
- Deploy and monitor your service

**Why Manual Setup?**

For now, we are keeping parts of the setup manual in order to:

- Gather customer feedback on the process
- Iterate on an aligned solution based on real usage
- Provide flexibility for different service requirements
- Build understanding of the full stack before automation

Future iterations will automate more of this process through Backstage template actions.

## Prerequisites

Before starting, ensure you have:

- **SSO Access:** Active HEMA SSO account with appropriate permissions
- **AWS CLI:** Configured with HEMA credentials (via SSO)
- **Node.js**: Version 18 or 20 installed
- **Git:** Configured with your HEMA GitHub access
- **Service Catalog Access**: Access to https://servicecatalog.ui.hema.digital
- **Service Name Approval**: Your service name approved by the platform team
  - Request page

---

## Part 1: Foundation Setup

### Step 1: Create Service from TypeScript Skeleton Template

1. Navigate to the HEMA Service Catalog: https://servicecatalog.ui.hema.digital
2. Click **Create** and select **"Create an example TypeScript service"**
3. Fill in the template form with your service details
4. Check your new repository created

**What You Get:**

- Basic TypeScript project structure
- **catalog-info.yaml** pre-configured for Service Catalog
- Standard **HEMA** project files (`.editorconfig`, `.prettierrc`, etc.)
- Basic CDK setup in `lib/` directory with a ci/cd pipeline + infra stack
- Documentation templates in `docs/`

**Repository Structure:**

```
your-service-name/
├── bin/                    # CDK app entry points
├── lib/                    # CDK infrastructure code
│   ├── common/             # Shared constructs
│   ├── pipeline/           # CI/CD pipeline stack
│   └── runtime/            # Runtime environment stack
├── docs/                   # Service documentation
├── your-app/               # Next.js application (to be created)
├── cdk.json                # CDK configuration
├── package.json            # Root package.json for CDK
├── tsconfig.json           # TypeScript config for CDK
├── catalog-info.yaml       # Service Catalog metadata
├── buildspec-ci.yaml       # CodeBuild configuration
└── README.md               # Service overview
```

This repository structure keeps your infrastructure code and application code together, making it easier to:

- Manage deployments from a single repository
- Version infrastructure and application code together
- Share configuration and scripts
- Maintain consistency across environments

### Step 2: Request AWS Accounts

Request the AWS accounts via this [form](https://servicecatalog.ui.hema.digital/docs/default/component/metis-general/architecture-principles/reference/platform-catalog/#add-aws-account)

### Step 3: AWS GitHub connection via CodeStar for CI/CD

- [Request GitHub connection on AWS](https://servicecatalog.ui.hema.digital/docs/default/component/metis-general/architecture-principles/reference/platform-catalog/#aws-github-connection)

### Step 4: Clone Repository Locally

```bash
git clone git@github.com:hema-digital/your-service-name.git
cd your-service-name
# Install dependencies
npm install
```

---

## Part 2: Deploy the CI/CD Pipeline Stack

Deploy the pipeline stack to AWS. This is a **one-time deployment** that creates the CodePipeline infrastructure.

```bash
project="{service}-{component}" \
repo="{repository-name}" \
branch="main" \
environmentName="preprod" \
npx cdk deploy
```

**What This Does:**

The deployment creates:

1. **CI Stack** (`{project}-ci`) - The CodePipeline infrastructure
   - Source stage (GitHub connection)
   - Build stage (npm install, test, lint, audit)
   - Synth stage (CDK synthesis)
   - Deploy stage (runtime stack deployment)

2. **Runtime Stack** (`{project}-rt`) - Deployed automatically by the pipeline
   - Application infrastructure
   - Networking resources

### Verify Deployment

#### Check CloudFormation Stacks

Navigate to [CloudFormation Console](https://eu-central-1.console.aws.amazon.com/cloudformation/home?region=eu-central-1#/stacks) and verify:

- `{project}-ci` - CI/CD pipeline stack (CREATE_COMPLETE)
- `{project}-rt` - Runtime stack (CREATE_COMPLETE)

#### Check CodePipeline

Navigate to [CodePipeline Console](https://eu-central-1.console.aws.amazon.com/codesuite/codepipeline/pipelines) and verify:

- Pipeline `{project}` exists
- First execution completed successfully
- All stages (Source, Build, UpdatePipeline, Deploy) are green

### Understanding the Deployment Model

#### CI/CD Stack vs Runtime Stack

- **CI/CD Stack (`-ci`):** Defines how code is built and deployed
  - Deployed manually by developer
  - Rarely updated (only when pipeline definition changes)
  - Pipelines do not deploy pipelines (important rule)

- **Runtime Stack (`-rt`):** Defines how the application runs
  - Deployed automatically by the CI/CD pipeline
  - Updated frequently (on every commit to main)

### Install and test Butler (feature sandbox)

- Install Butler in the AWS account
  - [What is Butler](https://servicecatalog.ui.hema.digital/docs/default/resource/infrastructure-devops-dev-docs/devtools/releasemanagement/#the-butler-hemas-standard-solution)
  - [How to install](https://github.com/HemaEcom/devops-butler/blob/develop/docs/consumers/how-to-deploy.md)

---

## Part 3: Next.js Application Setup

### Scaffold Next.js Application

Create a Next.js application inside your project in the `app/` directory:

```bash
# From project root
npx create-next-app@latest app --typescript --tailwind --app --no-src-dir
```

**Answer the prompts:**

- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: No
- App Router: Yes
- Import alias: Yes (@/*)

**Updated Repository Structure:**

```
your-service-name/
├── bin/                    # CDK app entry points
├── lib/                    # CDK infrastructure code
├── docs/                   # Service documentation
├── app/                    # Next.js application
│   ├── app/                # Next.js App Router
│   ├── components/         # React components
│   ├── services/           # API services
│   ├── repositories/       # Data repositories
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript types
│   ├── locale-messages/    # i18n translations
│   ├── public/             # Static assets
│   ├── package.json        # App dependencies
│   ├── next.config.ts      # Next.js configuration
│   ├── tailwind.config.ts  # Tailwind configuration
│   └── tsconfig.json       # App TypeScript config
├── cdk.json                # CDK configuration
├── package.json            # Root package.json for CDK
└── README.md               # Service overview
```

---

## Part 4: Integrate & Deploy Next.js Infrastructure Stack

As a practical reference, the current CDK implementation in the **omni-web-content** repository can be used as inspiration and starting point. It already follows this architecture and can help accelerate the setup of new microfrontend services while keeping alignment with the defined structure.

- https://github.com/HemaEcom/omni-web-content-frontend

<!-- TODO: Document the actual CDK constructs needed, environment variables, and configuration steps -->

---

## Part 5: Integrate HEMA Platform Capabilities

### Integrate Tompouce HDS

[Instructions](https://hema-design-system-dev.enterprise-dev-libraries.ui.hema.digital/?path=/docs/react-installation--docs)

<!-- TODO: Add step-by-step HDS integration guide -->

---

## What's Next

- Install **web-shell** library (Layout and global contexts & providers)
- How to deploy test preview sandboxes
- Release to pre-prod and production

<!-- TODO: These sections need to be written -->
