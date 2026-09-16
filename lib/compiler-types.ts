/** markdown tokens retained by the compiler before scenario normalization. */
export type MarkdownElement =
  { type: 'heading'; depth: 1 | 2; text: string } | { type: 'code'; text: string };

/** one markdown file and the ordered top-level tokens retained by leia. */
export interface MarkdownDocument {
  file: string;
  elements: MarkdownElement[];
}

/** concrete generated-harness module formats. */
export type ModuleFormat = 'commonjs' | 'esm';
/** scenario roles assigned from matching level-two headings. */
export type SectionRole = 'setup' | 'test' | 'cleanup' | 'invalid';

/** shell executable and argument template used for a scenario script. */
export interface Shell {
  binary: string;
  name: string;
  extension: string;
  args: string[];
}

/** normalized command bytes are opaque to rendering and script emission. */
export interface Scenario {
  args: string[];
  shell: string;
  command: string;
  skip: boolean;
  script: string;
  describe: string[];
  id: string;
  number: number;
  section: string;
}

/** the compatibility-shaped ir exchanged by parsing and generation. */
export interface Harness {
  file: string;
  id: string;
  chaiPath: string;
  runtimePath: string;
  debugPath: string;
  destination: string;
  moduleFormat: ModuleFormat;
  retry: number;
  cwd: string;
  stdin: 'inherit' | 'pipe';
  text: string;
  type: 'title';
  version: string;
  tests: Partial<Record<SectionRole, Scenario[]>>;
}

/** options for markdown normalization and the `parse()` convenience function. */
export interface ParseOptions {
  cleanupHeader?: string[];
  moduleFormat?: ModuleFormat | 'auto';
  retry?: number | string;
  setupHeader?: string[];
  shell?: string;
  stdin?: boolean;
  testHeader?: string[];
}

/** options for rendering generated harnesses. */
export interface GenerateOptions {
  moduleFormat?: ModuleFormat;
  strip?: boolean;
}
