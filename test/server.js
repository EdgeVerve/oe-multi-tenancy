/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
var oecloud = require('oe-cloud');
var loopback=require('loopback');

oecloud.attachMixinsToBaseEntity("MultiTenancyMixin");


oecloud.boot(__dirname, function (err) {
  oecloud.start();
  oecloud.emit('test-start');
  var Customer=loopback.findModel("Customer");
});

