# Scopes

A library that implements private and protected scopes for Javascript objects. Supports prototype inheritance and can be applied to new or existing objects. The scopes module exposes a `defineProperty` method that is an extension of `Object.defineProperty` with the inclusion a new `scope` attribute that can be set to either `'private'` or `'protected'`. A *private* scope is bounded by the owning object whilst a *protected* scope is bounded by the inheritance hierarchy.

### What is this repository for?

* Scopes Javascript modules. `scopes.js` is the main module for the library
* Version: 1.1.0

### Prerequisites

* An ECAScript 2015 complient Javascript environment

### Installation

* NPM Package - `npm install prop-scopes'

### Testing

Repository includes the script `testbed.js` which contains a list of selectable
functions for testing the features of the scopes library. Note that it references the module `./scopes`. This should be modified to `prop-scopes` for an npm installation.

A formal testing environment is yet to be setup.

### API

The following example shows the inclusion of the scopes library when the npm package `prop-scopes` has been installed.

```
let scopes = require('prop-scopes');
let myObject = scopes.defineProperty({}, 'myPrivateMethod', (Public, Private, Protected) => {
    return {
        scope: 'private',
        value: function () {
            Public(this).myPublicMethod();
        }
    };
});
```

#### defineProperty(obj, prop, fnDescriptor)
Extension of the `Object.defineProperty` method allowing the inclusion of a `scope` attribute to nominate the scope of the property.

* *obj* - The target object of the defineProperty request.
* *prop* - The name of the property to define.
* *fnDescriptor* - A function that returns the descriptor. The `scope` attribute can be assign `'public'`, `'private'` or `'protected'`. The descriptor function will be passed three arguments typically referred to as (`Public, Private, Protected`) that are scope functions for moving focus between scopes. For example, if the property being defined is in the *private* scope then associated code must use the expression `Public(this).myMethod()` to shift focus to the *public* scope, or `Protected(this).myOtherMethod()` to shift focus to the *protected* scope.

Note that if the descriptor does not require access to the scope functions then a descriptor object can be passed in place of the inline function wrapper. All other non function values (including objects that are not in descriptor format) will be deemed to be a public value for the property. 

Refer to *withAttributeDefaultsDo* for default property attribute values.

#### defineProperties(obj, fnDescriptor)
Extension of the `Object.defineProperties` method allowing multiple scoped properties to be defined in one call.

* *obj* - The target object of the request.
* *fnDescriptor* - A function that returns a descriptor object for one or more properties. As for `defineProperty` the function is passed the scope transition functions for *public*, *private* and *protected*.

Note that if the descriptor does not require access to the scope functions then a normal properties descriptor object can be passed in place of the inline function wrapper. As for *defineProperty* the attribute descriptor that is normally associated with each property can be replaced with any non attribute descriptor value which will be deemed to be the public value of the property.

Refer to *withAttributeDefaultsDo* for default property attribute values.

#### parse([obj], fnObjTemplate)
The parse method will process an object template and parse the property names for a scopes keyword(s) prefix, that assist in formulating a property descriptor that is then forwarded to `defineProperty`.

* *[obj]* - Optional target object for the parsed property definitions. If no object is provided then the `parse` method will create a new object.
* *fnObjTemplate* - A function that returns an object template that is to be parsed. As for `defineProperty` the function is passed the scope transition functions for *public*, *private* and *protected*.

Note that if the keyword extended object literal does not require access to the scope functions then then the object literal can be passed in place of the inline function wrapper.

Refer to *withAttributeDefaultsDo* for default property attribute values. The property attributes `configurable`, `writable` and `enumerable` are not derived from the extended properties that are defined in the template. The `const` and `var` qualifiers will set one or more attributes as indicated in the next section but otherwise the scopes default attributes will be applied if any of three attributes mentioned above are not present.

##### Property Name Keyword Extensions

* `public__<name>` : Public property
* `private__<name>` : Private property
* `protected__<name>` : Protected property
* `const__<name>` : Constant property at the current scope. The `writable` and `configurable` attributes are set to `false`.
* `const_public__<name>` : Constant public property. `public_const__*` is also supported.
* `const_private__<name>` : Constant private property. `private_const__*` is also supported.
* `const_protected__<name>` : Constant protected property. `protected_const__*` is also supported.
* `var__<name>` : Variable property at the current scope. The `writable` attribute is set to `true`.
* `var_public__<name>` : Variable public property. `public_var__*` is also supported.
* `var_private__<name>` : Variable private property. `private_var__*` is also supported.
* `var_protected__<name>` : Variable protected property. `protected_var__*` is also supported.
* `private_scope[__<name>]` : Allows the definition of the private properties to be grouped together. Property names do not require `private__` prefix. Optional *name* is covered below in section on named scopes. 
* `protected_scope[__<name>]` : Allows the definition of the private properties to be grouped together. Property names do not require `protected__` prefix. Optional *name* is covered below in section on named scopes. 

#### Named Scopes
The `private` and `protected` scopes as discussed above are default instantiations of the *private* and *protected* scope types, where a *private* scope is bounded by the owning object and a *protected* scope is bounded by the inheritance hierarchy. A javascript object may be assigned multiple *private* and *protected* scopes by naming additional instantiations.

In the case of a parsed object template this can only be done by name extending a `private_scope` or `protected_scope` group declaration. For `defineProperty` and `defineProperties` the `scope` attribute is assigned an object of the form `{ <name>: 'private' | 'protected' }`.

Naming of scopes allow specialised scopes to be defined for selected access by others without exposing the default *private* and *protected* scopes or other named scopes. For example a package may expose a restricted interface to an object(s) that can be employed within the package but not outside. Whether the named scope is *private* or *protected* will depend on whether inheritance is involved in the object structure.

Access to a scope is controlled by scope transition functions which are allocated at the time a given scope is defined. As seen above descriptor and object template functions are actually passed scope transition functions for *public*, *private* and *protected*. All other scope transition functions must be acquired from the object via a `getScopeFns` request.

#### lock(obj)
Complements the `Object.freeze` and `Object.seal` methods by locking the scope extension of the object and returns a key that is tied to the object. Once an object is locked scope changes to the object can only be performed by passing the key in place of the target object. The object can be shared but modifications can be constrained to the object owner.

* *obj* - The target object to lock.

Note that `defineProperty`, `defineProperties` and `parse` will accept a key in place of the object.

#### isLocked(obj)
Check whether an object is locked.

* *obj* - The target object to check.

#### getScopeFns(obj)
Returns an object with an entry for every scope transition function associated with the object. Once the functions have been returned a scope can be accessed by the expression `<fns>.<scope>(<anObject>)`. For example `fns.myScope(this)`.

* *obj* - The target object or key. Will also accept the *public* scope transition function where the target object is unknown at that point in time. For example this can occur in a `parse` request that also creates the target object and all transition functions are required for the body of code contained in the template.

#### getOwnPropertyDescriptor(scope, prop)
Extension of the `Object.getOwnPropertyDescriptor` method that will return a property descriptor with the additional `scope` attribute.

* *scope* - A scope object that is returned from a `<scope>(<anObject>)` request.
* *prop* - The name of the property.

#### finalise(scope)
Applies only to named protected scopes and will prevent any further extensions to the named protected scope hierarchy. Finalising in effect transforms the protected hierarchy into a privately scoped hierarchy that by default is only visible and accessible to the finalised object and parents.

* *scope* - A scope object that is returned from a `<scope>(<anObject>)` request.

#### isFinal(obj, scopename)
Checks if the named scope is finalised for an object.

* *obj* - The target object to check.
* *scopename* - The name of a protected scope.

#### isScoped(obj)
Checks id the object has scope extensions.

* *obj* - The target object to check.

#### assign(oTarget, oSource)
Extension of the `Object.assign` method that will assign the source object to the target object. Unlike `Object.assign`, this is a property attribute assignment not a value assignment. If the source object has scope extensions then both the *public* and *protected* properties will be assigned. The *private* properties are not assigned as their associated behaviour is inherited by default from the references in the assigned *public* and *protected* code. 

* *oTarget* - Target object of the assignment.
* *oSource* - Source object of the assignment.

#### delete(scope, prop)
Extension to the `delete` statement to allow a property to be deleted from a scope object.

* *scope* - A scope object that is returned from a `<scope>(<anObject>)` request.
* *prop* - Name of the property to delete.

#### freeze(obj)
Extension to the `Object.freeze` method to apply the freeze to all *private* and *protected* scopes.

* *obj* - The target object to freeze.

#### seal(obj)
Extension to the `Object.seal` method to apply the seal to all *private* and *protected* scopes.

* *obj* - The target object to seal.

#### super(that, methodname, [fnUndefined])
Special scope function that will return an instance of the named method starting the search from the prototype of the object that is associated with the `super` scope function. If no method is found then `undefined` is returned.

* *obj* - The current *this* object. The *this* object must inherit from the object owing the `super` scope function.
* *methodname* - The name of the method to locate.
* *[fnUndefined]* - Optional function to handle an `undefined` response and substitute and alternate return value. For covenience, this parameter may also be a non function value which will be assumed to be the alternate return value. The `undefined` handler function is passed the current *this* object, the name of the method and the arguments.

Example : `fns.super(this, 'myMethod')(arg1, arg2, ...);`

#### self(that, methodname, [fnUndefined])
As for `super` except that the method search starts at the object that owns the `self` scope function, rather than the immediate prototype.

#### withAttributeDefaultsDo(defAttrs, fnDo)
Returns the result of calling the `fnDo` function after setting the scopes default property attribute values to the `defAttrs` descriptor object.

* *defAttrs* - An object that contains values for one or more of the property attributes `writable`, `configurable` and `enumerable`. An unspecified attribute will be sourced from the scopes startup constant property default of `{ writable: false, configurable: false, enumerable: true }`.
* *fnDo* - A function that when called will be encapsulated by the modified default property attribute values. These default attribute values will be applied whenever a new property is defined via the scopes *defineProperty*, *defineProperties* and *parse* methods.

Note that the *writable* attribute will only be applied to *value* type properties. The default is ignored if a *get* or *set* attribute is defined.

#### withConstantDefaultsDo(fnDo)
Convenience method that returns the result of calling the `fnDo` function after setting the scopes default property attribute values to define constant properties.

Attribute values are set to `{ writable: false, configurable: false, enumerable: true }`.

See *withAttributeDefaultsDo* for more details.

#### withVariableDefaultsDo(fnDo)
Convenience method that returns the result of calling the `fnDo` function after setting the scopes default property attribute values to define variable properties.

Attribute values are set to `{ writable: true, configurable: false, enumerable: true }`.

See *withAttributeDefaultsDo* for more details.

#### withObjectLiteralDefaultsDo(fnDo)
Convenience method that returns the result of calling the `fnDo` function after setting the scopes default property attribute values to be consistent with standard object literals.

Attribute values are set to `{ writable: true, configurable: true, enumerable: true }`.

See *withAttributeDefaultsDo* for more details.

### Contributing

TBC

### Versioning

TBC

### Authors

* Bruce Twite - Initial work

### License

ISC - Internet Systems Consortium

Copyright 2018 Bruce Twite

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

### Acknowledgements

* Adam Twite - for his technical guidance and help in steering the project in the right direction.
