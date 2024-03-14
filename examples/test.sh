# Run linting
npm run lint

# Run unit tests
npm run test:unit

# Clean up previous test
rm -f test/leia.readme.js

# Get the version of Leia
npx leia --version

# Generate tests from this README with some options
npx leia README.md test -r 6 -o readme.js

# Validate the new test was created
cat test/leia.readme.js | grep 'id: leia'

# Validate the retry was set correctly
cat test/leia.readme.js | grep retries | grep 6

# Validate we set some envars
cat test/leia.readme.js | grep "process.env.LEIA_PARSER_RUNNING = 'true';"
cat test/leia.readme.js | grep "process.env.LEIA_PARSER_VERSION"
cat test/leia.readme.js | grep "process.env.LEIA_PARSER_ID"
cat test/leia.readme.js | grep "process.env.LEIA_PARSER_RETRY"
