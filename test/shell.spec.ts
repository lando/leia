import assert from 'node:assert/strict';
import os from 'node:os';

import { getShell } from '../lib/shell.ts';

describe('lib/shell', () => {
  const envKeys = ['COMSPEC', 'MSYSTEM', 'SHELL'];
  let originalEnv: NodeJS.ProcessEnv;
  let originalPlatform: PropertyDescriptor;
  let originalUserInfo: typeof os.userInfo;

  const setPlatform = (platform: NodeJS.Platform) => {
    Object.defineProperty(process, 'platform', { ...originalPlatform, value: platform });
  };

  beforeEach(() => {
    originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
    originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')!;
    originalUserInfo = os.userInfo;
    envKeys.forEach((key) => delete process.env[key]);
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', originalPlatform);
    os.userInfo = originalUserInfo;
    envKeys.forEach((key) => delete process.env[key]);
    envKeys.forEach((key) => {
      if (originalEnv[key] !== undefined) process.env[key] = originalEnv[key];
    });
  });

  it('should prefer the account shell on Unix', () => {
    setPlatform('linux');
    process.env.SHELL = '/bin/zsh';
    os.userInfo = (() => ({ ...originalUserInfo(), shell: '/bin/bash' })) as typeof os.userInfo;

    assert.equal(getShell().binary, '/bin/bash');
  });

  it('should prefer SHELL on Windows', () => {
    setPlatform('win32');
    process.env.SHELL = 'zsh';
    process.env.MSYSTEM = 'MINGW64';
    process.env.COMSPEC = 'powershell.exe';

    assert.equal(getShell().binary, 'zsh');
  });

  it('should use bash for MINGW64 on Windows without SHELL', () => {
    setPlatform('win32');
    process.env.MSYSTEM = 'MINGW64';
    process.env.COMSPEC = 'powershell.exe';

    assert.equal(getShell().binary, 'bash.exe');
  });

  it('should use COMSPEC on Windows without SHELL or MINGW64', () => {
    setPlatform('win32');
    process.env.COMSPEC = 'powershell.exe';

    assert.equal(getShell().binary, 'powershell.exe');
  });

  it('should default to cmd on Windows', () => {
    setPlatform('win32');

    assert.equal(getShell().binary, 'cmd.exe');
  });

  it('should use SHELL on Unix without an account shell', () => {
    setPlatform('linux');
    process.env.SHELL = '/bin/bash';
    os.userInfo = (() => ({ ...originalUserInfo(), shell: '' })) as typeof os.userInfo;

    assert.equal(getShell().binary, '/bin/bash');
  });

  it('should default to zsh on macOS', () => {
    setPlatform('darwin');
    os.userInfo = (() => ({ ...originalUserInfo(), shell: '' })) as typeof os.userInfo;

    assert.equal(getShell().binary, '/bin/zsh');
  });

  it('should default to sh on other Unix platforms', () => {
    setPlatform('freebsd');
    os.userInfo = (() => ({ ...originalUserInfo(), shell: '' })) as typeof os.userInfo;

    assert.equal(getShell().binary, '/bin/sh');
  });

  it('should surface account lookup errors on Unix', () => {
    setPlatform('linux');
    os.userInfo = () => {
      throw new Error('account lookup failed');
    };

    assert.throws(
      () => getShell(),
      (error: Error) => error.message.includes('account lookup failed'),
    );
  });
});
