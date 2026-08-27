/**
 * Tests for shell selection.
 * @file shell.spec.js
 */

'use strict';

const os = require('os');

const chai = require('@lando/chai');

const getShell = require('./../lib/shell');

chai.should();

describe('lib/shell', () => {
  const envKeys = ['COMSPEC', 'MSYSTEM', 'SHELL'];
  let originalEnv;
  let originalPlatform;
  let originalUserInfo;

  const setPlatform = (platform) => {
    Object.defineProperty(process, 'platform', {...originalPlatform, value: platform});
  };

  beforeEach(() => {
    originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
    originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
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
    os.userInfo = () => ({shell: '/bin/bash'});

    getShell().binary.should.equal('/bin/bash');
  });

  it('should prefer SHELL on Windows', () => {
    setPlatform('win32');
    process.env.SHELL = 'zsh';
    process.env.MSYSTEM = 'MINGW64';
    process.env.COMSPEC = 'powershell.exe';

    getShell().binary.should.equal('zsh');
  });

  it('should use bash for MINGW64 on Windows without SHELL', () => {
    setPlatform('win32');
    process.env.MSYSTEM = 'MINGW64';
    process.env.COMSPEC = 'powershell.exe';

    getShell().binary.should.equal('bash.exe');
  });

  it('should use COMSPEC on Windows without SHELL or MINGW64', () => {
    setPlatform('win32');
    process.env.COMSPEC = 'powershell.exe';

    getShell().binary.should.equal('powershell.exe');
  });

  it('should default to cmd on Windows', () => {
    setPlatform('win32');

    getShell().binary.should.equal('cmd.exe');
  });

  it('should use SHELL on Unix without an account shell', () => {
    setPlatform('linux');
    process.env.SHELL = '/bin/bash';
    os.userInfo = () => ({shell: ''});

    getShell().binary.should.equal('/bin/bash');
  });

  it('should default to zsh on macOS', () => {
    setPlatform('darwin');
    os.userInfo = () => ({shell: ''});

    getShell().binary.should.equal('/bin/zsh');
  });

  it('should default to sh on other Unix platforms', () => {
    setPlatform('freebsd');
    os.userInfo = () => ({shell: ''});

    getShell().binary.should.equal('/bin/sh');
  });

  it('should surface account lookup errors on Unix', () => {
    setPlatform('linux');
    os.userInfo = () => {
      throw new Error('account lookup failed');
    };

    (() => getShell()).should.throw('account lookup failed');
  });
});
