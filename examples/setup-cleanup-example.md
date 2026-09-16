Setup and Cleanup Example
=========================

Run with `leia examples/setup-cleanup-example.md --shell bash`. Requires Bash and standard Unix tools.
Setup creates a file beside this scenario; cleanup removes it.

Setup
-----

Setup runs before testing, regardless of section order in the file.

```bash
# create a file we can grep for a word
echo "the word is bubba" > test.txt
```

Testing
-------

```bash
# should return the correct word
cat test.txt | grep "bubba"
```

Cleanup
-------

Cleanup runs after testing, including after an ordinary test failure.

```bash
# destroy our test file
rm -f test.txt
```
