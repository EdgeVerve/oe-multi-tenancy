﻿const loopback = require('loopback');
const mergeQuery = require('loopback-datasource-juggler/lib/utils').mergeQuery;
const toRegExp = require('loopback-datasource-juggler/lib/utils').toRegExp;
const _ = require('lodash');
const log = require('oe-logger')('multi-tenancy-mixin');

module.exports = Model => {
  if (Model.modelName === 'BaseEntity') {
    return;
  }

  Model.defineProperty('_autoScope', {
    type: 'object',
    required: false
  });

  // Making _autoScope and _scope as hidden fields.
  if (Model.definition.settings.hidden) {
    Model.definition.settings.hidden = Model.definition.settings.hidden.concat(['_autoscope']);
  } else {
    Model.definition.settings.hidden = ['_autoScope'];
  }

  // adding autoscope setting.
  if (!Model.definition.settings.autoscope) {
    Model.definition.settings.autoscope = [];
  }

  // Initializing mixin field in model settings so that we need  not check for that field while performing operations
  if (!Model.definition.settings.mixins) {
    Model.definition.settings.mixins = {};
  }

  if ((Model.settings.overridingMixins && !Model.settings.overridingMixins.MultiTenancyMixin) || !Model.definition.settings.mixins.MultiTenancyMixin) {
    Model.evRemoveObserver('before save', beforeSave);
    Model.evRemoveObserver('access', beforeAccess);
    if (!Model.definition.settings.disableManualPersonalization) {
      Model.evRemoveObserver('after access', afterAccess);
    }
  } else {
    Model.evObserve('before save', beforeSave);
    Model.evObserve('access', beforeAccess);
    if (!Model.definition.settings.disableManualPersonalization) {
      Model.evObserve('after access', afterAccess);
    }
  }
};

function convertToLowerCase(input) {
  // Check for type of input and branch accordingly.
  if (Array.isArray(input)) {
    const resArr = [];
    input.forEach((value) => {
      resArr.push(value.toLowerCase());
    });
    return resArr;
  } else if (input && typeof input === 'object') {
    const resObj = {};
    Object.keys(input).forEach((key) => {
      const value = input[key];
      if (typeof value === 'string') {
        resObj[key] = value.toLowerCase();
      } else if (typeof value === 'object') {
        resObj[key] = convertToLowerCase(value);
      } else {
        resObj[key] = value;
      }
    });
    return resObj;
  }
};


function beforeSave(ctx, next) {
  const modelSettings = ctx.Model.definition.settings;

  // Checking for MultiTenancyMixin is applied or not.
  if (modelSettings.mixins.MultiTenancyMixin === false) {
    return next();
  }

  const callContext = ctx.options;

  // Clone callContext.ctx so the any changes locally made will not affect callContext.ctx.
  let context = Object.assign({}, callContext.ctx);

  // Convert the callcontext to lowercase.
  context = convertToLowerCase(context);

  const data = ctx.data || ctx.instance;
  const _autoScope = {};
  const autoScope = modelSettings.autoscope || modelSettings.autoScope;
  if (!autoScope || autoScope.length == 0) {
    return next();
  }

  let currentAutoScope;
  if (!ctx.IsNewInstance && ctx.currentInstance) {
    currentAutoScope = ctx.currentInstance._autoScope;
  }

  // get default autoscope value from config files
  const defaultValue = ctx.Model.app.get('defaultAutoScope') || 'default';
  
  if (callContext.ignoreAutoScope) {
    if (!callContext.useScopeAsIs) {
      autoScope.forEach((key) => {
        _autoScope[key] = defaultValue;
      });
    } else {
      return next();
    }
  } else {
    autoScope.forEach((key) => {
      if (currentAutoScope) {
        const f1 = context[key] || '';
        const f2 = currentAutoScope[key] || '';
        if (f1 !== f2) {
          const error = new Error(`could not find a model with id ${ctx.currentInstance.id}`);
          error.statusCode = 404;
          error.code = 'MODEL_NOT_FOUND';
          error.retriable = false;
          return next(error);
        }
      }
      if (context[key]) {
        // adding autoscope values to scope.
        // scope[key] = context[key];
        _autoScope[key] = context[key];
      } else {
        // throws an Error when model is autoscope on some contributor
        // but contributor values are not provided.
        const err1 = new Error();
        err1.name = 'Data Personalization error';
        err1.message = `insufficient data! Autoscoped values not found for the model${ctx.Model.modelName} key ${key}`;
        err1.code = 'DATA_PERSONALIZATION_ERROR_029';
        err1.type = 'AutoScopeValuesNotFound';
        err1.retriable = false;
        return next(err1);
      }
    });
  }
  data._autoScope = _autoScope;
  return next();
}

function afterAccess(ctx, next) {
  const modelSettings = ctx.Model.definition.settings;

  // Checking for HierarchyMixin is applied or not.
  if (modelSettings.mixins.MultiTenancyMixin === false) {
    return next();
  }
  const _autoScope = {};
  const autoScope = modelSettings.autoscope || modelSettings.autoScope;
  if (!autoScope || autoScope.length == 0) {
    return next();
  }

  const upward = modelSettings.upward || false;

  let resultData = [];
  const result = ctx.accdata;

  if (result.length && upward) {
    let uniq = [];
    const modelProp = ctx.Model.definition.properties;

    result.forEach((obj) => {
      let weight = 0;
      Object.keys(obj._autoScope).forEach((item) => {
        const value = obj._autoScope[item];
        weight += value.split('/').length;
      });
      obj.weight = weight;
      resultData.push(obj);
    });

    // Reads each property for unique and populates uniq array.
    Object.keys(modelProp).forEach((key) => {
      const prop = modelProp[key];
      if (prop.unique) {
        if (typeof prop.unique === 'boolean' || typeof prop.unique === 'string') {
          uniq.push(key);
        } else if (typeof prop.unique === 'object') {
          prop.unique.scopedTo ? uniq = uniq.concat(prop.unique.scopedTo) : null;
          uniq.push(key);
        }
      }
    });

    // var sortFields = uniq.concat(['weights']);
    // var sortOrders = _.fill(Array(sortFields.length), 'desc');
    // Lodash v3.10.1
    resultData = _.sortByOrder(resultData, 'weight', 'desc');

    // Filter out the redundent records from result by applying unique validation.
    if (uniq.length > 0) {
      //resultData = _.uniq(resultData, value => uniq.map(u => value[u]).join('-'));
      resultData = _.uniqWith(resultData, function (value1, value2) { return uniq.map(u => value1[u]).join('-') === uniq.map(u => value2[u]).join('-') });
      // resultData = _.intersection.apply(this, _.chain(uniq).map(function (v) { return _.uniq(resultData, v) }).value());
    }
    ctx.accdata = resultData;
  }
  next();
}


function createQuery(ctx, context, key) {
  const upward = ctx.Model.definition.settings.upward || false;
  let depth = ctx.query && ctx.query.depth ? ctx.query.depth : '0';
  let query = {};
  //const key = hierarchy; //`_hierarchyScope.${hierarchy}`;
  const regexString = context[key];
  key = "_autoScope." + key;
  const orParms = [];
  let modifiedRegex;

  if (!upward) {
    if (depth === '*') {
      const regexObj = toRegExp(regexString);

      query[key] = regexObj;
      mergeQuery(ctx.query, {
        where: query
      });
    } else {
      for (let i = 0; i <= depth; i++) {
        query = {};
        if (i === 0) {
          modifiedRegex = `^${regexString}$`;
        } else {
          //modifiedRegex = `${modifiedRegex.substr(0, modifiedRegex.length - 1)}[[:alnum:]]*/$`;
          modifiedRegex = `${modifiedRegex.substr(0, modifiedRegex.length - 1)}[0-9a-zA-Z\'_\-]*/$`;
        }
        query[key] = new RegExp(modifiedRegex); //toRegExp(modifiedRegex);
        orParms.push(query);
      }
      mergeQuery(ctx.query, {
        where: {
          or: orParms
        }
      });
    }
  } else {
    if (depth === '*') {
      depth = regexString.split('/').length - 2;
    }
    for (let j = 0; j <= depth; j++) {
      query = {};
      if (j === 0) {
        modifiedRegex = `^${regexString}$`;
      } else {
        const ary = modifiedRegex.split('/');
        ary.splice(ary.length - 2, 1);
        modifiedRegex = ary.join();
      }
      if (modifiedRegex === '/$' || modifiedRegex === '$') {
        break;
      }
      query[key] = new RegExp(modifiedRegex); //toRegExp(modifiedRegex);
      orParms.push(query);
    }
    mergeQuery(ctx.query, {
      where: {
        or: orParms
      }
    });
  }
}

function beforeAccess(ctx, next) {
  const modelSettings = ctx.Model.definition.settings;

  // Checking for DataHierarchyMixin is applied or not
  if (modelSettings.mixins.MultiTenancyMixin === false) {
    return next();
  }

  // adding hierarchyScope setting.
  if (!modelSettings.autoscope|| ctx.options.ignoreAutoScope) {
    return next();
  }

  const callContext = ctx.options;
  let context = Object.assign({}, callContext.ctx);
  // Convert the callcontext to lowercase.
  context = convertToLowerCase(context);
  const autoScope = modelSettings.autoscope;

  autoScope.forEach((key) => {
    if (typeof key === 'string') {
      if (context && context[key]) {
        createQuery(ctx, context, key);
      }
    } else {
      const err = new Error();
      err.name = 'Auto Scope Definition Error';
      err.message = `The Auto scope in model should be of type string for the model ${ctx.Model.modelName} key ${key}`;
      err.code = 'DATA_HIERARCHY_ERROR_001';
      err.type = 'Type mismatch in Declaration';
      err.retriable = false;
      return next(err);
    }
  });
  return next();
}


