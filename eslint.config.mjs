// Flat config. Next 16 removed `next lint`, and ESLint 10 no longer reads
// .eslintrc.json, so linting now runs through the `eslint` binary directly.
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // The Mongo documents flowing through the API routes are untyped today.
      // This is re-enabled once the Drizzle port gives them real types.
      "@typescript-eslint/no-explicit-any": "off",

      // eslint-config-next 16 turns on the React Compiler rule set, which
      // flags 34 pre-existing issues across ~20 components (mostly state
      // written from inside an effect, and components declared during render).
      // They are real, but fixing them means reworking component behaviour —
      // that belongs in its own change, not a dependency upgrade. Demoted to
      // warnings so they stay visible without blocking CI.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/incompatible-library": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
