import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  // Ignore build output folders everywhere
  { ignores: ['dist', '**/dist/**'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Disable prop-types enforcement since project uses TypeScript-generated types / not using prop-types
      'react/prop-types': 'off',
      // User request: disable unused vars rule (may hide real issues; consider re‑enabling later)
      'no-unused-vars': 'off',
      // User request: disable undefined variable check (environment globals like process, require)
      'no-undef': 'off',
      // User request: allow custom / non-standard jsx attributes (e.g. cmdk-* or toast-* data hooks)
      'react/no-unknown-property': 'off',
    },
  },
]
