# oe-multi-tenancy module

# Introduction
This node module is responsible for data separation in multi-tenant environment. This version of oeCloud clearly differentiates Data Seperation from Personalization. This is typically important when application is hosted on cloud where more than one customer(tenant) shares same infrastructure.
Multi tenancy is more about data separation. Using this module, in multi tenant environment developer can control how data can be seperated. In very simple language, one tenant cannot see or modify other tenant's data.

## Dependency
* oe-logger
* oe-cloud


## Getting Started

In this section, we will see how we can use install this module in our project. To use this multi tenancy feature in project from this module, you must install this module.


### Installation

To use oe-multi-tenancy in your project, you must include this package into your package.json as shown below. So when you do **npm install** this package will be made available. Please ensure the source of this package is right and updated. For now we will be using **evgit** as source. Also, please note that, to use this module, you project must be **oeCloud** based project.


```javascript
"oe-multi-tenancy": "git+http://<gitpath>/oe-multi-tenancy.git#master"
```

You can also install this mixin on command line using npm install. 


```sh
$ npm install <git path oe-multi-tenancy> --no-optional
```


### Testing and Code coverage

```sh
$ git clone http://evgit/oec-next/oe-multi-tenancy.git
$ cd oe-multi-tenancy
$ npm install --no-optional
$ npm run grunt-cover
```

you should see coverage report in coverage folder.





### Loading oe-multy-tenancy module

Once you have included into package.json, this module will get installed as part of npm install. However you need to load this module. For that you need to create entry in **app-list.json** file of application.


app-list.json

```javascript

  {
    "path": "oe-multi-tenancy",
    "enabled": true
  }
```

### Enabling or Disabling


There is some control given to enable or disable this functionality. 
This module when loaded, it will attach functionality (mixin) on BaseEntity model. Therefore, by default, all models derived from BaseEntity will be affected when you include this module.
If you want to make this module work with specific Models, you need to change the way it is loaded. For that use following entry in your app-list.json


```javascript

  {
    "path": "oe-multi-tenancy",
    "MultiTenancyMixin" : false,
    "enabled": true
  }
```

And then you will have to enable the mixin explicitely on those model which require multi tenancy by adding following in Model's JSON (definition).


```javascript
"mixins" : {
    "MultiTenancyMixin" : true
}

```


### Tutorial

This module will seperate data based on tenant. Now tenant is not really 'first class citizen' in oe-cloud based application. Meaning there is no place where **tenantId** is hard coded.
Application developer needs to configure parameter on which he/she wants to separate data. Data can be seperated by any user defined fields (eg tenantId, regionId, jobLevel etc)

#### Basic Use

Consider following Customer model. 

```javascript
{
  "name": "Customer",
  "base": "BaseEntity",
  "idInjection": true,
  "properties": {
    "name": {
      "type": "string",
      "unique" : true
    },
    "age": {
      "type": "number"
    }
  },
  "mixins" : { 
  "MultiTenancyMixin" : true,
  },
  "validations": [],
  "relations": {},
  "acls": [],
  "methods": {},
  
"autoscope" : ["tenantId"]
}

```

You are seeing two important entries in above model's definition. You can see that **autoscope** field is given which has value "tenantId" and you are seeing that **MultiTenancyMixin** is set to true.

With above settings, whenever there is query on Customer model in application (either via JavaScript code or by http method), mixin will add **where** clause with tenantId.

**tenantId** must be part of context. Context is usually generated based on request which is not part of this module. 

For example, application may stores tenantId and userId mapping in database and when user logs in, application will make that as part of access token.


```javascript
  var accessToken = loopback.findModel('AccessToken');
  accessToken.observe("before save", function (ctx, next) {
    var userTenant = loopback.findModel("UserTenantMap");
    var instance = ctx.instance;
    userTenant.find({ where: {id: instance.userId} }, {}, function (err, result) {
      if (err) {
        return next(err);
      }
      if (result.length != 1) {
        return next(new Error("No User Found"));
      }
      instance.tenantId = result[0].tenantId;
      return next(err);
    });
  });
```

As shown in above code snippet, you can see that whenever access token is being created, this code populates tenantId as part of Access Token. 
This way, for all requests with the this access token, tenantId will be available as part of context.
You can thus create and designate any field which can be **autoScoped** and always made available as part of context.












