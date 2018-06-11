const loopback = require('loopback');
const DataSource = loopback.DataSource;
const DataAccessObject = DataSource.DataAccessObject;
// const daoutils = require('loopback-datasource-juggler/lib/utils');
const util = require('oe-cloud/lib/common/util');
// var _ = require('lodash');

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
  // options.ctx = {tenantId: 'default'};
  if (!options.ctx) options.ctx = {};

  for (var p in options.ctx) {
    if (options.ctx.hasOwnProperty(p) && autoScope.indexOf(p) >= 0) {
      delete options.ctx[p];
    }
  }
  for (var i = 0; i < autoScope.length; ++i) {
    if (options.accessToken) {
      options.ctx[autoScope[i]] = options.accessToken[autoScope[i]];
    }
  }
  log.debug(ctx.options, 'Options found in request ', ctx.options);
  return options;
}

if (_createOptionsFromRemotingContext) {
  for (var m in loopback.registry.modelBuilder.models) {
    if (loopback.registry.modelBuilder.models.hasOwnProperty(m)) {
      loopback.registry.modelBuilder.models[m].createOptionsFromRemotingContext = _newCreateOptionsFromRemotingContext;
    }
  }
}


function byIdQuery(m, id) {
  var pk = util.idName(m);
  var query = {
    where: {}
  };
  query.where[pk] = id;
  return query;
}

function removeIdValue(m, data) {
  delete data[util.idName(m)];
  return data;
}


function isAutoScopeEqual(model, s1, s2) {
  const modelSettings = model.definition.settings;
  const autoScope = modelSettings.autoscope;
  for (var i = 0; i < autoScope.length; ++i) {
    var key = autoScope[i];
    if (s1[key] !== s2[key]) {
      return false;
    }
  }
  return true;
}

function findByIdAndCreate(self, q, data, options, cb) {
  self.find(q, options, function (err, r) {
    if (err) {
      log.error(options, 'Error while finding record. ', err);
      return cb(err);
    }
    if (r && r.length >= 1) {
      var inst = r[0];
      var resultScope = inst._autoScope || inst.__data._autoScope;
      if (!isAutoScopeEqual(self, options.ctx, resultScope)) {
        if (self.definition.settings.idInjection) {
          removeIdValue(self, data);
          return self.create(data, options, cb);
        }

        var error = new Error();
        error.name = 'Data Error';
        error.message = 'AutoScope change update with same id not allowed';
        error.code = 'DATA_ERROR_023';
        error.type = 'ScopeChangeWithSameId';
        error.retriable = false;
        error.status = 422;
        return cb(error);
      }

      return cb('NO-ACTION', inst);
    }

    removeIdValue(self, data);
    return self.create.call(self, data, options, cb);
  });
}

// this function is called for PUT by ID request
const _replaceById = DataAccessObject.replaceById;
DataAccessObject.replaceById = function replaceById(id, data, options, cb) {
  var self = this;
  if (!id) {
    return _replaceById.call(self, id, data, options, cb);
  }

  var q = byIdQuery(this, id);

  findByIdAndCreate(self, q, data, options, function (err, r) {
    if (err === 'NO-ACTION') {
      return _replaceById.call(self, id, data, options, cb);
    }
    if (err) {
      return cb(err);
    }
    return cb(err, r);
  });
};

// this function is called for PUT by ID request

const _updateAttributes = DataAccessObject.prototype.updateAttributes;
DataAccessObject.prototype.updateAttributes =
DataAccessObject.prototype.patchAttributes = function (data, options, cb) {
  var self = this;
  var model = self.constructor;
  if (!model.definition.settings.mixins.MultiTenancyMixin) {
    return _updateAttributes.apply(self, [].slice.call(arguments));
  }

  var id = util.getIdValue(model, data);
  if (!id) {
    return cb(new Error('No ID found for update operation'));
  }

  var q = byIdQuery(model, id);
  findByIdAndCreate(model, q, data, options, function (err, r) {
    if (err === 'NO-ACTION') {
      return _updateAttributes.call(self, data, options, cb);
    }
    if (err) {
      return cb(err);
    }
    return cb(err, r);
  });
};

const _replaceAttributes = DataAccessObject.prototype.replaceAttributes;
DataAccessObject.prototype.replaceAttributes = function (data, options, cb) {
  var self = this;
  var model = self.constructor;
  if (!model.definition.settings.mixins.MultiTenancyMixin) {
    return _replaceAttributes.apply(self, [].slice.call(arguments));
  }

  var id = util.getIdValue(model, data);
  if (!id) {
    return cb(new Error('No ID found for update operation'));
  }

  var q = byIdQuery(model, id);
  findByIdAndCreate(model, q, data, options, function (err, r) {
    if (err === 'NO-ACTION') {
      return _replaceAttributes.call(self, data, options, cb);
    }
    if (err) {
      return cb(err);
    }
    return cb(err, r);
  });
};

const _replaceOrCreate = DataAccessObject.replaceOrCreate;
DataAccessObject.replaceOrCreate = function replaceOrCreate(data, options, cb) {
  var self = this;

  if (!self.definition.settings.mixins.MultiTenancyMixin) {
    return _replaceOrCreate.apply(self, [].slice.call(arguments));
  }

  var id = util.getIdValue(self, data);
  if (!id) {
    return _replaceOrCreate.call(self, data, options, cb);
  }

  var q = byIdQuery(self, id);

  findByIdAndCreate(self, q, data, options, function (err, r) {
    if (err === 'NO-ACTION') {
      return _replaceOrCreate.call(self, data, options, cb);
    }
    if (err) {
      return cb(err);
    }
    return cb(err, r);
  });
};


const _upsert = DataAccessObject.upsert;
DataAccessObject.updateOrCreate =
DataAccessObject.patchOrCreate =
DataAccessObject.upsert = function replaceOrCreate(data, options, cb) {
  var self = this;
  var id = util.getIdValue(self, data);
  if (!id) {
    return _upsert.call(self, data, options, cb);
  }

  var q = byIdQuery(this, id);

  findByIdAndCreate(self, q, data, options, function (err, r) {
    if (err === 'NO-ACTION') {
      return _upsert.call(self, data, options, cb);
    }
    if (err) {
      return cb(err);
    }
    return cb(err, r);
  });
};


