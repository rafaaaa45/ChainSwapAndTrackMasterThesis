import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  Object.assign({}, js.configs.recommended, {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        require: true,
        module: true,
        process: true,
        __dirname: true,
        console: true,
        setTimeout: true,
        URL: true,
        Buffer: true,
      },
    },
  }),
  prettier,
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
];
