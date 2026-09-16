Subdirectory Example
====================

Run with `leia examples/subdirectory-example/subdir-example.md --shell bash`. Requires Bash and
standard Unix tools. Copy `text1.txt` and `text2.txt` alongside this file; paths resolve from the
scenario directory, not the invoking directory.

Testing
-------

```bash
# analyze the contents of our first file
cat text1.txt | grep test

# analze the contents of our second file
cat text2.txt | grep test2
```
