export default {
  input: 'src/index.js',
  output: {
    dest: 'dist/index.js',
    format: 'cjs'
  },
  external: ['@textlint/markdown-to-ast']
};
