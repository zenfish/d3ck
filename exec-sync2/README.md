# node-exec-sync
Execute shell commands synchronously.

## How does it work?
No special voodoo here. Just the usual "pipe to file, read file" you might have seen before and a somewhat cleaner code.

## Installation
I haven't published it with ``npm`` so you need to install it with the tarball at the moment:
```
npm install http://github.com/prc322/node-exec-sync/tarball/master
```

## Usage
```
var execSync = require('node-exec-sync');
var result = execSync('your shell cmd');
```

## Roadmap
- Publish to ``npm``
