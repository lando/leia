Basic Example
=============

Here is a basic example that does not require any setup or cleanup commands. Note that all these commands are going to run relative to the location of the source markdown file, in this case the "examples" directory.

Testing
-------

You can put multiple commands into a single code block. The **FIRST** commented line above the command you are testing will be used for the test's description. Subsequent comments will be ignored.

```bash
# Should return true
true

# Should echo some stuff
# NOTE: Important note for the markdown file that doesnt need to be in the test description
echo "some stuff"

# Should return status code 1
cat filedoesnotexist || echo $? | grep 1

# Should concatenate three commands together
export TEST=thing
env | grep TEST
unset TEST
```

You can also add aditional code blocks under a section. This allows you to better organize and structure your markdown file.


```bash
# Should also run this
true
```

Verifying
---------

You can also add additional testing sections by using the `--test-header` flag. You can run `leia --help` to see the default test headers leia will look for. This gives you further flexibility on how you write your markdown files.

```bash
# Should also also run this
true
```

