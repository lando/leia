Setup and Cleanup Example
=========================

Here is an example that does some setup and cleanup before running tests. Note that these commands are going to run relative to the source markdown file, in this case the the "examples" directory.

Setup
-----

These commands should run **before** your main testing ones and can be used to do some setup that you need beforehand. You do not need for this section to come first in the markdown file, Leia should parse it first regardless.

```bash
# create a file we can grep for a word
echo "the word is bubba" > test.txt
```

Testing
-------

Run some tests using stuff setup above.

```bash
# should return the correct word
cat test.txt | grep "bubba"
```

Cleanup
-------

These commands should run **after** your main testing ones and can be used to undo the commands you ran during setup before. You do not need for this section to come last in the markdown file, Leia should parse it last regardless.

```bash
# destroy our test file
rm -f test.txt
```
