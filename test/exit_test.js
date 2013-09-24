'use strict';

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

var fs = require('fs');
var exec = require('child_process').exec;
var async = require('async');
var jsdiff = require('diff');

var _which = require('which').sync;
function which(command) {
  try {
    return _which(command);
  } catch (err) {
    return false;
  }
}

// Look for grep first (any OS). If not found (but on Windows) look for find,
// which is Windows' horribly crippled grep alternative.
var grep = which('grep') || process.platform === 'win32' && which('find');

function run(command, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  command += ' 2>&1';
  if (options.pipe) {
    command += ' | ' + grep + ' "std"';
  }
  exec(command, function(error, stdout) {
    callback(command, error ? error.code : 0, stdout);
  });
}

function showDiff(actual, expected) {
  actual = actual.replace(/\r\n/g, '\n');
  expected = expected.replace(/\r\n/g, '\n');
  if (actual === expected) {
    return true;
  } else {
    return jsdiff.diffLines(expected, actual).map(function(d) {
      if (d.removed) {
        return '**EXPECTED** ' + d.value;
      } else if (d.added) {
        return '**UNEXPECTED** ' + d.value;
      }
    }).filter(Boolean).join('');
  }
}

function fixture(filename) {
  return String(fs.readFileSync(filename));
}

exports['exit'] = {
  setUp: function(done) {
    this.origCwd = process.cwd();
    process.chdir('test/fixtures');
    done();
  },
  tearDown: function(done) {
    process.chdir(this.origCwd);
    done();
  },
  'grep': function(test) {
    test.expect(1);
    // Many unit tests depend on this.
    test.ok(grep, 'A suitable "grep" or "find" program was not found in the PATH.');
    test.done();
  },
  'stdout stderr': function(test) {
    var counts = [10, 100, 1000];
    test.expect(counts.length);
    async.eachSeries(counts, function(n, next) {
      run('node log.js 0 ' + n + ' stdout stderr', {pipe: true}, function(command, code, actual) {
        var expected = fixture(n + '-stdout-stderr.txt');
        test.equal(true, showDiff(actual, expected), command);
        next();
      });
    }, test.done);
  },
  'stdout': function(test) {
    var counts = [10, 100, 1000];
    test.expect(counts.length);
    async.eachSeries(counts, function(n, next) {
      run('node log.js 0 ' + n + ' stdout', {pipe: true}, function(command, code, actual) {
        var expected = fixture(n + '-stdout.txt');
        test.equal(true, showDiff(actual, expected), command);
        next();
      });
    }, test.done);
  },
  'stderr': function(test) {
    var counts = [10, 100, 1000];
    test.expect(counts.length);
    async.eachSeries(counts, function(n, next) {
      run('node log.js 0 ' + n + ' stderr', {pipe: true}, function(command, code, actual) {
        var expected = fixture(n + '-stderr.txt');
        test.equal(true, showDiff(actual, expected), command);
        next();
      });
    }, test.done);
  },
  'exit codes': function(test) {
    var codes = [0, 1, 123];
    test.expect(codes.length * 2);
    async.eachSeries(codes, function(n, next) {
      run('node log.js ' + n + ' 10 stdout stderr', {pipe: false}, function(command, code, actual) {
        test.equal(code, n, 'should have exited with ' + n + ' error code.');
        var expected = fixture('10-stdout-stderr.txt');
        test.equal(true, showDiff(actual, expected), command);
        next();
      });
    }, test.done);
  },
};
