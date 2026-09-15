import { checkCoverage } from './check-coverage.ts';
import { executionTarget } from '../utils/execution-target.ts';

export const testApp = async (root: string, coverage = false): Promise<number> => {
  const target = executionTarget(process.env.LEIA_RUNTIME ?? (coverage ? 'esm' : 'source'), root);
  if (coverage && target.name !== 'esm') throw new Error('Coverage requires LEIA_RUNTIME=esm');
  const command = [
    target.executable,
    ...(target.name === 'source' ? ['--bun'] : []),
    'node_modules/mocha/bin/mocha.js',
    '--timeout',
    '5000',
    'test/*.spec.ts',
  ];
  const child = Bun.spawn(coverage ? ['node', 'node_modules/c8/bin/c8.js', ...command] : command, {
    cwd: root,
    env: { ...process.env, LEIA_RUNTIME: target.name },
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const code = await child.exited;
  if (coverage && code === 0) await checkCoverage(root);
  return code;
};
