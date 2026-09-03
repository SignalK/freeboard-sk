// Flat config, replacing the eslintrc-era .eslintrc + .eslintignore that ESLint
// v10 no longer supports. Rule selection mirrors the previous config:
// eslint:recommended + @typescript-eslint recommended, with eqeqeq downgraded.
const js = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'public/**',
      'plugin/**',
      '.angular/**',
      'coverage/**'
    ]
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs['flat/eslint-recommended'].rules,
      ...tsPlugin.configs['flat/recommended']
        .map((c) => c.rules)
        .reduce((all, rules) => Object.assign(all, rules), {}),
      eqeqeq: 'warn',
      // A `_`-prefixed parameter is required by an override/interface
      // contract that some other implementation genuinely reads, even
      // though the base or this particular implementation does not.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
];
