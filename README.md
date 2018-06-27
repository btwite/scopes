# Scopes

A library that implements private and protected scopes for Javascript objects. Supports prototype inheritance and can be applied to new or existing objects. The scopes module exposes a `defineProperty` method that is an extension of `Object.defineProperty` with the inclusion a new `scope` attribute that can be set to either `'private'` or `'protected'`. A *private* scope is bounded by the owning object whilst a *protected* scope is bounded by the inheritance hierarchy.

### What is this repository for?

* Scopes Javascript modules. `scopes.js` is the main module for the library
* Version: 1.0.0

### Prerequisites

* An ECAScript 2015 complient Javascript environment

### Installation

* NPM Package - `npm install prop-scopes'

### Testing

Repository includes the script `testbed.js` which contains a list of selectable
functions for testing the features of the scopes library. Note that it references the module `./scopes`. This should be modified to `prop-scopes` for an npm installation.

A formal testing environment is yet to be setup.

### API

#### defineProperty(obj, prop, fnDescriptor)
Extension of the `Object.defineProperty` method allowing the inclusion of a `scope` attribute to nominate the scope of the property.

* *obj* - The target object of the defineProperty request.
* *prop* - The name of the property to define.
* *fnDescriptor* - A function that returns the descriptor. The `scope` attribute can be assign `'public'`, `'private'` or `'protected'`. The descriptor function will be passed three arguments typically referred to as (`Public, Private, Protected`) that are scope functions for moving focus between scopes. For example, if the property being defined is in the *private* scope then associated code must use the expression `Public(this).myMethod()` to shift focus to the *public* scope, or `Protected(this).myOtherMethod()` to shift focus to the *protected* scope.

#### defineProperties(obj, fnDescriptor)
Extension of the `Object.defineProperties` method allowing multiple scoped properties to be defined in one call.

* *obj* - The target object of the request.
* *fnDescriptor* - A function that returns a descriptor object for one or more properties. As for `defineProperty` the function is passed the scope transition functions for *public*, *private* and *protected*.

#### parse([obj], fnObjTemplate)
The parse method will process an object template and parse the property names for scopes extended keywords, that assist in formulating a property descriptor that is then forwarded to `defineProperty`.

* *[obj]* - Optional target object for the parsed property definitions. If no object is provided then the `parse` method will create a new object.
* *fnObjTemplate* - A function that returns an object template that is to be parsed. As for `defineProperty` the function is passed the scope transition functions for *public*, *private* and *protected*.

##### Property Name Keyword Extensions

* `public__<name>` : Public property
* `private__<name>` : Private property
* `protected__<name>` : Protected property
* `const__<name>` : Constant property at the current scope. The `writable` and `configurable` attributes are set to `false`.
* `const_public__<name>` : Constant public property.
* `const_private__<name>` : Constant private property.
* `const_protected__<name>` : Constant protected property.
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

* *obj* - The current *this* object. The *this* object must inherit from teh object owing the `super` scope function.
* *methodname* - The name of the method to locate.
* *[fnUndefined]* - Optional function to handle an `undefined` response and substitute and alternate response.

Example : `fns.super(this, 'myMethod')(arg1, arg2, ...);`

#### self(that, methodname, [fnUndefined])
As for `super` except that the method search starts at the object that owns the `self` scope function, rather than the immediate prototype.

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
