/**
 *
 * �2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */


function _isDefaultContext(autoscopeFields, ctx) {
  for (var i = 0; i < autoscopeFields.length; ++i) {
    if (ctx[autoscopeFields[i]] !== '/default') {
      return false;
    }
  }
  return true;
}

function _getDefaultContext(autoscope) {
  var ctx = {};
  autoscope.forEach(function (item) {
    ctx[item] = '/default';
  });
  return ctx;
}

module.exports.getDefaultContext = _getDefaultContext;
module.exports.isDefaultContext = _isDefaultContext;
