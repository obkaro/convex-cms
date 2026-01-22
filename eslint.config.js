import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "**/dist/**",
      "**/admin-dist/**",
      "**/_generated/**",
      "**/node_modules/**",
      "**/.output/**",
      "**/convex/_generated/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Allow unused vars with underscore prefix
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Allow explicit any in some cases (component APIs have complex types)
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow require imports for dynamic loading
      "@typescript-eslint/no-require-imports": "off",
      // Allow empty object types for generic constraints
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    // Stricter rules for source files
    files: ["src/**/*.ts"],
    rules: {
      // Enforce explicit return types on public API
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },
  {
    // Relaxed rules for test files
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    // Relaxed rules for example app
    files: ["example/**/*.ts", "example/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
);
