/**
 *
 * 2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
// This function sets seperator. By default it is set to '/'
const logger = require('oe-logger');
const log = logger('Oe-multi-tenancy');
const utils = require('../../lib/utils');
module.exports = function (app) {
  log.info('Oe-multi-tenancy module booting');
  if ( app.get('MultiTenancySeparator')) {
    utils.setSeparator(app.get('MultiTenancySeparator'));
  }
};


