const loopback = require('loopback');
const DataSource = loopback.DataSource;
const DataAccessObject = DataSource.DataAccessObject;
const daoutils = require('loopback-datasource-juggler/lib/utils');
const util = require('oe-cloud/lib/common/util')
var _ = require('lodash');

const log = require('oe-logger')('oe-multi-tenancy');

var _createOptionsFromRemotingContext = loopback.findModel('Model').createOptionsFromRemotingContext;

function _newCreateOptionsFromRemotingContext(ctx) {
  var model = this;
  const modelSettings = model.definition.settings;
  const autoScope = modelSettings.autoscope;
  var options = _createOptionsFromRemotingContext.call(this, ctx);
  if (!autoScope) {
    return options;
  }
  //options.ctx = {tenantId: 'default'};
  if (!options.ctx) options.ctx = {};

  for (var p in options.ctx) {
    if (options.ctx.hasOwnProperty(p) && autoScope.indexOf(p) >=0) {
      delete options.ctx[p];
    }
  }
  for (var i=0; i < autoScope.length; ++i) {
    if (options.accessToken) {
      options.ctx[autoScope[i]] = options.accessToken[autoScope[i]];
    }
  }
  return options;
}

if (_createOptionsFromRemotingContext) {
  for (var m in loopback.registry.modelBuilder.models) {
    if (loopback.registry.modelBuilder.models.hasOwnProperty(m)) {
      loopback.registry.modelBuilder.models[m].createOptionsFromRemotingContext = _newCreateOptionsFromRemotingContext;
    }
  }
}

