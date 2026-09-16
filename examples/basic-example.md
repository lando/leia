Basic Example
=============

Run with `leia examples/basic-example.md --shell bash`. Requires Bash and standard Unix tools
(including Git Bash on Windows). Commands run beside this file.

Testing
-------

Blank lines separate tests; the first comment names each test. Commands within one test share a shell.

```bash
# should return true
true

# should echo some stuff
# note: important note for the markdown file that doesnt need to be in the test description
echo "some stuff"

# should return status code 1
cat filedoesnotexist || echo $? | grep 1

# should concatenate three commands together
export TEST=thing
env | grep TEST
unset TEST

# should not concatenate if escape is used
export TEST=thing \
  TEST2=stuff \
  TEST3=morestuff
env | grep TEST
env | grep TEST2
env | grep TEST3
unset TEST
unset TEST2
unset TEST3

# should be a test we have right now but we dont so this is just a stub to remind us
skip
```

A section can contain more than one fenced block.

```bash
# should also run this
true
```

Verifying
---------

`Verifying` matches a default test-heading prefix. Use `--test-header` to select custom prefixes.

```bash
# should also also run this
true
```
