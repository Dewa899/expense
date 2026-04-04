# Translation Workflow

## Dictionary Management
- Keep all translations in a centralized `dictionary` object (e.g., in `src/components/language-provider.tsx`).
- Keys should be camelCase and descriptive (e.g., `submitButtonLabel`, `welcomeMessage`).
- Always provide both `en` and `id` versions.

## Usage in Code
- Use the `t` function from `useLanguage` hook.
- Never hardcode strings in components if they are user-facing.
- For dynamic values in translations, use placeholders or template literals in the `t` function if supported, or split the keys logically.

## Maintenance
- When adding a new feature, first identify all user-facing strings.
- Add them to the dictionary before writing the UI code.
- Ensure keys are grouped logically within the dictionary.
