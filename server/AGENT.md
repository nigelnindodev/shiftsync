# Agent Guidelines & Best Practices

These rules are specific to the Server-side codebase architecture and should be strictly adhered to during autonomous task execution or pair-programming.

## Strong Typing & Constants
- **No Magic Strings**: Avoid scattering hardcoded raw string literals in business logic, exceptions, or validation returns. Extract them into strongly typed string literal unions or read-only `as const` dictionary objects (e.g. `export const ConstraintCode = { ... } as const;`). This guarantees strict IDE intellisense, exhaustive switch checking, and ensures 0-cost runtime footprint compared to standard TS enums.

## Dependency Management
- **Isolate Shared Types**: Always place shared domain interfaces, enums, and utility types in dedicated `types.ts` or `constants.ts` files at the root of a feature module boundary (e.g., `src/scheduling/types.ts`).
- **Never Export Types from Implementation Logic**: To strictly prevent circular import mapping issues, **never** export externally-consumed types directly from heavy runtime files like `.service.ts`, `.entity.ts`, or `.repository.ts`. Consumers should only import these shapes from the dedicated type definition files.
