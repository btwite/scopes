/**
 * scopes : @file
 * 
 * Public interface for scopes implementation.
 * 
 */

'use strict'

let modProperty = require('./scopesproperty');
let modParser = require('./scopesparser');

module.exports = {
    parse: modParser.parser,
    defineProperty: modParser.defineProperty,
    defineProperties: modParser.defineProperties,
}
Object.freeze(module.exports);