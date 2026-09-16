import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

import ts from 'typescript';

/** emit one checked declaration graph with module-format-specific paths and extensions. */
export async function declarations(root: string): Promise<void> {
  const config = ts.readConfigFile(join(root, 'tsconfig.build.json'), ts.sys.readFile);
  if (config.error)
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
  if (diagnostics.length) {
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (file) => file,
        getCurrentDirectory: () => root,
        getNewLine: () => '\n',
      }),
    );
  }
  const writes: Promise<void>[] = [];
  for (const format of ['esm', 'cjs'] as const) {
    const extension = format === 'esm' ? '.js' : '.cjs';
    const result = program.emit(
      undefined,
      (filename, text) => {
        const target = join(
          root,
          'dist',
          format,
          relative(join(root, 'dist/esm'), filename),
        ).replace(/\.d\.ts$/, format === 'esm' ? '.d.ts' : '.d.cts');
        writes.push(
          (async () => {
            await mkdir(dirname(target), { recursive: true });
            await writeFile(target, text);
          })(),
        );
      },
      undefined,
      true,
      {
        afterDeclarations: [
          (context) => {
            const specifier = (node: ts.Expression): ts.Expression =>
              ts.isStringLiteral(node) && /^\.\.?\//.test(node.text) && node.text.endsWith('.ts')
                ? context.factory.createStringLiteral(node.text.slice(0, -3) + extension)
                : node;
            const visit: ts.Visitor = (node) => {
              if (ts.isImportDeclaration(node))
                return context.factory.updateImportDeclaration(
                  node,
                  node.modifiers,
                  node.importClause,
                  specifier(node.moduleSpecifier),
                  node.attributes,
                );
              if (ts.isExportDeclaration(node) && node.moduleSpecifier)
                return context.factory.updateExportDeclaration(
                  node,
                  node.modifiers,
                  node.isTypeOnly,
                  node.exportClause,
                  specifier(node.moduleSpecifier),
                  node.attributes,
                );
              if (
                ts.isImportTypeNode(node) &&
                ts.isLiteralTypeNode(node.argument) &&
                ts.isStringLiteral(node.argument.literal)
              ) {
                const literal = specifier(node.argument.literal) as ts.StringLiteral;
                return context.factory.updateImportTypeNode(
                  node,
                  context.factory.createLiteralTypeNode(literal),
                  node.attributes,
                  node.qualifier,
                  node.typeArguments,
                  node.isTypeOf,
                );
              }
              return ts.visitEachChild(node, visit, context);
            };
            return (node) => ts.visitNode(node, visit) as ts.SourceFile | ts.Bundle;
          },
        ],
      },
    );
    if (result.emitSkipped || result.diagnostics.length)
      throw new Error('Declaration emission failed.');
  }
  await Promise.all(writes);
  // require('@lando/leia') returns the constructor, not the emitted module namespace.
  await writeFile(
    join(root, 'dist/cjs/index.d.cts'),
    "import { Leia as LeiaClass } from './lib/leia.cjs';\ndeclare const Constructor: typeof LeiaClass & { Leia: typeof LeiaClass; default: typeof LeiaClass; 'module.exports': typeof LeiaClass };\ntype Constructor = LeiaClass;\ndeclare namespace Constructor { type Leia = LeiaClass; }\nexport = Constructor;\n",
  );
}
