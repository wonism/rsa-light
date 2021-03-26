const off = 0;
const warn = 1;
const error = 2;

module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  plugins: [
    '@typescript-eslint',
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': error,
    '@typescript-eslint/indent': off,
    '@typescript-eslint/member-ordering': off,
    '@typescript-eslint/no-empty-function': off,
    '@typescript-eslint/no-unused-vars': off,
    '@typescript-eslint/no-non-null-assertion': warn,
    'comma-dangle': [
      error,
      {
        arrays: 'always-multiline',
        objects: 'always-multiline',
        imports: 'always-multiline',
        exports: 'always-multiline',
        functions: 'only-multiline',
      },
    ],
    curly: [error, 'all'],
    eqeqeq: [error, 'always', { null: 'ignore' }],
    'eol-last': [error, 'always'],
    indent: [error, 2],
    'max-len': [error, { code: 150 }],
    'newline-before-return': error,
    'no-console': warn,
    'no-else-return': error,
    'no-empty': [error, { allowEmptyCatch: true }],
    'no-empty-pattern': off,
    'no-multi-spaces': error,
    'no-multiple-empty-lines': [error, { max: 1, maxEOF: 0, maxBOF: 0 }],
    'no-implicit-coercion': error,
    'no-shadow': off,
    'no-trailing-spaces': error,
    'no-unused-vars': off,
    'no-var': error,
    quotes: [error, 'single', { allowTemplateLiterals: true }],
  },
};
