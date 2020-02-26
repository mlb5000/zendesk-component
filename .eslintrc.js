module.exports = {
  extends: ['airbnb', 'prettier', 'plugin:node/recommended'],
  plugins: ['prettier'],
  rules: {},
  env: {
    node: true,
    mocha: true,
  },
  overrides: [
    {
      files: ['*.test.js', '*.spec*'],
      rules: {
        'no-unused-expressions': 'off',
      },
    },
    {
      files: ['*'],
      rules: {
        'max-len': ['error', { code: 180 }],
      },
    },
  ],
};
