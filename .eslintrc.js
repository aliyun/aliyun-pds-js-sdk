/** @format */

module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'prettier'],

  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    es6: true,
    browser: true,
    node: true,
    mocha: true,
  },
  rules: {
    'no-unused-vars': 'off',
  },
}
