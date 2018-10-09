module.exports = function(Model){
  Model.beforeRemote("**", function(ctx, instance, next){
    return next();
  });

}
