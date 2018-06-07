var loopback=require('loopback');

module.exports = function (app, done) {
  var Customer = loopback.findModel('Customer');
  Customer.destroyAll({}, {}, function(){
    var item1 = {
      'name': 'Customer A',
      'age': 10
    };

    var item2 = {
      'name': 'Customer B',
      'age': 20
    };

    var item3 = {
      'name': 'Customer C',
      'age': 30
    };
    Customer.create([item1, item2, item3], function (err, results) {
      return done(err);
    });
  });
}

