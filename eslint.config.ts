import eslint from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import { importX } from 'eslint-plugin-import-x';
import nodePlugin from 'eslint-plugin-n';
import security from 'eslint-plugin-security';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const TS_FILES = ['**/*.{ts,mts,cts}'];
const TEST_FILES = ['**/*.{test,spec}.ts', 'test/**/*.ts'];
const CONFIG_FILES = [
  '*.config.{ts,mts,js,mjs,cjs}',
  'eslint.config.ts',
  '.prettierrc.ts',
];

export default defineConfig(
  // ───────────── Ignores (was "ignorePatterns") ─────────────
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'coverage/**',
      '.yarn/**',
      '.pnp.*',
      '**/*.min.js',
      '**/*.d.ts',
    ],
  },

  // ───────────── Base: JS + TS recommended (type-aware) ─────────────
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    files: TS_FILES,
    extends: [
      tseslint.configs.recommendedTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
  },

  // ───────────── Language options (was "env", "parser", "parserOptions") ─────────────
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2025 },
      parserOptions: {
        projectService: true,
      },
    },
  },

  // ───────────── Import plugin (flat) ─────────────
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  {
    settings: {
      'import-x/resolver': {
        // Resolves "./x.js" → "./x.ts" and tsconfig "paths" such as "@/*"
        typescript: {
          project: './tsconfig.json',
          alwaysTryTypes: true,
        },
        node: {
          extensions: ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts'],
        },
      },
    },
  },

  // ───────────── Node / security plugins (cherry-picked rules) ─────────────
  security.configs.recommended,
  {
    plugins: { n: nodePlugin },
    rules: {
      'n/prefer-node-protocol': 'error', // import fs from "node:fs"
      'n/no-process-exit': 'error',
      'n/handle-callback-err': 'error',
      'n/no-sync': ['warn', { allowAtRootLevel: true }],
      'n/no-new-require': 'error',
    },
  },

  // ───────────── Project rules (with architecture boundaries) ─────────────
  {
    rules: {
      // General
      'no-console': 'off',
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': ['error', 'always'],
      'prefer-arrow-callback': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      // Express handlers legitimately assign to req/res (req.user, res.locals…)
      'no-param-reassign': [
        'error',
        {
          props: true,
          ignorePropertyModificationsFor: [
            'req',
            'res',
            'request',
            'response',
            'socket',
            'ws',
          ],
        },
      ],
      'consistent-return': 'error',
      // "no-duplicate-imports" is replaced by import/no-duplicates (understands `import type`)
      'no-duplicate-imports': 'off',

      // Imports & Architecture Boundaries
      'import-x/no-unresolved': 'error',
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            // 1. Utils and Libs must remain pure and cannot import from higher layers
            {
              target: './src/{utils,libs}/**/*',
              from: './src/{config,connection,database,services,controllers,routes,apps}/**/*',
              message:
                'Architecture Violation: Utils and Libs cannot depend on infrastructure, business logic, or application layers.',
            },
          ],
        },
      ],
      'import-x/order': [
        'error',
        {
          'groups': [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'pathGroups': [
            {
              pattern: '@/**',
              group: 'internal',
              position: 'after',
            },
          ],
          'pathGroupsExcludedImportTypes': ['builtin'],
          'newlines-between': 'always',
          'alphabetize': { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/extensions': [
        'error',
        'ignorePackages',
        { js: 'always', mjs: 'always', cjs: 'always', ts: 'never' },
      ],
      // Added
      'import-x/no-duplicates': 'error',
      'import-x/first': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-useless-path-segments': 'error',
      'import-x/no-cycle': ['warn', { maxDepth: 10 }], // WARN: cycles cause subtle ESM init bugs

      // Safety / code quality (added)
      'no-eval': 'error',
      'no-new-func': 'error',
      'no-throw-literal': 'off', // replaced by @typescript-eslint/only-throw-error
      'no-else-return': 'warn',
      'no-lonely-if': 'warn',
      'no-nested-ternary': 'warn',
      'no-promise-executor-return': 'error',
      'require-atomic-updates': 'off', // very noisy, many false positives
      'complexity': ['warn', 15],
      'max-depth': ['warn', 4],
      'max-params': ['warn', 5],
      'security/detect-object-injection': 'off', // too many false positives with typed code
    },
  },

  // ───────────── TypeScript rules ─────────────
  {
    files: TS_FILES,
    rules: {
      // Was: "no-unused-vars": off + TS version with ^_ ignore patterns
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^(_|$)',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      // Was "off". WARN while you migrate; switch to "error" when clean (AGENTS.md policy: no any).
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'error', // ESM project (relaxed for .cjs below)

      // Type imports (works with `import/order` "type" group and verbatimModuleSyntax)
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',

      // Promises and async: the most valuable bug-catchers for an API server
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        // Express 4 async handlers: wrap them with an async-handler helper instead of relying on this rule
        { checksVoidReturn: { arguments: false, attributes: false } },
      ],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/prefer-promise-reject-errors': 'error',
      '@typescript-eslint/require-await': 'warn',

      // Correctness
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
      '@typescript-eslint/prefer-readonly': 'warn',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true },
      ],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'minimumDescriptionLength': 10,
        },
      ],

      // Naming (light)
      '@typescript-eslint/naming-convention': [
        'warn',
        { selector: 'typeLike', format: ['PascalCase'] },
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          leadingUnderscore: 'allow',
        },
      ],

      // Redundant with TypeScript itself (and slower)
      'import-x/no-unresolved': 'off', // tsc reports unresolved imports; the resolver still powers import/order
      'import-x/named': 'off',
      'import-x/namespace': 'off',
      'import-x/default': 'off',
      'import-x/no-named-as-default-member': 'off',
      'consistent-return': 'off', // replaced by tsc `noImplicitReturns`
    },
  },

  // ───────────── CommonJS files (sequelize-cli migrations, seeders, scripts) ─────────────
  {
    files: ['**/*.cjs', 'migrations/**/*.js', 'seeders/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'import-x/no-commonjs': 'off',
      'import-x/no-unresolved': 'off',
      'import-x/extensions': 'off',
    },
  },

  // ───────────── Plain JS / config files: no type-aware linting ─────────────
  {
    files: ['**/*.{js,mjs,cjs}', ...CONFIG_FILES],
    extends: [tseslint.configs.disableTypeChecked],
    rules: { 'import-x/no-unresolved': 'off' },
  },

  // ───────────── Tests ─────────────
  {
    files: TEST_FILES,
    extends: [vitest.configs.recommended],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      'max-params': 'off',
      'complexity': 'off',
      'import-x/no-cycle': 'off',
      'vitest/expect-expect': 'error',
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'warn',
      'vitest/no-identical-title': 'error',
      'vitest/valid-title': 'error',
      'vitest/consistent-test-it': ['error', { fn: 'it' }],
    },
  },

  // ───────────── Prettier must be last (turns off stylistic rules that clash) ─────────────
  prettier,
);
