#!/usr/bin/env node
const { publish } = require('./');
const yargs = require('yargs');
const argv = yargs
  .usage('Usage: $0')
  .example('$0 --tag v2.1.3 --no-push     # by default version from package.json is used')
  .example('$0 --remote https://USER:GITHUB_TOKEN@github.com/USER/REPO')
  .example('$0 --force    # useful in CI and when we want to override the same tag which triggered the build')
  .describe('remote', 'Git remote, may be remote name or full URL to the repo')
  .default('remote', 'origin')
  .describe('tag', 'Tag name to which src will be published, for example: v1.2.3 - by default uses version from package.json')
  .describe('branch', "Branch name to append this new release to - none by default")
  .describe('push', 'Push update to the git remote (pass --no-push to disable)')
  .describe('force', 'Override any existing tag on the remote as well as locally (git tag -f, git push -f)')
  .describe('--', 'All arguments after -- are passed to npm pack command')
  .boolean('push')
  .boolean('force')
  .default('push', 'true')
  .wrap(yargs.terminalWidth())
  .argv;
  
const path = require('path');
const packageJson = require(path.join(process.cwd(), '/package.json'));

// default pack options
let packOptions = { verbose: true };

// packageSpec is the first non-option token after `--`.
// Remaining forwarded tokens are forwarded as packOptions.args.
let packageSpec = process.cwd();
const ddIndex = process.argv.indexOf('--');

if (ddIndex !== -1) {
  const forwarded = process.argv.slice(ddIndex + 1);  
  if (forwarded.length) {
    // find first token that is not an option (doesn't start with '-')
    const firstNonOption = forwarded.findIndex(tok => !tok.startsWith('-'));
    if (firstNonOption !== -1) {
      packageSpec = forwarded[firstNonOption];
      // remove the packageSpec token from forwarded list
      forwarded.splice(firstNonOption, 1);
    }
    if (forwarded.length) {
      packOptions = Object.assign({}, packOptions, { args: forwarded });
    }
  }
}
console.log('Pack options:', packOptions);
 
publish({
  tag: argv.tag,
  branch: argv.branch,
  name: packageJson.name,
  version: packageJson.version,
  push: argv.push && {
    remote: argv.remote,
    force: argv.force,
  },
  packageSpec,
  packOptions: {
    ...packOptions
  }
}).catch(err => {
  if (err.cmd) {
    console.error(err.message);
    if (err.cmd.match(/^git push/)) {
      console.warn(`Cleaned up unpushed tag - please try again`);
    }
  } else {
    console.error(err);
  }
  process.exit(1);
});