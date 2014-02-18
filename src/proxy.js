var Args = require('args-js');

var createProxy = function(res, faker, parentName) {
  args = Args([
    {res:       Args.ANY | Args.Required},    
    {faker: Args.OBJECT | Args.Optional, _default: false},
    {parentName:       Args.STRING | Args.Optional},    
  ], arguments);

  var proxy = {};
  proxy.isProxy = true;
  proxy.parentName = args.parentName;
  proxy.resource = args.res;
  proxy.faker = args.faker;

  if(proxy.resource instanceof Function) {
    throw new Error('Proxying functions is not supported');
  }

  proxy._normalize = function() {
    if(proxy._isPrimitive()) {
      return proxy.resource;
    }

    var res;
    if(proxy._typeOfResource() === 'array') {
      res = [];
    } else {
      res = {};
    }

    Object.keys(proxy.resource).forEach(function(k){
      res[k] = proxy.resource[k].$_normalize();
    }); 

    return res;
  };

  proxy._trapAndFake = function(name) {
    if(proxy._typeOfResource() !== proxy._typeOfAccess(name)) {
      if(proxy._typeOfAccess(name) === 'object') {
        proxy.resource = {};
      } else if(proxy._typeOfAccess(name) === 'array') {
        proxy.resource = proxy.faker.generateArray();
      } else {
        throw Error('not implemented type switch: "'+proxy._typeOfResource()+'" -> "'+proxy._typeOfAccess(name)+'"');
      }
    }

    //prepare injected value
    newVal = createProxy({
          res: {},           
          faker: proxy.faker,
          parentName: name
    });

    //2.2 inject fake value into resource
    if(proxy._typeOfAccess(name) === 'object') {

      //property access intercept
      proxy.resource[name] = newVal;

    } else if(proxy._typeOfAccess(name) === 'array'){
    
      //only create values for index access
      if(!isNaN(name)) {
        proxy.resource[name] = newVal;
      }

    } else {
      throw Error('not implemented type access: "'+proxy._typeOfAccess(name)+'" by : "'+name+'"');
    }
  };

  proxy._typeOfAccess = function(name) {
    var primitive = ['valueOf', 'toString'];
    if(primitive.indexOf(name) !== -1)
      return 'primitive';

    var array = ['length'];
    if(array.indexOf(name) !== -1 || !isNaN(name))
      return 'array';

    return 'object';
  };

  proxy._typeOfResource = function() {
    var primitives = ['string', 'boolean', 'number'];
    if(primitives.indexOf(typeof proxy.resource) !== -1) {
      return 'primitive';
    }

    if(proxy.resource instanceof Array) {
      return 'array';
    }

    return 'object';
  };

  proxy._isPrimitive = function() {
    if(proxy._typeOfResource()=== 'primitive') {
      return true;
    }

    return false;
  };

  proxy._toPrimitive = function() {

    //important: when their is a parentname on object is empty assume it wants to return fake data
    if(proxy.faker !== false && proxy.parentName && Object.getOwnPropertyNames(proxy.resource).length === 0) {
      proxy.resource = proxy.faker.generate(proxy.parentName);
      if(typeof proxy.resource === 'function') {
        proxy.resource = proxy.resource();
      }
      return proxy.resource;
    }
    
    return proxy.resource.toString();

  };

  proxy.getOwnPropertyDescriptor = function(name) {
    return Object.getOwnPropertyDescriptor(proxy.resource, name);
  };

  proxy.getOwnPropertyNames = function() {
    if(proxy._isPrimitive()) {
      return []; //prevent throw on on console.log and some asserts
    }
    return Object.getOwnPropertyNames(proxy.resource);
  };

  proxy.defineProperty = function(name, desc) {
    return Object.defineProperty(proxy.resource, name, desc);
  };

  proxy.get = function(self, name) {

    //0. handle special cases access logic
    if(name[0] === '$') {
      return proxy[name.substring(1)];
    }

    //this prevents console.log(proxy) to break the proxy
    if(name === 'inspect') {
      return proxy.resource;
    }

    if(proxy._typeOfAccess(name) === 'primitive') {
      //return sort of toString / valueOf
      return function() {
        if(proxy._isPrimitive()) {
          return proxy.resource;
        } else {
          return proxy._toPrimitive();
        }
      };
    }

    //1. get original value
    var val = proxy.resource[name];

    //2. intercept and fake
    if(proxy.faker !== false && val === undefined) {

      //2.1 fill the resource with fake data
      proxy._trapAndFake(name);

    }

    //4. return transformed value
    return proxy.resource[name];
  };

  // skip prototyipical differences
  proxy.getPropertyDescriptor = proxy.getOwnPropertyDescriptor;
  proxy.getPropertyNames = proxy.getOwnPropertyNames;

  //recursively turn all elements into proxies
  if(!proxy._isPrimitive()) {
    Object.keys(proxy.resource).forEach(function(key){
      //proxify recusively unless its already a proxy
      var nested = proxy.resource[key];
      if(nested.$isProxy === true)
        return;

      proxy.resource[key] = createProxy(proxy.resource[key], proxy.faker);
    });
  }

  return Proxy.create(proxy);
};

module.exports = createProxy;