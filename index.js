var logger = require('oe-logger');
var log = logger('Oe-multi-tenancy');
require("./lib/wrapper")
module.exports = function () {
  log.info('Oe-multi-tenancy module loaded');
};


