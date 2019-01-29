/**
 *
 * 2019-2020 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

// Author : Atul
// This file attach SwitchContext/ResetContext and Aboutme functionality to User Model
// By default it is disabled. It can be enabled by setting EnableSwitchContext to true
// Programmer has to explicitely set ACL for these end points.
// When switchContext is called, it pushes original context into _original field of context and updates accessToken
// When resetContext is called, it restores context from _original
// eg. userModel.settings.acls.push({ accessType: 'EXECUTE', permission: 'ALLOW', principalId: '$authenticated', principalType: 'ROLE', property: 'switchContext' });

const loopback = require('loopback');
module.exports = function (app) {
  var userModel = loopback.getModelByType('User');

  if (app.get('EnableSwitchContext') !== true) {
    return;
  }
  userModel.remoteMethod('resetContext', {
    description: 'Reset user context to original value',
    accessType: 'WRITE',
    isStatic: true,
    accepts: [
      {
        arg: 'options', type: 'object', http: 'optionsFromRequest'
      }
    ],
    http: {
      verb: 'POST',
      path: '/resetContext'
    },
    returns: {
      type: 'object',
      root: true
    }
  });

  userModel.resetContext = function (options, cb) {
    if (!options || !options.accessToken) {
      return cb(null, {});
    }
    var accessToken = options.accessToken;
    if (!accessToken || !accessToken.ctx) {
      return cb(null, {});
    }
    var ctx = accessToken.ctx;
    if (ctx._original) {
      ctx = ctx._original;
      accessToken.updateAttributes({ctx: ctx}, function (err, result) {
        if (err) {
          console.log(err);
          return cb(new Error('Reset context operation failed'));
        }
        return cb(null, ctx);
      });
    } else {
      return cb(null, ctx);
    }
  };

  userModel.remoteMethod('switchContext', {
    description: 'Switch user context',
    accessType: 'WRITE',
    isStatic: true,
    accepts: [
      {
        arg: 'newContext', type: 'object', http: { source: 'body' }, required: true, description: 'The JSON containing the location payload'
      },
      {
        arg: 'options', type: 'object', http: 'optionsFromRequest'
      }
    ],
    http: {
      verb: 'POST',
      path: '/switchContext'
    },
    returns: {
      type: 'object',
      root: true
    }
  });

  userModel.switchContext = function (newContext, options, cb) {
    if (!options || !options.accessToken) {
      return cb(null, {});
    }
    var accessToken = options.accessToken;
    if (!accessToken || !accessToken.ctx) {
      return cb(null, {});
    }

    if (accessToken.ctx._original) {
      return cb(new Error('Cannot switch context multiple times. Use ResetContext before switch again.'));
    }
    var ctx = newContext;
    ctx._original = JSON.parse(JSON.stringify(accessToken.ctx));

    accessToken.updateAttributes({ctx: ctx}, function (err, result) {
      if (err) {
        console.log(err);
        return cb(new Error('Switch operation failed'));
      }
      return cb(null, newContext);
    });
  };

  userModel.aboutMe = function (options, cb) {
    if (!options || !options.accessToken) {
      return cb(null, {});
    }
    var accessToken = options.accessToken;
    if (!accessToken) {
      return cb(null, {});
    }
    var ctx = accessToken.ctx || {};
    var me = ctx;
    me.username = accessToken.username;
    me.email = accessToken.email;
    var userId = accessToken.userId;
    if (userId && !me.username) {
      userModel.find({where: {id: userId}}, options, function (err, result) {
        if (err) {
          return cb(err);
        }
        if (!result) {
          return cb({});
        }
        me.username = result[0].username;
        me.email = result[0].email;
        return cb(null, me);
      });
    } else {
      return cb(null, me);
    }
  };

  userModel.remoteMethod(
    'aboutMe', {
      description: 'Get Logged in user Information',
      http: {
        path: '/aboutMe',
        verb: 'get'
      },
      accepts: [
        {
          arg: 'options', type: 'object', http: 'optionsFromRequest'
        }
      ],
      returns: {
        arg: 'me',
        type: 'object',
        root: true
      }
    }
  );
};
