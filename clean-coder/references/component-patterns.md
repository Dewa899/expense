# Component & UI Patterns

## Component Reuse
- **Prop Forwarding**: Always support standard HTML attributes when wrapping native elements (use `React.ComponentProps`).
- **Composition over Inheritance**: Use the `children` prop or slots to make components flexible.
- **Tailwind Merge**: Use the `cn` utility to merge class names safely.

## View vs Component
- **Views**: High-level orchestrators found in `src/app` or `src/components/views`. They handle routing and state orchestration.
- **Components**: UI pieces found in `src/components`. They are ideally stateless or manage local UI state only.

## Performance
- **Memoization**: Use `useMemo` and `useCallback` only when necessary (e.g., passing callbacks to memoized children or expensive calculations).
- **Lazy Loading**: Use `next/dynamic` for heavy client-side components.
