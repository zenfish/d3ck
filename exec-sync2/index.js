var fs = require('fs');
var path = require('path');
var util = require('util');

var _ = require('underscore');
var uuid = require('node-uuid');

var libc = new (require('ffi').Library)(null, {
    system: ['int32', ['string']]
});

/**
 * Get an array of available temporary folders of
 * the system.
 */
function getTempDirs()
{
    /**
     * Map all the keys to process.env and then throw
     * out all "undefineds".
     */
    return _.compact(_.map(['TMPDIR', 'TMP', 'TEMP'], function(key)
    {
        return process.env[key];
    }));
};

/**
 * Get a temp dir, construct file paths, execute, read, cleanup, return.
 */
function execute(command)
{
    var tmp = _.first(getTempDirs());

    if(tmp == null)
    {
        tmp = '/tmp'
        // throw new Error("No temporary folder available.");
    }

    // Create a new UID and construct the
    // absolute file paths.
    var id = uuid.v4(); // v4 for random or v1 for time-based UIDs
    var stdout = path.join(tmp, id + '.stdout');
    var stderr = path.join(tmp, id + '.stderr');

    // Construct the final command and execute it;
    var cmd = util.format('%s > %s 2> %s', command, stdout, stderr);
    libc.system(cmd);

    // Convert the buffers to strings by concatenating it
    // with a string. Then trim this string.
    var out = (fs.readFileSync(stdout) + '').trim();
    var err = (fs.readFileSync(stderr) + '').trim();

    var obj = {stdout: out, stderr: err}

    // We delete the temp files async here because at this
    // point we don't care about them anymore. So why
    // wait for their deletion?
    fs.unlink(stdout);
    fs.unlink(stderr);

    // if(err.length > 0)
    // {
    //     throw new Error(err);
    // }

    return obj;
};

module.exports = execute;
