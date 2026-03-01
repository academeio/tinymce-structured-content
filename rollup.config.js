import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/plugin.ts',
  output: {
    file: 'dist/plugin.js',
    format: 'iife',
    name: 'StructuredContentPlugin',
    sourcemap: false
  },
  plugins: [
    typescript({ tsconfig: './tsconfig.json', declaration: false, declarationDir: undefined })
  ]
};
