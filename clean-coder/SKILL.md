---
name: clean-coder
description: Focuses on high-quality, reusable, and neat code. Specialized in React component extraction, systematic translation management, and architectural separation of concerns. Use this skill when the user wants to refactor code, improve UI architecture, or ensure neat development standards.
---

# Clean Coder Skill

This skill transforms Gemini CLI into a senior software engineer focused on maintainability, scalability, and code aesthetics.

## Core Workflows

### 1. Component Extraction
Before building a new UI, analyze if existing components in `src/components/ui` can be reused. If a new pattern is identified, create it as a reusable atom first.

### 2. Systematic Translation
Always follow the centralized translation workflow. Do not implement user-facing strings without adding them to the dictionary first.
- See [references/translation-workflow.md](references/translation-workflow.md)

### 3. Structural Refactoring
When a file grows beyond 300 lines or contains multiple logical concerns, split it into views and sub-components.
- See [references/component-patterns.md](references/component-patterns.md)

### 4. Code Quality
Adhere strictly to clean code principles: proper naming, early returns, and minimal indentation.
- See [references/coding-standards.md](references/coding-standards.md)

## Quality Checklist
- Is the code DRY?
- Are all strings translated?
- Is the component folder structure logical?
- Are types/interfaces descriptive?
