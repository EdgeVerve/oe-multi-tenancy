﻿/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
const loopback = require('loopback');
const DataSource = loopback.DataSource;
const DataAccessObject = DataSource.DataAccessObject;
const util = require('oe-cloud/lib/common/util');
const log = require('oe-logger')('oe-multi-tenancy');
// const _ = require('lodash');

module.exports = function (app) {
  app.setBaseEntityAutoscope = function (autoscopeFields) {
    var obj = {
      autoscope: autoscopeFields
    };
    app.addSettingsToBaseEntity(obj);
  };
  var newProperties = {
    properties: {
      upward: {
        type: 'Boolean',
        required: false,
        default: false
      },
      depth: {
        type: 'Number',
        required: false,
        default: 0
      },
      autoscope: {
        type: ['String']
      }
    }
  };
  app.addSettingsToModelDefinition(newProperties);
};


var _createOptionsFromRemotingContext = loopback.findModel('Model').createOptionsFromRemotingContext;
var rootModel = loopback.findModel('Model');

function _newCreateOptionsFromRemotingContext(ctx) {
  var model = this;
  const modelSettings = model.definition.settings;
  const autoScope = modelSettings.autoscope;
  var options = _createOptionsFromRemotingContext.call(this, ctx) || {};
  options.ctx = options.ctx || {};

  if (!autoScope) {
    if (options && options.accessToken && options.accessToken.ctx) {
      options.ctx = Object.assign(options.ctx, options.accessToken.ctx);
    }
    return options;
  }

  for (var p in options.ctx) {
    if (options.ctx.hasOwnProperty(p) && autoScope.indexOf(p) >= 0) {
      delete options.ctx[p];
    }
  }
  if (options && options.accessToken && options.accessToken.ctx) {
    options.ctx = Object.assign(options.ctx, options.accessToken.ctx);
  }

  log.debug(options.ctx, 'Options found in request ', options.ctx);
  if (model.setOptions) {
    options = model.setOptions(ctx, options, this);
  }

  if (rootModel.setOptions) {
    options = rootModel.setOptions(ctx, options, this);
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

function findByIdAndCreate(self, id, data, options, cb) {
  if (!id) {
    return self.create(data, options, cb);
  }
  // try to find if for given Id, there is record exists
  // if record exists, compare autoscope and either create new or update existing record
  var q = byIdQuery(self, id);
  // ignoredAutoscope is used as we are just interested in finding existance of record
  var flagOptionsModified = false;
  if (options && typeof options.ignoreAutoScope === 'undefined') {
    options.ignoreAutoScope = true;
    flagOptionsModified = true;
  }
  self.find(q, options, function (err, r) {
    if (flagOptionsModified) {
      delete options.ignoreAutoScope;
    }
    if (err) {
      log.error(options, 'Error while finding record. ', err);
      return cb(err);
    }
    if (r && r.length >= 1) {
      var inst = r[0];
      var resultScope = inst._autoScope || inst.__data._autoScope;
      // if retrieved record has same autoscope as options then record is qualified for update
      // else new record will be created.
      if (options && !isAutoScopeEqual(self, options.ctx, resultScope)) {
        if (self.definition.settings.idInjection) {
          removeIdValue(self, data);
          return self.create(data, options, cb);
        }
        var error = new Error({ name: 'Data Error', message: 'AutoScope change update with same id not allowed', code: 'DATA_ERROR_023', type: 'ScopeChangeWithSameId', retriable: false, status: 422 });
        return cb(error);
      }

      return cb('NO-ACTION', inst);
    }

    // removeIdValue(self, data);
    return self.create(data, options, cb);
  });
}


function callUpdateOnModel(self, actualFn, args) {
  var model = self;
  var ary = [];
  if (args.hasOwnProperty('id')) {
    ary.push(args.id);
  }
  ary.push(args.data);
  ary.push(args.options);
  ary.push(args.cb);
  if (self.constructor.name !== 'Function') {
    model = self.constructor;
  }
  if (!model.definition.settings || !model.definition.settings.mixins || !model.definition.settings.mixins.MultiTenancyMixin) {
    return actualFn.apply(self, ary);
  }
  var id = args.id || util.getIdValue(model, args.data);
  if (!id && self.constructor.name !== 'Function') {
    id = self.id;
  }
  // var q = byIdQuery(model, id);

  findByIdAndCreate(model, id, args.data, args.options, function (err, r) {
    if (err === 'NO-ACTION') {
      return actualFn.apply(self, ary);
    }
    if (err) {
      return args.cb(err);
    }
    return args.cb(err, r);
  });
}


// this function is called for PUT by ID request
const _replaceById = DataAccessObject.replaceById;
DataAccessObject.replaceById = function replaceById(id, data, options, cb) {
  var self = this;

  if (!id) {
    return _replaceById.call(self, id, data, options, cb);
  }

  return callUpdateOnModel(self, _replaceById, { id, data, options, cb });
};


const _updateAttributes = DataAccessObject.prototype.updateAttributes;
DataAccessObject.prototype.updateAttributes =
  DataAccessObject.prototype.patchAttributes = function (data, options, cb) {
    var self = this;
    return callUpdateOnModel(self, _updateAttributes, { data, options, cb });
  };

const _replaceAttributes = DataAccessObject.prototype.replaceAttributes;
DataAccessObject.prototype.replaceAttributes = function (data, options, cb) {
  var self = this;
  return callUpdateOnModel(self, _replaceAttributes, { data, options, cb });
};

const _replaceOrCreate = DataAccessObject.replaceOrCreate;
DataAccessObject.replaceOrCreate = function replaceOrCreate(data, options, cb) {
  var self = this;
  return callUpdateOnModel(self, _replaceOrCreate, { data, options, cb });
};


const _upsert = DataAccessObject.upsert;
DataAccessObject.updateOrCreate =
  DataAccessObject.patchOrCreate =
  DataAccessObject.upsert = function replaceOrCreate(data, options, cb) {
    var self = this;
    return callUpdateOnModel(self, _upsert, { data, options, cb });
  };

