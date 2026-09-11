import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import prettier from 'eslint-config-prettier';
import eslintPromise from 'eslint-plugin-promise';
import tslint from 'typescript-eslint';

export default [
  { ignores: ['dist/**', 'coverage/**', '**/*.timestamp-*.mjs'] },

  js.configs.recommended,
  ...tslint.configs.recommended,
  eslintPromise.configs['flat/recommended'],

  {
    rules: {
      curly: ['error', 'all'],
      'default-case': 'error',
      'default-case-last': 'error',
      eqeqeq: 'error',
      'no-console': 'error',
      'no-nested-ternary': 'error',
    },
  },

  {
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', next: ['return', 'break'], prev: '*' },
        { blankLine: 'always', next: '*', prev: ['const', 'let', 'var'] },
        {
          blankLine: 'any',
          next: ['const', 'let', 'var'],
          prev: ['const', 'let', 'var'],
        },
      ],
    },
  },

  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tslint.parser,
      parserOptions: { project: ['./tsconfig.json'] },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // src/core 是純函式層：禁止碰 chrome.* 與 DOM 全域
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'chrome',
          message: 'src/core 不得使用 chrome.*，請經由 src/platform 注入。',
        },
        { name: 'document', message: 'src/core 不得依賴 DOM。' },
        { name: 'window', message: 'src/core 不得依賴 DOM。' },
      ],
    },
  },

  {
    files: ['**/*.ts'],
    rules: { 'no-console': ['error', { allow: ['warn', 'error'] }] },
  },

  prettier,
];
