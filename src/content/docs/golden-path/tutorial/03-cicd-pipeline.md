---
title: "2. CI/CD Pipeline"
description: Deploy the CodePipeline infrastructure and install Butler
sidebar:
  order: 3
---

Time to give your service its own deployment pipeline! This is the only manual CDK deploy you'll ever do — after this, the pipeline takes care of itself.

## What Is the Pipeline?

The pipeline is the automated system that takes your code from a `git push` all the way to a running service in AWS. You don't deploy manually — the pipeline does it for you, every time.

HEMA uses a **self-mutating CodePipeline** — meaning the pipeline definition lives in the same repo as your code. If you change the pipeline, it updates itself. If you change your app, it deploys it. One push, everything handled.

---

## How It Works (High Level)

```d2
direction: down

you: Developer {
  shape: person
}

github: GitHub {
  shape: document
}

pipeline: CodePipeline {
  style.fill: "#E3F2FD"
  direction: right

  synth: "Synth\n(audit, lint, test, build)" {
    shape: step
    style.fill: "#C8E6C9"
  }

  mutate: "Self-Mutate" {
    shape: step
    style.fill: "#FFF9C4"
  }

  deploy: "Deploy\n(ECS + ALB + Gateway)" {
    shape: step
    style.fill: "#FFCCBC"
  }

  e2e: "E2E Tests" {
    shape: step
    style.fill: "#E1BEE7"
  }

  synth -> mutate -> deploy -> e2e
}

runtime: "AWS" {
  shape: cloud
  style.fill: "#FFF3E0"
}

you -> github: "git push"
github -> pipeline: "triggers"
pipeline -> runtime: "deploys & tests"
```

**The flow:**
1. You push to `main`
2. **Synth** — installs deps, runs audit + lint + unit tests, builds the app, generates CloudFormation templates
3. **Self-Mutate** — if the pipeline definition changed, it updates itself first
4. **Deploy** — deploys your runtime (ECS Fargate container, load balancer, gateway routes)
5. **E2E** — runs Playwright tests against the live deployed environment

If any step fails, the pipeline stops. No broken code reaches production.

---

## Two Stacks, One Repo

Your repo produces exactly two CloudFormation stacks:

| Stack | Name | What It Contains | Who Deploys It |
|-------|------|------------------|----------------|
| **CI** | `{project}-ci` | The pipeline itself (CodePipeline + CodeBuild) | You (once, manually) |
| **Runtime** | `{project}-rt` | Your running service (ECS + ALB + Gateway) | The pipeline (automatically) |

Think of it this way: the CI stack is the **factory**, and the Runtime stack is the **product**. You build the factory once, and it produces the product on every push.

---

## Deploy the Pipeline Stack

This is a **one-time manual deployment** from your local machine:

```bash
project="{service}-{component}" \
repo="{repository-name}" \
branch="main" \
environmentName="preprod" \
npx cdk deploy
```

**Example** for a PDP service:
```bash
project="omni-web-catalog-pdp" \
repo="omni-web-catalog-pdp" \
branch="main" \
environmentName="preprod" \
npx cdk deploy
```

After this, you never run `cdk deploy` manually again. Every push to `main` triggers the full pipeline.

---

## Verify

1. Open [CloudFormation Console](https://eu-central-1.console.aws.amazon.com/cloudformation/) → both stacks show `CREATE_COMPLETE`
2. Open [CodePipeline Console](https://eu-central-1.console.aws.amazon.com/codesuite/codepipeline/) → all stages green

---

## Install Butler (Feature Sandboxes)

The main pipeline handles `main` branch deployments. But what about feature branches?

**Butler** gives you **per-branch deployments**. Push a feature branch → Butler creates an isolated stack with its own ECS service, ALB, and preview URL. Merge or delete the branch → Butler tears it down automatically.

```d2
direction: down

dev: Developer {
  shape: person
}

github: GitHub {
  shape: document
}

butler: Butler {
  style.fill: "#E8F5E9"
  direction: right

  detect: "Detect branch" {
    shape: step
    style.fill: "#C8E6C9"
  }

  build: "CodeBuild\n(buildspec-ci.yaml)" {
    shape: step
    style.fill: "#BBDEFB"
  }

  deploy: "CDK Deploy\n(sandbox stack)" {
    shape: step
    style.fill: "#FFCCBC"
  }

  detect -> build -> deploy
}

sandbox: "AWS feature sandbox" {
  shape: cloud
  style.fill: "#FFF3E0"
}

cleanup: "Merge / Delete branch" {
  shape: document
}

dev -> github: "push feature/my-feat"
github -> butler: "triggers"
butler -> sandbox: "preview URL"
cleanup -> sandbox: "destroys stack" {
  style.stroke-dash: 3
}
```

This lets you test changes in a production-like environment before merging.

- [What is Butler](https://servicecatalog.ui.hema.digital/docs/default/resource/infrastructure-devops-dev-docs/devtools/releasemanagement/#the-butler-hemas-standard-solution)
- [How to install](https://github.com/HemaEcom/devops-butler/blob/develop/docs/consumers/how-to-deploy.md)

:::tip
Butler uses the `buildspec-ci.yaml` in your repo root to know how to build and deploy feature branches. You'll configure this in [Part 5](/developertrainings-golden-path-docs-experiment/golden-path/tutorial/06-deployment).
:::

---

## Deep Dive

For the full technical details (pipeline permissions, build environment, Playwright integration, garbage collection), see the [CI/CD Pipeline Overview](/developertrainings-golden-path-docs-experiment/golden-path/ci-cd/pipeline-overview/) reference page.
