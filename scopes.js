/**
 * scopes : @file
 * 
 * Public interface for scopes implementation.
 * 
 */

'use strict'

let modParser = require('./scopesparser');
let modProperty = require('./scopesproperty');
let modServices = require('./scopesservices');

module.exports = {
    parse: modParser.parse,
    defineProperty: modProperty.defineProperty,
    defineProperties: modProperty.defineProperties,
    packageScopesFnArgs: modProperty.packageScopesFnArgs,
    finalise: modProperty.finalise,
    finalize: modProperty.finalize,
    isfinal: modProperty.isFinal,
    isScoped: modProperty.isScoped,
    getOwnPropertyDescriptor: modServices.getOwnPropertyDescriptor,
    assign: modServices.assign,
    delete: modServices.delete,
    freeze: modServices.freeze,
    seal: modServices.seal,
    log: modServices.log,
    pushDefaultPropertyAttributes: modProperty.pushDefaultPropertyAttributes,
    popDefaultPropertyAttributes: modProperty.popDefaultPropertyAttributes,
    resetDefaultPropertyAttributes: modProperty.resetDefaultPropertyAttributes
}
Object.freeze(module.exports);