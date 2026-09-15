/** Markdown tokens retained by the compiler before scenario normalization. */
export type MarkdownElement =
  { type: 'heading'; depth: 1 | 2; text: string } | { type: 'code'; text: string };

export interface MarkdownDocument {
  file: string;
  elements: MarkdownElement[];
}

export type ModuleFormat = 'commonjs' | 'esm';
export type SectionRole = 'setup' | 'test' | 'cleanup' | 'invalid';

export interface Shell {
  binary: string;
  name: string;
  extension: string;
  args: string[];
}

/** Normalized command bytes are opaque to rendering and script emission. */
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

/** The compatibility-shaped IR exchanged by parsing and generation. */
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

export interface ParseOptions {
  cleanupHeader?: string[];
  moduleFormat?: ModuleFormat | 'auto';
  retry?: number | string;
  setupHeader?: string[];
  shell?: string;
  stdin?: boolean;
  testHeader?: string[];
}

export interface GenerateOptions {
  moduleFormat?: ModuleFormat;
  strip?: boolean;
}
