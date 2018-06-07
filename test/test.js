var oecloud = require('oe-cloud');
var loopback = require('loopback');
oecloud.boot(__dirname, function (err) {
    if (err) {
        console.log(err);
        process.exit(1);
    }
    oecloud.start();
    oecloud.emit('test-start');
});

var chalk = require('chalk');
var chai = require('chai');
var async = require('async');
chai.use(require('chai-things'));

var expect = chai.expect;

var CacheTest;
var app = oecloud;
var defaults = require('superagent-defaults');
var supertest = require('supertest');

var api = defaults(supertest(app));
var basePath = app.get('restApiRoot');
var url = basePath + '/CacheTests';
describe(chalk.blue('Cache Test Started'), function (done) {
    this.timeout(10000);
    before('wait for boot scripts to complete', function (done) {
        app.on('test-start', function () {
            return done();
        });
    });

    afterEach('destroy context', function (done) {
      done();
    });
    it('t1 write your test case here.', function (done) {
	  return done();
    });


});

