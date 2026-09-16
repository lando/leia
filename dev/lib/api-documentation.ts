import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { format } from 'prettier';
import ts from 'typescript';

const purposes: Record<string, string> = {
  '.': 'Constructor and orchestration methods',
  './find': 'Scenario-file discovery',
  './parse': 'Markdown parsing and normalization',
  './generate': 'Harness rendering and file generation',
  './run': 'Mocha loading and exit status',
  './shell': 'Shell resolution',
  './module-format': 'Generated-harness module format',
  './compiler': 'Aggregate compiler exports',
  './package.json': 'Package metadata',
};

const display = (parts: ts.SymbolDisplayPart[] | undefined): string =>
  ts.displayPartsToString(parts).trim();

const targetSymbol = (checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol =>
  symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;

const symbolDocumentation = (checker: ts.TypeChecker, symbol: ts.Symbol): string =>
  display(targetSymbol(checker, symbol).getDocumentationComment(checker));

const symbolTags = (checker: ts.TypeChecker, symbol: ts.Symbol): ts.JSDocTagInfo[] =>
  targetSymbol(checker, symbol).getJsDocTags(checker);

const declarationText = (checker: ts.TypeChecker, symbol: ts.Symbol): string => {
  const target = targetSymbol(checker, symbol);
  const declaration = target.valueDeclaration ?? target.declarations?.[0];
  assert.ok(declaration, `Public export ${symbol.name} has no declaration.`);

  if (
    ts.isInterfaceDeclaration(declaration) ||
    ts.isTypeAliasDeclaration(declaration) ||
    ts.isEnumDeclaration(declaration)
  ) {
    return declaration
      .getText()
      .replace(/^export\s+/, '')
      .replace(/^declare\s+/, '');
  }

  if (ts.isClassDeclaration(declaration)) {
    const instance = checker.getDeclaredTypeOfSymbol(target);
    const members = checker
      .getPropertiesOfType(instance)
      .map((member) => {
        const memberDeclaration = member.valueDeclaration ?? member.declarations?.[0];
        assert.ok(memberDeclaration, `Public member ${member.name} has no declaration.`);
        return `  ${member.name}: ${checker.typeToString(
          checker.getTypeOfSymbolAtLocation(member, memberDeclaration),
          memberDeclaration,
          ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
        )};`;
      })
      .join('\n');
    return `class ${symbol.name} {\n${members}\n}`;
  }

  const type = checker.getTypeOfSymbolAtLocation(target, declaration);
  return `const ${symbol.name}: ${checker.typeToString(
    type,
    declaration,
    ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope,
  )};`;
};

const renderTag = (tag: ts.JSDocTagInfo): string | undefined => {
  const value = display(tag.text);
  if (!value || tag.name === 'example') return undefined;
  if (tag.name === 'returns' || tag.name === 'return') return `**Returns:** ${value}`;
  if (tag.name === 'throws' || tag.name === 'throw') return `**Throws:** ${value}`;
  if (tag.name === 'param') {
    const [name = '', ...description] = value.split(/\s+-?\s*/);
    return `- **${name}:** ${description.join(' ').trim()}`;
  }
  return `**${tag.name}:** ${value}`;
};

const renderSymbol = (checker: ts.TypeChecker, symbol: ts.Symbol): string => {
  const documentation = symbolDocumentation(checker, symbol);
  assert.ok(documentation, `Public export ${symbol.name} needs a documentation comment.`);
  const tags = symbolTags(checker, symbol)
    .map(renderTag)
    .filter((tag) => tag !== undefined);
  return [
    `### \`${symbol.name}\``,
    '',
    documentation,
    '',
    '```ts',
    declarationText(checker, symbol),
    '```',
    ...(tags.length ? ['', ...tags.flatMap((tag) => [tag, ''])] : []),
  ].join('\n');
};

const renderExample = (tag: ts.JSDocTagInfo): string => {
  const value = display(tag.text);
  const [title = 'Example', ...body] = value.split('\n');
  assert.ok(body.join('\n').includes('<!-- leia-example:'), `API example ${title} needs a marker.`);
  return [`### ${title}`, '', body.join('\n').trim()].join('\n');
};

/** generate `API.md` from package exports, typescript signatures, and their public docblocks. */
export const generateApiDocumentation = async (root: string): Promise<string> => {
  const configFile = ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile);
  if (configFile.error)
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, '\n'));
  const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root);
  const program = ts.createProgram(config.fileNames, config.options);
  const checker = program.getTypeChecker();
  const packageData = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
    name: string;
    exports: Record<string, string | { import: { default: string } }>;
  };
  const modules = Object.entries(packageData.exports).map(([path, target]) => {
    const packagePath = packageData.name + (path === '.' ? '' : path.slice(1));
    const purpose = purposes[path];
    assert.ok(purpose, `Describe the purpose of package export ${path}.`);
    if (typeof target === 'string') return { packagePath, purpose, exports: [] };
    const sourcePath = target.import.default
      .replace(/^\.\/dist\/esm\//, '')
      .replace(/\.js$/, '.ts');
    const source = program.getSourceFile(resolve(root, sourcePath));
    assert.ok(source, `Missing API source ${sourcePath}.`);
    const moduleSymbol = checker.getSymbolAtLocation(source);
    assert.ok(moduleSymbol, `Missing module symbol for ${sourcePath}.`);
    return { packagePath, purpose, exports: checker.getExportsOfModule(moduleSymbol) };
  });

  const rootModule = modules.find(({ packagePath }) => packagePath === packageData.name)!;
  const leia = rootModule.exports!.find(({ name }) => name === 'Leia');
  assert.ok(leia, 'The root entrypoint must export Leia.');
  const examples = symbolTags(checker, leia)
    .filter(({ name }) => name === 'example')
    .map(renderExample);

  const table = modules.map(({ packagePath, purpose }) => `| \`${packagePath}\` | ${purpose} |`);

  const documented = new Set<string>();
  const reference = modules.flatMap(({ packagePath, exports }) => {
    const unique = exports.filter(
      ({ name }) => name !== 'default' && name !== 'module.exports' && !documented.has(name),
    );
    unique.forEach(({ name }) => documented.add(name));
    if (!unique.length) return [];
    return [
      `## \`${packagePath}\``,
      '',
      ...unique.flatMap((symbol) => [renderSymbol(checker, symbol), '']),
    ];
  });

  const source =
    [
      '# API',
      '',
      '<!-- Generated by `bun run docs:api`. Edit public TypeScript docblocks or the generator, not this file. -->',
      '',
      "This generated reference covers Leia's supported JavaScript and TypeScript package exports.",
      'Start with the [README](./README.md) for installation and CLI onboarding, or use',
      '[ADVANCED](./ADVANCED.md) for scenario behavior and [CLI](./CLI.md) for command options.',
      '',
      '## Usage',
      '',
      'See the [README](./README.md#run-programmatically) for ESM usage.',
      '',
      ...examples.flatMap((example) => [example, '']),
      'Use `run()` only with CommonJS harnesses; `runAsync()` loads either',
      'generated format.',
      '',
      '## Entry points',
      '',
      '| Package path | Purpose |',
      '| ------------ | ------- |',
      ...table,
      '',
      'Only these package paths are supported. Imports through `lib/`, `utils/`, `dist/`, runtime',
      'internals, or CLI implementation files are private and rejected by the package export map.',
      'The `@lando/leia/compiler` entrypoint aggregates the discovery, parsing, generation, shell,',
      'and module-format exports documented below.',
      '',
      'TypeScript consumers should use `node16` or `nodenext` module and module-resolution settings',
      'so package conditions select matching JavaScript and declarations.',
      '',
      ...reference,
    ]
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n';
  return format(source, {
    parser: 'markdown',
    printWidth: 100,
    proseWrap: 'preserve',
    embeddedLanguageFormatting: 'auto',
    singleQuote: true,
  });
};
