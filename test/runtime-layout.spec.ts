import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { runtimeLayout } from '../utils/runtime-layout.ts';

describe('utils/runtime-layout', () => {
  it('should resolve source and bundled modules to the same metadata and adjacent runtime', () => {
    const root = path.resolve('a package # with spaces');
    for (const filename of [
      'lib/app.ts',
      'lib/parse.ts',
      'dist/lib/app.js',
      'dist/lib/compiler.js',
      'dist/bin/leia.js',
    ]) {
      const extension = filename.endsWith('.ts') ? 'ts' : 'js';
      // Entrypoint bundles contain the library modules; their runtime still belongs in lib/.
      const layout = runtimeLayout(pathToFileURL(path.join(root, filename)).href);
      assert.equal(path.resolve(layout.root), root);
      assert.equal(layout.packageFile, path.join(root, 'package.json'));
      assert.equal(
        layout.runtimePath,
        path.join(root, extension === 'ts' ? 'lib/runtime.ts' : 'dist/lib/runtime.js'),
      );
    }
  });
});
