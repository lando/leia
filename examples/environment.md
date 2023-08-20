Environment Example
===================

This just checks that our envvars are set as expected.

Setup
-----

```bash
# Should set envvars to indicate correct setup stage
env | grep LEIA_TEST_STAGE | grep setup
```

Testing
-------

```bash
# Should set envvars to indicate leia is running
env | grep LEIA | grep true
env | grep LEIA_ENVIRONMENT | grep true
env | grep LEIA_TEST_RUNNING | grep true
env | grep LEIA_PARSER_RUNNING | grep true

# Should set envvars with the test id
env
env | grep LEIA_TEST_ID | grep environment-example
env | grep LEIA_PARSER_ID | grep environment-example

# Should set envvars with the retry attempt
env
env | grep LEIA_TEST_RETRY | grep 4
env | grep LEIA_PARSER_RETRY | grep 4

# Should set envvars with the test number
env | grep LEIA_TEST_NUMBER | grep 4

# Should set envvars to indicate correct test stage
env | grep LEIA_TEST_STAGE | grep test

# Should set envvars with the leia version
env | grep LEIA_PARSER_VERSION | grep $(node -p "require('./../package.json').version;")
env | grep LEIA_VERSION | grep $(node -p "require('./../package.json').version;")
```

Cleanup
-------

```bash
# Should set envvars to indicate correct cleanup stage
env | grep LEIA_TEST_STAGE | grep cleanup
```
