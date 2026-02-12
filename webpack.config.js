import path from 'node:path';

const demoPath = path.join(process.cwd(), 'demo');

const ignoreWarnings = [
  {
    module: /context.js/,
    message: /require function is used/,
  },
  {
    module: /simple-loader/,
    message: /dependency is an expression/
  },
];

export default {
  mode: process.env.WP_MODE ?? 'development',
  devtool: process.env.WP_TOOL ?? false,
  ignoreWarnings,
  output: {
    clean: false,
    path: demoPath,
    filename: 'main.bundle.js',
  },
  entry: path.join(demoPath, 'main.src.js'),
}
