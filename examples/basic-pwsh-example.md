Basic POWERSHELL Example
========================

Here is a basic example that is designed to run only on Windows with `powershell.exe` as the shell.

Testing
-------

```
# Should show envvars
Get-ChildItem Env:

# Should echo some stuff
# NOTE: Important note for the markdown file that doesnt need to be in the test description
Write-Output "some stuff"

# Should concatenate three commands together
set TEST=thing
set | findstr TEST | findstr thing
set TEST=
```
