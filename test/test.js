var oecloud = require('oe-cloud');
var loopback = require('loopback');
oecloud.observe('loaded', function (ctx, next) {
  oecloud.attachMixinsToBaseEntity("MultiTenancyMixin");
  return next();
})
oecloud.addContextField('tenantId', {
  type: "string"
});
oecloud.boot(__dirname, function (err) {
  if (err) {
    console.log(err);
    process.exit(1);
  }
  var accessToken = loopback.findModel('AccessToken');
  accessToken.observe("before save", function (ctx, next) {
    var userModel = loopback.findModel("User");
    var instance = ctx.instance;
    userModel.find({ where: {id: instance.userId} }, {}, function (err, result) {
      if (err) {
        return next(err);
      }
      if (result.length != 1) {
        return next(new Error("No User Found"));
      }
      var user = result[0];
      if (user.username === "admin") {
        instance.tenantId = '/default';
      }
      else if (user.username === "evuser") {
        instance.tenantId = '/default/infosys/ev';
      }
      else if (user.username === "infyuser") {
        instance.tenantId = '/default/infosys';
      }
      else if (user.username === "bpouser") {
        instance.tenantId = '/default/infosys/bpo';
      }
      return next(err);
    });
  });
  oecloud.start();
  oecloud.emit('test-start');
});

var chalk = require('chalk');
var chai = require('chai');
var async = require('async');
chai.use(require('chai-things'));

var expect = chai.expect;

var app = oecloud;
var defaults = require('superagent-defaults');
var supertest = require('supertest');
var Customer;
var api = defaults(supertest(app));
var basePath = app.get('restApiRoot');
var url = basePath + '/Customers';


describe(chalk.blue('Multi tenancy Test Started'), function (done) {
  this.timeout(10000);
  before('wait for boot scripts to complete', function (done) {
    app.on('test-start', function () {
      Customer = loopback.findModel("Customer");
      var userModel = loopback.findModel("User");
      userModel.destroyAll({}, {}, function (err) {
        return done(err);
      });
    });
  });

  afterEach('destroy context', function (done) {
    done();
  });

  it('t1 getting record for /default scope', function (done) {
    Customer.find({}, { ctx: { tenantId: "/default" } }, function (err, results) {
      expect(results.length).to.equal(1);
      expect(results[0].name).to.equal('Customer A');
      return done(err);
    });
  });
  it('t2 getting record for /default/infosys scope', function (done) {
    Customer.find({}, { ctx: { tenantId: "/default/infosys" } }, function (err, results) {
      expect(results.length).to.equal(1);
      expect(results[0].name).to.equal('Infosys Customer');
      return done(err);
    });
  });
  it('t3 getting record for /default/infosys/ev scope', function (done) {
    Customer.find({}, { ctx: { tenantId: "/default/infosys/ev" } }, function (err, results) {
      expect(results.length).to.equal(1);
      expect(results[0].name).to.equal('EV Customer');
      return done(err);
    });
  });
  it('t4 getting record without passing tenant Id context. it should throw error', function (done) {
    Customer.find({}, {}, function (err, results) {
      expect(err).not.to.be.null;
      return done();
    });
  });
  it('t5 trying to create record without passing tenantId context. it should throw error', function (done) {
    Customer.create({name : "Test", age : 50}, {}, function (err, results) {
      expect(err).not.to.be.null;
      return done();
    });
  });

  it('t6 create user admin/admin with /default tenant', function (done) {
    var url = basePath + '/users';
    api.set('Accept', 'application/json')
    .post(url)
    .send([{username: "admin", password:"admin", email: "admin@admin.com" },
    { username: "evuser", password: "evuser", email: "evuser@evuser.com" },
    { username: "infyuser", password: "infyuser", email: "infyuser@infyuser.com" },
    { username: "bpouser", password: "bpouser", email: "infyuser@infyuser.com" }])
    .end(function (err, response) {
      
      var result = response.body;
      expect(result[0].id).to.be.defined;
      expect(result[1].id).to.be.defined;
      expect(result[2].id).to.be.defined;
      expect(result[3].id).to.be.defined;
      done();
    });
  });
  var adminToken;
  it('t7 Login with admin credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
    .post(url)
    .send({ username: "admin", password: "admin" })
    .end(function (err, response) {
      var result = response.body;
      adminToken = result.id;
      expect(adminToken).to.be.defined;
      done();
    });
  });
  
  it('t8 access customer records with admin token', function (done) {
    var url = basePath + '/customers?access_token=' + adminToken;
    api.set('Accept', 'application/json')
    .get(url)
    .end(function (err, response) {
      var result = response.body;
      expect(result.length).to.be.equal(1);
      expect(result[0].name).to.be.equal("Customer A");
      done();
    });
  });

  it('t9 create customer records with admin token', function (done) {
    var url = basePath + '/customers?access_token=' + adminToken;
    api.set('Accept', 'application/json')
    .post(url)
    .send({name:"Customer AA", age : 100})
    .end(function (err, response) {
      var result = response.body;
      expect(result.name).to.be.equal("Customer AA");
      done();
    });
  });

  it('t10 getting record for /default scope. should retrieve two records', function (done) {
    Customer.find({}, { ctx: { tenantId: "/default" } }, function (err, results) {
      expect(results.length).to.equal(2);
      var f1, f2;
      for (var i = 0; i < results.length; ++i) {
        if (results[i].name === "Customer A") {
          f1 = 1;
        }
        else if (results[i].name === "Customer AA") {
          f2 = 1;
        }
      }
      if (!f1 || !f2) {
        return done(new Error("Expecting two records Cuatomer A and Customer AA"));
      }
      //expect(results[0].name).to.equal('Customer A');
      //expect(results[1].name).to.equal('Customer AA');
      return done(err);
    });
  });

  var infyToken;
  it('t11 Login with infy credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
    .post(url)
    .send({ username: "infyuser", password: "infyuser" })
    .end(function (err, response) {
      var result = response.body;
      infyToken = result.id;
      expect(infyToken).to.be.defined;
      done();
    });
  });

  var evToken;
  it('t12 Login with ev credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
    .post(url)
    .send({ username: "evuser", password: "evuser" })
    .end(function (err, response) {
      var result = response.body;
      evToken = result.id;
      expect(evToken).to.be.defined;
      done();
    });
  });

  var bpoToken;
  it('t13 Login with bpo credentials', function (done) {
    var url = basePath + '/users/login';
    api.set('Accept', 'application/json')
    .post(url)
    .send({username: "bpouser", password: "bpouser"})
    .end(function (err, response) {
      var result = response.body;
      bpoToken = result.id;
      expect(bpoToken).to.be.defined;
      done();
    });
  });

  it('t14 access customer records with infy token', function (done) {
    var url = basePath + '/customers?access_token=' + infyToken;
    api.set('Accept', 'application/json')
    .get(url)
    .end(function (err, response) {
      var result = response.body;
      expect(result.length).to.be.equal(1);
      expect(result[0].name).to.be.equal("Infosys Customer");
      done(err);
    });
  });

  it('t15 getting record for /default scope with depth=1', function (done) {
    Customer.find({}, { ctx: { tenantId: "/default" }, depth: 1 }, function (err, results) {
      expect(results.length).to.equal(3);
      return done(err);
    });
  });

  it('t16 getting record for /default scope with depth=2', function (done) {
    Customer.find({}, { ctx: { tenantId: "/default" }, depth: 2 }, function (err, results) {
      expect(results.length).to.equal(6);
      return done(err);
    });
  });

  it('t17 getting record for /default/infosys scope with depth=1', function (done) {
    Customer.find({}, { ctx: { tenantId: "/default/infosys" }, depth: 1 }, function (err, results) {
      expect(results.length).to.equal(4);
      return done(err);
    });
  });

  it('t18 getting record for /default/infosys scope with depth=2', function (done) {
    Customer.find({}, { ctx: { tenantId: "/default/infosys" }, depth: 2 }, function (err, results) {
      expect(results.length).to.equal(4);
      return done(err);
    });
  });

  it('t19 getting record for /default/infosys/ev scope with depth=2', function (done) {
    Customer.find({}, { ctx: { tenantId: "/default/infosys/ev" }, depth: 2 }, function (err, results) {
      expect(results.length).to.equal(1);
      return done(err);
    });
  });

  it('t20 getting record for /default/infosys/ev scope with depth=2 - with upward direction. no bpo customers should come', function (done) {
    Customer.find({}, { ctx: { tenantId: "/default/infosys/ev" }, depth: 2, upward: true }, function (err, results) {
      expect(results.length).to.equal(4);
      for (var i = 0; i < results.length; ++i) {
        if (results[i].name.toLowerCase().indexOf("bpo") >= 0) {
          return done(new Error("BPO Customer should not be retrieved."))
        }
      }
      return done(err);
    });
  });

  it('t21 trying to modify record of other tenant using updateAttributes- should create new record', function (done) {
    Customer.find({}, { ctx: { tenantId: "/default/infosys/ev" }, depth: 2, upward: true }, function (err, results) {
      expect(results.length).to.equal(4);
      var rcd;
      for (var i = 0; i < results.length; ++i) {
        if (results[i].name.toLowerCase().indexOf("bpo") >= 0) {
          return done(new Error("BPO Customer should not be retrieved."))
        }
        if (results[i].name.toLowerCase().indexOf("infosys customer") >= 0) {
          rcd = results[i];
        }
      }
      expect(rcd).to.exists;
      rcd.updateAttributes({ name: "Infosys Customer modified by EV", age: 1111, id: rcd.id }, { ctx: { tenantId: "/default/infosys/ev" } }, function (err, result) {
        expect(rcd.id).to.not.equal(result.id);
        return done(err);
      });
    });
  });

  it('t22 trying to modify record of same tenant', function (done) {
    Customer.find({}, { ctx: { tenantId: "/default/infosys/ev" }, depth: 2, upward: true }, function (err, results) {
      expect(results.length).to.equal(5); // since above test case will create new record
      var rcd;
      for (var i = 0; i < results.length; ++i) {
        if (results[i].name.toLowerCase().indexOf("bpo") >= 0) {
          return done(new Error("BPO Customer should not be retrieved."))
        }
        if (results[i].name.toLowerCase().indexOf("ev customer") >= 0) {
          rcd = results[i];
        }
      }
      expect(rcd).to.exists;
      rcd.updateAttributes({ name: "EV Customer modified", age: 1111, id: rcd.id }, { ctx: { tenantId: "/default/infosys/ev" } }, function (err, result) {
        expect(result.name).to.be.equal("EV Customer modified");
        return done(err);
      });
    });
  });

  it('t23 trying to modify record of other tenant default using replaceById - should create new record', function (done) {
    Customer.find({}, { ctx: { tenantId: "/default/infosys/ev" }, depth: 2, upward: true }, function (err, results) {
      expect(results.length).to.equal(5);
      var rcd;
      for (var i = 0; i < results.length; ++i) {
        if (results[i].name.toLowerCase().indexOf("bpo") >= 0) {
          return done(new Error("BPO Customer should not be retrieved."))
        }
        if (results[i].name.toLowerCase().indexOf("customer a") >= 0) {
          rcd = results[i];
        }
      }
      expect(rcd).to.exists;
      Customer.replaceById(rcd.id, { name: "Customer A modified by ev", age: 1111, id: rcd.id }, { ctx: { tenantId: "/default/infosys/ev" } }, function (err, result) {
        expect(rcd.id.toString()).to.not.equal(result.id.toString());
        return done();
      });
    });
  });

  it('t24 creating multiple records for default tenant', function (done) {
    Customer.create([{ name: "Test1", age: 50 }, { name: "Test2", age: 50 }, { name: "Test3", age: 50 }], { ctx: { tenantId: '/default' } }, function (err, results) {
      expect(err).to.be.null;
      return done();
    });
  });

  it('t25 trying to modify record of other tenant using replaceAttributes - should create new record', function (done) {
    Customer.find({}, { ctx: { tenantId: "/default/infosys/ev" }, depth: 2, upward: true }, function (err, results) {
      expect(results.length).to.equal(9);
      var rcd;
      for (var i = 0; i < results.length; ++i) {
        if (results[i].name.toLowerCase().indexOf("bpo") >= 0) {
          return done(new Error("BPO Customer should not be retrieved."))
        }
        if (results[i].name.toLowerCase().indexOf("test1") >= 0) {
          rcd = results[i];
        }
      }
      expect(rcd).to.exists;
      rcd.replaceAttributes({ name: "test1 modified by ev", age: 1111, id: rcd.id }, { ctx: { tenantId: "/default/infosys/ev" } }, function (err, result) {
        expect(rcd.id.toString()).to.not.equal(result.id.toString());
        return done(err);
      });
    });
  });

  it('t26 trying to modify record of other tenant using replaceOrCreate  - should create new record', function (done) {
    Customer.find({}, { ctx: { tenantId: "/default/infosys/ev" }, depth: 2, upward: true }, function (err, results) {
      expect(results.length).to.equal(10);
      var rcd;
      for (var i = 0; i < results.length; ++i) {
        if (results[i].name.toLowerCase().indexOf("bpo") >= 0) {
          return done(new Error("BPO Customer should not be retrieved."))
        }
        if (results[i].name.toLowerCase().indexOf("test2") >= 0) {
          rcd = results[i];
        }
      }
      expect(rcd).to.exists;
      Customer.replaceOrCreate({ name: "test2 modified by ev", age: 1111, id: rcd.id }, { ctx: { tenantId: "/default/infosys/ev" } }, function (err, result) {
        expect(rcd.id.toString()).to.not.equal(result.id.toString());
        return done(err);
      });
    });
  });


  it('t27 trying to modify record of other tenant using upsert  - should create new record', function (done) {
    Customer.find({}, { ctx: { tenantId: "/default/infosys/ev" }, depth: 2, upward: true }, function (err, results) {
      expect(results.length).to.equal(11);
      var rcd;
      for (var i = 0; i < results.length; ++i) {
        if (results[i].name.toLowerCase().indexOf("bpo") >= 0) {
          return done(new Error("BPO Customer should not be retrieved."))
        }
        if (results[i].name.toLowerCase().indexOf("test3") >= 0) {
          rcd = results[i];
        }
      }
      expect(rcd).to.exists;
      Customer.upsert({ name: "test3 modified by ev", age: 1111, id: rcd.id }, { ctx: { tenantId: "/default/infosys/ev" } }, function (err, result) {
        expect(err).to.exists;
        expect(rcd.id).to.not.equal(result.id);
        return done(err);
      });
    });
  });

  it('t26 trying to modify record of other tenant using replaceOrCreate  - should update existing record', function (done) {
    Customer.find({}, { ctx: { tenantId: "/default/infosys/ev" } }, function (err, results) {
      expect(results.length).to.equal(6);
      var rcd = results[0];
      expect(rcd).to.exists;
      Customer.replaceOrCreate({ name: "test2 modified by infy ev", age: 1111, id: rcd.id }, { ctx: { tenantId: "/default/infosys/ev" } }, function (err, result) {
        expect(rcd.id.toString()).to.equal(result.id.toString());
        if (err) return done(err);
        Customer.find({ where: {id : rcd.id}}, { ctx: { tenantId: "/default/infosys/ev" } }, function (err, results) {
          expect(results[0].name).to.equal("test2 modified by infy ev")
          return done(err);
        });

      });
    });
  });
});

