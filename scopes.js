/**
 * scopes : @file
 * 
 * Public interface for scopes implementation.
 * 
 */

'use strict'

let modParser = require('./scopesparser');
let modProperty = require('./scopesproperty');

module.exports = {
    parse: modParser.parse,
    defineProperty: modProperty.defineProperty,
    defineProperties: modProperty.defineProperties,
    packageScopesFnArgs: modProperty.packageScopesFnArgs,
    pushDefaultPropertyAttributes: modProperty.pushDefaultPropertyAttributes,
    popDefaultPropertyAttributes: modProperty.popDefaultPropertyAttributes,
    resetDefaultPropertyAttributes: modProperty.resetDefaultPropertyAttributes
}
Object.freeze(module.exports);