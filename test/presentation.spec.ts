import assert from 'node:assert/strict';

import { loadSubject } from './subject.ts';

const { colorLevel, createPresentation, createStyles, LANDO_PRIMARY } =
  await loadSubject('lib/presentation');

class BufferStream {
  readonly isTTY: boolean;
  output = '';

  constructor(isTTY: boolean) {
    this.isTTY = isTTY;
  }

  write(value: string): void {
    this.output += value;
  }
}

describe('lib/presentation', () => {
  it('should use the Lando accent and semantic styles for an interactive terminal', () => {
    const stream = new BufferStream(true);
    const styles = createStyles(stream, {});
    assert.equal(LANDO_PRIMARY, '#ed3f7a');
    assert.equal(styles.accent('Usage').includes('\u001b['), true);
    assert.equal(styles.green('done').includes('\u001b['), true);
    assert.equal(styles.yellow('warn').includes('\u001b['), true);
    assert.equal(styles.red('error').includes('\u001b['), true);
  });

  it('should disable color for NO_COLOR, CI, and non-TTY streams', () => {
    const tty = new BufferStream(true);
    const pipe = new BufferStream(false);
    assert.equal(colorLevel(tty, { NO_COLOR: '1' }), 0);
    assert.equal(colorLevel(tty, { CI: 'true' }), 0);
    assert.equal(colorLevel(pipe, {}), 0);
    assert.equal(createStyles(tty, { NO_COLOR: '1' }).accent('Usage'), 'Usage');
  });

  it('should let FORCE_COLOR explicitly control every stream', () => {
    const pipe = new BufferStream(false);
    assert.equal(colorLevel(pipe, { FORCE_COLOR: '1', NO_COLOR: '1' }), 1);
    assert.equal(colorLevel(pipe, { FORCE_COLOR: '3' }), 3);
    assert.equal(colorLevel(pipe, { FORCE_COLOR: '0' }), 0);
    assert.equal(
      createStyles(pipe, { FORCE_COLOR: '1' }).accent('Usage').includes('\u001b['),
      true,
    );
  });

  it('should keep status on stdout and diagnostics on stderr', () => {
    const stdout = new BufferStream(false);
    const stderr = new BufferStream(false);
    const presentation = createPresentation({ environment: {}, stdout, stderr });
    presentation.start(1, 2);
    presentation.warn('--spawn');
    presentation.complete(2, 1, 1);
    presentation.error(
      new Error('CODE: 17\nSTDOUT: output\nSTDERR: diagnostic'),
      'run tests',
      'Fix it.',
    );

    assert.equal(
      stdout.output,
      'run     2 generated test files from 1 Markdown source\n' +
        'failed  2 generated test files; 1 failure\n',
    );
    assert.match(stderr.output, /^warn {3} --spawn/m);
    assert.match(stderr.output, /^next {3} Remove the flag/m);
    assert.match(stderr.output, /^next {3} Review the failing test output/m);
    assert.match(stderr.output, /^error {2} Could not run tests: CODE: 17/m);
    assert.match(stderr.output, /^ {8}STDOUT: output/m);
    assert.match(stderr.output, /^ {8}STDERR: diagnostic/m);
    assert.equal(`${stdout.output}${stderr.output}`.includes('\u001b['), false);
  });
});
