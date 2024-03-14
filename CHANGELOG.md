## v1.0.0-beta.2 - [March 14, 2024](https://github.com/lando/leia/releases/tag/v1.0.0-beta.2)

* Added support for `powershell` and `pwsh`
* Deyarned
* Fixed issue when `chai@5` shows up higher in the dependency tree [#37](https://github.com/lando/leia/issues/37)

## v1.0.0-beta.1 - [August 19, 2023](https://github.com/lando/leia/releases/tag/v1.0.0-beta.1)

* Added more reasonably named environment variables. See [README.md](https://github.com/lando/leia#environment-variables) for details.

## v0.6.7 - [June 17, 2023](https://github.com/lando/leia/releases/tag/v0.6.7)

* Switched release flow over to [@lando/prepare-release-action](https://github.com/lando/prepare-release-action)

## v0.6.6 - [June 17, 2023](https://github.com/lando/leia/releases/tag/v0.6.6)

* Switched release flow over to [@lando/prepare-release-action](https://github.com/lando/prepare-release-action)

## v0.6.5 - [May 8, 2023](https://github.com/lando/leia/releases/tag/v0.6.5)

* Fixed bug causing `,` separated custom headers to not be arrayified correctly

## v0.6.4 - [October 25, 2021](https://github.com/lando/leia/releases/tag/v0.6.4)

* Included `yarn.lock` in published project

## v0.6.3 - [October 19, 2021](https://github.com/lando/leia/releases/tag/v0.6.3)

* Added command `debug` output to tests

## v0.6.2 - [October 19, 2021](https://github.com/lando/leia/releases/tag/v0.6.2)

* Fixed bug causing `leia` to fail when invoked as a dependency

## v0.6.1 - [October 19, 2021](https://github.com/lando/leia/releases/tag/v0.6.1)

* Fixed showstopping bug caused by not including `templates` in `npm` package

## v0.6.0 - [October 19, 2021](https://github.com/lando/leia/releases/tag/v0.6.0)

* Added `--shell` autodetection and support for `bash`, `zsh`, `sh` and `cmd`

## v0.5.1 - [October 19, 2021](https://github.com/lando/leia/releases/tag/v0.5.1)

* Complete redesign: See updated [README.md](./README.md)

## v0.4.0 - [March 18, 2021](https://github.com/lando/leia/releases/tag/v0.4.0)

* Added `--ignore` flag to pass in patterns to exclude from parsing
* Added `--spawn` flag to use `child_process.spawn` instead of `child_process.exec`
* Added `--stdin` flag so we attach `stdin` for the test, this can prevent downstream hanging
* Added support for "multiline" single tests using `\` for readability
* Improved error message on failed tests to show exit code, `stdin` and `stdout`
* Upgraded to `node` `14`

## v0.3.4 - [January 24, 2019](https://github.com/lando/leia/releases/tag/v0.3.4)

* Added some `LEIA_PARSER_` envvars to each file being run.

## v0.3.3 - [November 29, 2018](https://github.com/lando/leia/releases/tag/v0.3.3)

* Fixed bug with generate test `eslint-disable max-len` not being set

## v0.3.2 - [November 28, 2018](https://github.com/lando/leia/releases/tag/v0.3.2)

* Fixed bug causing false-positive detection of not-properly-formatted `markdown` files

## v0.3.1 - [November 27, 2018](https://github.com/lando/leia/releases/tag/v0.3.1)

* Just a little placeholder [#1](https://github.com/lando/leia/issues/1)

## v0.3.0 - [November 27, 2018](https://github.com/lando/leia/releases/tag/v0.3.0)

* Just a little placeholder [#1](https://github.com/lando/leia/issues/1)

