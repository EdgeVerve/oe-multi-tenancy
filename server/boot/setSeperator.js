const logger = require('oe-logger');
const log = logger('Oe-multi-tenancy');
const utils = require('../../lib/utils');
module.exports = function (app) {
  log.info('Oe-multi-tenancy module booting');
  if ( app.get('MultiTenancySeparator')) {
    utils.setSeparator(app.get('MultiTenancySeparator'));
  }
};


