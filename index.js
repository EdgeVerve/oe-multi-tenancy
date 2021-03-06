/**
 *
 * ©20168-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

const logger = require('oe-logger');
const log = logger('Oe-multi-tenancy');
const wrapper = require('./lib/wrapper');
const oecloud = require('oe-cloud');
module.exports = function (app) {
  log.info('Oe-multi-tenancy module loaded');
  oecloud.addContextField('ctx', {
    type: 'object'
  });
  wrapper(app);
};


