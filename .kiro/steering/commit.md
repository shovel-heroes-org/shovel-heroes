# Commit Message Guidelines

Commit messages should follow a consistent format to improve readability and provide clear context about changes. Each commit message should start with a type prefix that indicates the nature of the change.

## Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

## Type Prefixes

All commit messages must begin with one of these type prefixes:

- **docs**: Documentation changes (README, comments, etc.)
- **chore**: Maintenance tasks, dependency updates, etc.
- **feat**: New features or enhancements
- **fix**: Bug fixes
- **refactor**: Code changes that neither fix bugs nor add features
- **test**: Adding or modifying tests
- **style**: Changes that don't affect code functionality (formatting, whitespace)
- **perf**: Performance improvements
- **ci**: Changes to CI/CD configuration files and scripts

## Scope (Optional)

The scope provides additional context about which part of the codebase is affected:

- **cluster**: Changes to EKS cluster configuration
- **db**: Database-related changes
- **iam**: Identity and access management changes
- **net**: Networking changes (VPC, security groups, etc.)
- **k8s**: Kubernetes resource changes
- **module**: Changes to reusable Terraform modules

## Examples

```
feat(cluster): add node autoscaling for billing namespace
fix(db): correct MySQL parameter group settings
docs(k8s): update network policy documentation
chore: update terraform provider versions
refactor(module): simplify EKS node group module
```

## Best Practices

1. Keep the subject line under 72 characters
2. Use imperative mood in the subject line ("add" not "added")
3. Don't end the subject line with a period
4. Separate subject from body with a blank line
5. Use the body to explain what and why, not how
6. Reference issues and pull requests in the footer

These guidelines help maintain a clean and useful git history that makes it easier to track changes and understand the project's evolution.