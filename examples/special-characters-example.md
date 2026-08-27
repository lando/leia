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

# Should process literal backticks.
printf '%s\n' 'both `$INTERACTIVE` and `$NONINTERACTIVE` are set.'

# Should process braced shell variables.
printf '%s\n' "${HOME}"

# Should process command substitutions.
printf '%s\n' "$(printf '%s' substitution)"

# Should process unbraced shell variables.
printf '%s\n' "$HOME"

# Should process shell octal escapes.
printf '\033[31mred\033[0m\n'

# Should process shell backreferences.
printf '%s\n' abc | sed -E 's/(a)/\1/'

# Should process multiline commands.
printf '%s\n' first
printf '%s\n' second
```
