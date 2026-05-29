# Butler & Feature Sandbox Deployments

> Source: [omni-web-content-frontend buildspec-ci.yaml](https://github.com/HemaEcom/omni-web-content-frontend/blob/main/buildspec-ci.yaml) | [Butler docs](https://github.com/HemaEcom/devops-butler/blob/develop/docs/consumers/how-to-deploy.md)
> Runtime: Node.js 22 | CDK | CodeBuild

---

## Overview

**Butler** is HEMA's standard solution for feature branch deployments. It automatically creates ephemeral sandbox environments for every feature branch, enabling:

- Realistic testing in production-like conditions
- Stakeholder review before merging
- Parallel development without environment conflicts
- Automatic cleanup when branches are merged/deleted

---

## How Butler Works

```
Developer pushes branch → Butler detects → CodeBuild runs buildspec-ci.yaml → CDK deploys sandbox stack → Preview URL available
```

1. Developer pushes a feature branch (e.g., `feature/new-hero-block`)
2. Butler detects the branch and triggers a CodeBuild project
3. CodeBuild executes `buildspec-ci.yaml` in the repo root
4. The buildspec installs dependencies, builds the app, and runs `cdk deploy`
5. A new CloudFormation stack is created with a unique name based on the branch
6. A preview URL is generated for testing
7. When the branch is merged or deleted, Butler automatically destroys the stack

---

## The buildspec-ci.yaml File

This is the file Butler uses to build and deploy your feature branch. Place it in the **repo root** (not in `src/`).

### Reference Implementation

```yaml
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 22
    commands:
      - echo "starting BRANCH:$BRANCH , CLEAN_BRANCH_NAME:$CLEAN_BRANCH_NAME , BUTLER_STACK_TAG:$BUTLER_STACK_TAG"

  build:
    commands:
      # Authenticate with CodeArtifact for @hema packages
      - export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token --domain hema-prod --domain-owner 715027721839 --region eu-central-1 --query authorizationToken --output text)
      - npm config set //hema-prod-715027721839.d.codeartifact.eu-central-1.amazonaws.com/npm/main/:_authToken $CODEARTIFACT_AUTH_TOKEN
      - npm config set @hema:registry https://hema-prod-715027721839.d.codeartifact.eu-central-1.amazonaws.com/npm/main/
      # Install root (CDK) dependencies
      - npm ci
      # Install app dependencies
      - cd src && npm ci --legacy-peer-deps && cd ..
      # Build CDK (synthesize)
      - npm run build
      # Deploy the sandbox stack
      - export LOWERCASE_BRANCH_NAME=$(echo "$CLEAN_BRANCH_NAME" | tr '[:upper:]' '[:lower:]')
      - project="your-service-$LOWERCASE_BRANCH_NAME" repo="your-service-name" branch="$BRANCH" butlerStackTag="$BUTLER_STACK_TAG" environmentName="$LOWERCASE_BRANCH_NAME" npx cdk deploy --require-approval=never

  post_build:
    commands:
      - echo "Build completed on `date`"
```

### Key Points

| Aspect | Detail |
|--------|--------|
| **Node.js version** | Must be 22 (matches production) |
| **CodeArtifact auth** | Required for `@hema/*` packages from private registry |
| **Two npm installs** | Root for CDK deps, `src/` for app deps |
| **`--legacy-peer-deps`** | Needed for HDS RC version resolution |
| **Branch name** | Lowercased and used as the stack/environment name |
| **`butlerStackTag`** | Tag that Butler uses to track and clean up stacks |
| **`--require-approval=never`** | Automated deploy, no manual approval |

---

## Environment Variables Provided by Butler

Butler injects these variables into the CodeBuild environment:

| Variable | Example | Purpose |
|----------|---------|---------|
| `BRANCH` | `feature/new-hero-block` | Full branch name (with slashes) |
| `CLEAN_BRANCH_NAME` | `feature-new-hero-block` | Branch name safe for stack names (slashes → dashes) |
| `BUTLER_STACK_TAG` | `butler-managed` | Tag for stack lifecycle management |

---

## Sandbox URL Pattern

Once deployed, your sandbox is accessible at:

```
https://frontend-{branch-name}.{service-name}.ui-test.hema.digital/
```

Example:
```
https://frontend-feature-new-hero-block.omni-web-content.ui-test.hema.digital/
```

The gateway registration also creates preview URLs for each zone:
```
https://{branch-name}.omni-web-content.ui-int.hema.digital/
```

---

## Stack Naming Convention

The CDK stack name is derived from the branch:

```
{service-name}-{lowercase-branch-name}-rt
```

Example: `omni-web-content-feature-new-hero-block-rt`

This appears in CloudFormation and can be used to find your sandbox resources.

---

## Writing Your buildspec-ci.yaml

### Minimal Template

```yaml
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 22
    commands:
      - echo "BRANCH:$BRANCH CLEAN_BRANCH_NAME:$CLEAN_BRANCH_NAME"

  build:
    commands:
      - export CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token --domain hema-prod --domain-owner 715027721839 --region eu-central-1 --query authorizationToken --output text)
      - npm config set //hema-prod-715027721839.d.codeartifact.eu-central-1.amazonaws.com/npm/main/:_authToken $CODEARTIFACT_AUTH_TOKEN
      - npm config set @hema:registry https://hema-prod-715027721839.d.codeartifact.eu-central-1.amazonaws.com/npm/main/
      - npm ci
      - cd src && npm ci --legacy-peer-deps && cd ..
      - npm run build
      - export LOWERCASE_BRANCH_NAME=$(echo "$CLEAN_BRANCH_NAME" | tr '[:upper:]' '[:lower:]')
      - project="YOUR-SERVICE-$LOWERCASE_BRANCH_NAME" repo="YOUR-REPO" branch="$BRANCH" butlerStackTag="$BUTLER_STACK_TAG" environmentName="$LOWERCASE_BRANCH_NAME" npx cdk deploy --require-approval=never
```

Replace:
- `YOUR-SERVICE` — Your service name (e.g., `omni-web-catalog-pdp`)
- `YOUR-REPO` — Your GitHub repository name

### Adding Tests to the Build

You can add test steps before the deploy:

```yaml
  build:
    commands:
      # ... (auth + install steps) ...
      # Run unit tests
      - cd src && npm test && cd ..
      # Run linting
      - cd src && npm run lint && cd ..
      # Build and deploy
      - npm run build
      - # ... (cdk deploy) ...
```

---

## Installing Butler

Butler must be installed in your AWS account before it can manage feature branches.

1. **What is Butler:** [Documentation](https://servicecatalog.ui.hema.digital/docs/default/resource/infrastructure-devops-dev-docs/devtools/releasemanagement/#the-butler-hemas-standard-solution)
2. **How to install:** [Installation guide](https://github.com/HemaEcom/devops-butler/blob/develop/docs/consumers/how-to-deploy.md)

---

## Automatic Cleanup

Butler automatically destroys sandbox stacks when:
- The feature branch is **merged** into main
- The feature branch is **deleted**

The `butlerStackTag` CDK context variable is used to identify which stacks Butler manages. Stacks without this tag are not touched.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails at `npm ci` | Check CodeArtifact auth token is valid; ensure `.npmrc` is not overriding registry |
| Stack deploy fails | Check CloudFormation events in AWS Console for the specific error |
| Preview URL not working | Verify gateway registration includes the branch environment; check ALB health checks |
| Stack not cleaned up | Verify `butlerStackTag` is passed to CDK deploy; check Butler logs |
| `--legacy-peer-deps` needed | HDS RC versions may conflict with other deps; this flag resolves peer dep warnings |

---

## Reference

- Butler documentation: https://github.com/HemaEcom/devops-butler
- Platform catalog (Butler install): https://servicecatalog.ui.hema.digital/docs/default/resource/infrastructure-devops-dev-docs/devtools/releasemanagement/
- Example buildspec: `omni-web-content-frontend/buildspec-ci.yaml`
