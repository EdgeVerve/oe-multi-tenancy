# oe-multi-tenancy module

- [oe-multi-tenancy module](#oe-multi-tenancy-module)
- [Introduction](#introduction)
  * [TenantID is not special](#tenantid-is-not-special)
  * [Difference between oeCloud 1.x and 2.x](#difference-between-oecloud-1x-and-2x)
- [Getting Started](#getting-started)
  * [Dependency](#dependency)
  * [Testing and Code coverage](#testing-and-code-coverage)
  * [Installation](#installation)
    + [Attaching to Application](#attaching-to-application)
    + [Enabling or Disabling](#enabling-or-disabling)
- [API Documentation](#api-documentation)
  * [setBaseEntityAutoscope(autoscopeFields)](#setbaseentityautoscope-autoscopefields-)
  * [isDefaultContext(ctx)](#isdefaultcontext-ctx-)
  * [getDefaultContext(autoscope)](#getdefaultcontext-autoscope-)
- [Tutorial](#tutorial)
  * [Basic Use](#basic-use)

# Introduction
This node module is responsible for data separation in multi-tenant environment. This version of oeCloud (v 2.x) clearly differentiates Data Seperation from Personalization.  
Multi tenancy is more about data separation. Multi tenancy is typically important when application is hosted on cloud where more than one customer(tenant) shares same infrastructure.
 Using this module, in multi tenant environment developer can control how data can be seperated. In very simple language, one tenant cannot see or modify other tenant's data.

## TenantID is not special

In previous version of oeCloud (1.x), tenantId was **hard coded** in many places and multi tenancy thus was enforced with only tenantId parameter. Code would break if tenantId was not provided and also would break if more then such parameter (also called autoScope) were provided. 
In oeCloud 2.x, care has been taken to ensure that tenantId is not **first class citizen** - meaning, no code is written to assume that application is multi tenant and tenantId is always provided. 

## Difference between oeCloud 1.x and 2.x

| oeCloud 2.x | oeCloud 1.x |
| ----------- | ----------- |
| Data seperation is not based on **only** tenantId. Data seperation can happened based on region, language, organization branches and many such things things | Data seperation could happened only based on **tenantId**  |
| TenantId is NOT hardcoded | TenantId is hard coded into system  |
| Hierarchy support is available in 2.x. Meaning, we can have data seperation based on Organization hierarchy | Personalization module was not supporting data seperation based on hierarchy (Though seperate functionality was written )  |
| Context must be provided only for those models which has data separation enabled | Context (options parameter in DAO method like find, create etc) had to be provided throughout the application.  |
| Selectively enable or disable data separation for the models | All models were by default had enablement of personalization. |
| Data seperation itself can be optional module. if application doesn't need data seperation (meaning it is not multi tenant application), don't have to install this module | oeCloud based app by default was multi-tenant. Meaning, even if developer doesn't want multi tenancy, it was enforced |

# Getting Started

In this section, we will see how we can use install this module in our project. To use this multi tenancy feature in project from this module, you must install this module.


## Dependency
* oe-logger
* oe-cloud

## Testing and Code coverage

```sh
$ git clone http://evgit/oec-next/oe-multi-tenancy.git
$ cd oe-multi-tenancy
$ npm install --no-optional
$ npm run grunt-cover
```

you should see coverage report in coverage folder.


## Installation

To use oe-multi-tenancy in your project, you must include this package into your package.json as shown below. So when you do **npm install** this package will be made available. Please ensure the source of this package is right and updated. For now we will be using **evgit** as source. Also, please note that, to use this module, you project must be **oeCloud** based project.


```javascript
"oe-multi-tenancy": "git+http://evgit/oec-next/oe-multi-tenancy.git#master"
```

You can also install this mixin on command line using npm install. 


```sh
$ npm install <git path oe-multi-tenancy> --no-optional
```


### Attaching to Application

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


# API Documentation

## setBaseEntityAutoscope(autoscopeFields)

This function is available on application object and will let you set autoscopeFields. Remember, **tenantId** is not hardcoded and hence it is not mandatory to set autoscope field always as tenantId. Also, you can have multiple auto scope fields. This module will give preference to autoscope fields in same order. Below code snippet can be used to set up autoscope fields to BaseEntity. Since it is set to BaseEntity model, all models derived from BaseEntity will have same autoscope.


```javaScript
const oecloud = require('oe-cloud');
oecloud.setBaseEntityAutoscope(["tenantId", "regionId"])
```

Remember, this is based on Model and thus you can have only selected models with auto scope fields. Above code will attach autoScope fields to BaseEntity and probably this will affect entire system as most of models derived from BaseEntity. Therefore, you can selectively enable this functionality on models by adding following in model's JSON file.

```javaScript

"mixin" : {
  "MultiTenantMixin" : true
}

..
"autoscope" : ["tenantId", "regionId"]

```

## isDefaultContext(ctx)

This is utility function which will check if given context is default context. If returns true or false based on if given ctx is of default context or not. 

| Parameter | true or false |
| --------- | ------------- |
| { tenantId : '/default'} | true |
| { tenantId : '/default/icici'} | false |
| { tenantId : '/default', regionId : '/default'} | true |
| { tenantId : '/default', regionId : '/default/asia'} | false |
| { tenantId : '/default/icici', regionId : '/default'} | true |

Below is sample code how to check for context

```javaScript
const util = require('oe-multi-tenancy/lib/utils')
util.isDefaultContext({ctx : {tenantId : '/default'}}) ; // returns true
```

## getDefaultContext(autoscope)

This is another simple utility function which will get you default context based on autoscope. These utility function makes implementation hidden from developer. Developer is always encouraged to use these function instead of creating context or comparing context

```javaScript
const util = require('oe-multi-tenancy/lib/utils')
var test = util.getDefaultContext(["tenantId", "regionId"]); // returns { tenantId : '/default', regionId : '/default'}
util.isDefaultContext(test); // returns true
```



# Tutorial

This module will seperate data based on tenant. Now tenant is not really 'first class citizen' in oe-cloud based application. Meaning there is no place where **tenantId** is hard coded.
Application developer needs to configure parameter on which he/she wants to separate data. Data can be seperated by any user defined fields (eg tenantId, regionId, jobLevel etc)

## Basic Use

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

