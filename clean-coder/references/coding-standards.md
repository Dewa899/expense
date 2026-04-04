# Coding Standards & Clean Code

## General Principles
- **DRY (Don't Repeat Yourself)**: If logic is used more than twice, extract it to a utility function or hook.
- **Single Responsibility**: Each component should do one thing well.
- **Declarative Code**: Prefer descriptive variable names over comments.
- **Early Returns**: Use early returns to reduce indentation depth.

## Folder Structure
- `src/components/ui`: Low-level, reusable atoms (Buttons, Inputs).
- `src/components/features`: Complex components tied to a specific feature.
- `src/hooks`: Custom React hooks for shared logic.
- `src/lib`: Utility functions and third-party configurations.

## Naming Conventions
- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities: `camelCase.ts`
- Constants: `UPPER_SNAKE_CASE`
