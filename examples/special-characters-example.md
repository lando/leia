Special Characters Example
=============

This is an example to test that special characters and quotes are properly escaped.
And valid javascript strings are generated in the test.

Testing
-------

Run some tests using stuff setup above.

```
# Should process special ('$pec!a1') characters.
echo '"[]\/@%+=:,.-'

# Should process quoted characters.
echo "'\""

# Should process special quoted characters.
echo "\t\n'"

# Should escape backslash character.
echo lando psql -U postgres database -c "\dt"

# Should process literal backslash characters.
echo '\\literal\\'

# Should  process quoted backslash.
echo "\dt"
```
