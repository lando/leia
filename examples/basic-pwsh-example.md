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
Write-Output "some stuff"
Write-Output "yup" | Select-String -Pattern "yup"
Get-ChildItem Env:

# Should fail
Vibe-Alert
```
