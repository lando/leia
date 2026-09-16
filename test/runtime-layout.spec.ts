import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadSubject } from './subject.ts';

const { runtimeLayout } = await loadSubject('utils/runtime-layout');

describe('utils/runtime-layout', () => {
  it('should resolve source and bundled modules to the same metadata and adjacent runtime', () => {
    const root = path.resolve('a package # with spaces');
    for (const filename of [
      'lib/run-cli.ts',
      'lib/parse.ts',
      'dist/esm/lib/run-cli.js',
      'dist/esm/lib/compiler.js',
      'dist/esm/bin/leia.js',
      'dist/cjs/lib/compiler.cjs',
      'dist/cjs/bin/leia.cjs',
    ]) {
      const extension = filename.endsWith('.ts') ? 'ts' : filename.endsWith('.cjs') ? 'cjs' : 'js';
      // entrypoint bundles contain the library modules; their runtime still belongs in lib/.
      const layout = runtimeLayout(pathToFileURL(path.join(root, filename)).href);
      assert.equal(path.resolve(layout.root), root);
      assert.equal(layout.packageFile, path.join(root, 'package.json'));
      assert.equal(
        layout.runtimePath,
        path.join(
          root,
          extension === 'ts'
            ? 'lib/runtime.ts'
            : extension === 'cjs'
              ? 'dist/cjs/lib/runtime.cjs'
              : 'dist/esm/lib/runtime.js',
        ),
      );
    }
  });
});
