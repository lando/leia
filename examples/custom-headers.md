Custom Headers Example
======================

Run with `leia examples/custom-headers.md --shell bash -s Hello -t Sup -c Goodbye`.
Requires Bash and standard Unix tools. The flags assign these custom headings to setup, tests, and cleanup.

Hello
-----

Setup runs before testing, regardless of section order in the file.

```bash
# create a file we can grep for a word
echo "the word is bubba" > test.txt
```

Sup
---

```bash
# should return the correct word
cat test.txt | grep "bubba"
```

Goodbye
-------

Cleanup runs after testing, including after an ordinary test failure.

```bash
# destroy our test file
rm -f test.txt
```
