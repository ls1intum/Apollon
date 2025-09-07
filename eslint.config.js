// eslint.config.js (ESLint 9 flat config)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  // Global ignores (replace your .eslintignore)
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**'],
  },

  // JS baseline
  js.configs.recommended,

  // TS baseline (non–type-aware; no tsconfig needed)
  ...tseslint.configs.recommended,

  // Your project rules & file globs
  {
    files: ['src/main/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-case-declarations': 'off',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-constant-condition': 'off',
      'no-empty': 'off',
      'no-extra-boolean-cast': 'off',
      'no-prototype-builtins': 'off',
      'no-useless-escape': 'off',
      'prefer-const': 'off',

      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
];
