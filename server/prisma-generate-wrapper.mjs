// Polyfill util.styleText for Node 18 compatibility
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const util = require('util');
if (typeof util.styleText === 'undefined') {
  util.styleText = (_format, text) => text;
}

// Now load and run Prisma CLI
import('./node_modules/prisma/build/index.js');
