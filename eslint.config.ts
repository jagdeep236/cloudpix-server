import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import nodePlugin from 'eslint-plugin-n';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  eslint.configs.recommended,
  nodePlugin.configs['flat/recommended-script'],
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    ignores: [
      '**/node_modules/*',
      '**/*.mjs',
      '**/*.js',
      'functions/**',
      'src/repos/UserRepo.ts',
      'src/repos/MockOrm.ts',
    ],
  },
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        warnOnUnsupportedTypeScriptVersion: false,
      },
    },
  },
  {
    plugins: {
      '@stylistic': stylistic,
    },
  },
  {
    files: ['**/*.ts'],
  },
  {
    rules: {
      '@typescript-eslint/explicit-member-accessibility': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/no-unsafe-type-assertion': 'off',
      '@stylistic/no-extra-semi': 'off',
      'max-len': [
        'warn',
        {
          'code': 120,
        },
      ],
      '@stylistic/semi': 'off',
      '@stylistic/member-delimiter-style': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-expressions': 'warn',
      'comma-dangle': 'off',
      'no-console': 'off',
      'no-extra-boolean-cast': 'off',
      'indent': 'off',
      'quotes': 'off',
      'n/no-process-env': 'off',
      'n/no-missing-import': 'off',
      'n/no-unpublished-import': 'off',
      'prefer-const': 'warn',
    },
  },
);
