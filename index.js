const logger = require('oe-logger');
const log = logger('Oe-multi-tenancy');
const wrapper = require('./lib/wrapper');
module.exports = function () {
  log.info('Oe-multi-tenancy module loaded');
  wrapper(app);
};


