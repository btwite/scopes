/**
 * scopesparser : @file
 * 
 * Provides the declarative parser support for scopes object template using the
 * property name to define scopes syntax extensions.
 * 
 * This is a meta level interface which takes a source object template and produces a
 * scoped object based on declaration syntax that is prepended to a property name.
 * 
 * NOTE: The default property attribute values for 'writable', 'configurable' and
 *       'enumerable' are NOT inherited from the template. The parse process results
 *       in defineProperty requests to construct the scoped object and as such will
 *       inherit defineProperty level attribute values.
 * 
 *       The defineProperty defaults are 'writable: false', 'configurable: false' and
 *       'enumerable: true'. The latter being different to the Object.defineProperty
 *       default value of false. The scopes library includes an interface to push and
 *       pop changes to the defaults.
 * 
 *       The parser can influence the 'writable' and 'configurable' attributes based on
 *       whether a parsed property is declared as 'const' or 'var'. If neither is
 *       specified then the defineProperty defaults will apply.
 */

'use strict'

let services = require('./scopesservices');

module.exports = {
    parse,
    setPropertyInterface,
};
Object.freeze(module.exports);

let property = undefined;

function setPropertyInterface(intface) {
    if (!property)
        property = intface;
}

const sPublic = 'public';
const sPrivate = 'private';
const sProtected = 'protected';

const sConnector = '__';
const sPublicScope = 'public' + sConnector;
const sPrivateScope = 'private' + sConnector;
const sProtectedScope = 'protected' + sConnector;
const sConst = 'const' + sConnector;
const sConstPublicScope = 'const_public' + sConnector;
const sConstPrivateScope = 'const_private' + sConnector;
const sConstProtectedScope = 'const_protected' + sConnector;
const sPublicConstScope = 'public_const' + sConnector;
const sPrivateConstScope = 'private_const' + sConnector;
const sProtectedConstScope = 'protected_const' + sConnector;
const sVar = 'var' + sConnector;
const sVarPublicScope = 'var_public' + sConnector;
const sVarPrivateScope = 'var_private' + sConnector;
const sVarProtectedScope = 'var_protected' + sConnector;
const sPublicVarScope = 'public_var' + sConnector;
const sPrivateVarScope = 'private_var' + sConnector;
const sProtectedVarScope = 'protected_var' + sConnector;
const sPrivateScopeGroup = 'private_scope';
const sProtectedScopeGroup = 'protected_scope';
const sNamedPrivateScopeGroup = 'private_scope' + sConnector;
const sNamedProtectedScopeGroup = 'protected_scope' + sConnector;

const transforms = (new Map)
    .set(sPublicScope, _publicTransform)
    .set(sPrivateScope, _privateTransform)
    .set(sProtectedScope, _protectedTransform)
    .set(sConst, _constTransform)
    .set(sConstPublicScope, _constPublicTransform)
    .set(sConstPrivateScope, _constPrivateTransform)
    .set(sConstProtectedScope, _constProtectedTransform)
    .set(sPublicConstScope, _constPublicTransform)
    .set(sPrivateConstScope, _constPrivateTransform)
    .set(sProtectedConstScope, _constProtectedTransform)
    .set(sVar, _varTransform)
    .set(sVarPublicScope, _varPublicTransform)
    .set(sVarPrivateScope, _varPrivateTransform)
    .set(sVarProtectedScope, _varProtectedTransform)
    .set(sPublicVarScope, _varPublicTransform)
    .set(sPrivateVarScope, _varPrivateTransform)
    .set(sProtectedVarScope, _varProtectedTransform)
    .set(sPrivateScopeGroup, _privateScopeGroupTransform)
    .set(sProtectedScopeGroup, _protectedScopeGroupTransform)
    .set(sNamedPrivateScopeGroup, _namedPrivateScopeGroupTransform)
    .set(sNamedProtectedScopeGroup, _namedProtectedScopeGroupTransform);

const transformsScope = (new Map)
    .set(sPublicScope, sPublic)
    .set(sPrivateScope, sPrivate)
    .set(sProtectedScope, sProtected)
    .set(sConst, sPublic)
    .set(sConstPublicScope, sPublic)
    .set(sConstPrivateScope, sPrivate)
    .set(sConstProtectedScope, sProtected)
    .set(sPublicConstScope, sPublic)
    .set(sPrivateConstScope, sPrivate)
    .set(sProtectedConstScope, sProtected)
    .set(sVar, sPublic)
    .set(sVarPublicScope, sPublic)
    .set(sVarPrivateScope, sPrivate)
    .set(sVarProtectedScope, sProtected)
    .set(sPublicVarScope, sPublic)
    .set(sPrivateVarScope, sPrivate)
    .set(sProtectedVarScope, sProtected)
    .set(sPrivateScopeGroup, sPrivate)
    .set(sProtectedScopeGroup, sProtected)
    .set(sNamedPrivateScopeGroup, sPrivate)
    .set(sNamedProtectedScopeGroup, sProtected);

/**
 * Parse a POJO with scope extended elements and produce a native implementation
 * Scope extension is defined by prefixing element names with:
 *      public__    - This is the default and provided for completness.
 *      private__   - Access is limited to the owning object.
 *      protected__ - Access is limited to objects in the prototype hierachy.
 *      const_*__   - The property is declared as a constant. (writable = false, configurable = false)
 *      *_const__   - As above
 *      var_*__     - The property is declares as variable. (writable = true)
 *      *_var__     - As above
 *      private_scope       - Separate object with just private properties. Allows const__
 *      protected_scope     - Separate object with just protected properties. Allows const__
 *      private_scope__     - Named private group scope (separate to private). Allows const__
 *      protected_scope__   - Named protected group scope (seperate to protected). Allows const__
 * 
 * @param {object} oPublic
 *      Target public object that the parse transformation is to be applied to.
 *      If only one argument is provided then this be the scope specification object.
 *      In this case the parser will create the public object with no prototype.
 * 
 * @param {object} fnSpec
 *      Function that returns a POJO object with scope extended property names to be 
 *      transformed.
 */

function parse(oPublic, fnSpec) {
    if (arguments.length == 1) {
        fnSpec = oPublic;
        oPublic = {};
    } else if (typeof oPublic !== 'object') {
        throw new Error("Can only parse type object");
    }

    let spec = property.prepareParserOperation(oPublic, fnSpec);
    // Iterate through the object specification and transform extended declarative property names.
    Object.keys(spec).forEach(name => {
        let actName = name,
            decl = name;
        let i = name.indexOf(sConnector);
        if (i >= 0) {
            actName = name.substring(i + sConnector.length);
            decl = name.substring(0, i + sConnector.length);
        }
        let transformer = transforms.get(decl);
        if (transformer) {
            transformer(oPublic, actName, spec, name, transformsScope.get(decl));
            return;
        }
        _publicTransform(oPublic, name, spec, name, sPublic);
    });

    if (Object.isFrozen(spec)) {
        services.freeze(oPublic);
    } else if (Object.isSealed(spec)) {
        services.seal(oPublic);
    }
    return (oPublic);
}

function _publicTransform(oPublic, name, oSrc, scopeName) {
    __publicTransform(oPublic, name, _getSourcePropertyDescriptor(oSrc, scopeName));
}

function _constTransform(...args) {
    _constPublicTransform(...args);
}

function _constPublicTransform(oPublic, name, oSrc, scopeName) {
    __publicTransform(oPublic, name, _setConstDescriptor(_getSourcePropertyDescriptor(oSrc, scopeName)));
}

function _varTransform(...args) {
    _varPublicTransform(...args);
}

function _varPublicTransform(oPublic, name, oSrc, scopeName) {
    __publicTransform(oPublic, name, _setVarDescriptor(_getSourcePropertyDescriptor(oSrc, scopeName)));
}

function __publicTransform(oPublic, name, desc) {
    property.defineProperty(oPublic, name, desc);
}


function _privateTransform(oPublic, name, oSrc, scopeName, sScope) {
    __privateTransform(oPublic, name, sScope, _getSourcePropertyDescriptor(oSrc, scopeName));
}

function _constPrivateTransform(oPublic, name, oSrc, scopeName, sScope) {
    let desc = _getSourcePropertyDescriptor(oSrc, scopeName);
    __privateTransform(oPublic, name, sScope, _setConstDescriptor(desc));
}

function _varPrivateTransform(oPublic, name, oSrc, scopeName, sScope) {
    let desc = _getSourcePropertyDescriptor(oSrc, scopeName);
    __privateTransform(oPublic, name, sScope, _setVarDescriptor(desc));
}

function __privateTransform(oPublic, name, sScope, desc) {
    desc.scope = {
        private: sScope
    };
    property.defineProperty(oPublic, name, desc);
}


function _protectedTransform(oPublic, name, oSrc, scopeName, sScope) {
    __protectedTransform(oPublic, name, sScope, _getSourcePropertyDescriptor(oSrc, scopeName));
}

function _constProtectedTransform(oPublic, name, oSrc, scopeName, sScope) {
    let desc = _getSourcePropertyDescriptor(oSrc, scopeName);
    __protectedTransform(oPublic, name, sScope, _setConstDescriptor(desc));
}

function _varProtectedTransform(oPublic, name, oSrc, scopeName, sScope) {
    let desc = _getSourcePropertyDescriptor(oSrc, scopeName);
    __protectedTransform(oPublic, name, sScope, _setVarDescriptor(desc));
}

function __protectedTransform(oPublic, name, sScope, desc) {
    desc.scope = {
        protected: sScope
    };
    property.defineProperty(oPublic, name, desc);
}


function _privateScopeGroupTransform(oPublic, name, oSrc, scopeName, sScope) {
    __privateScopeGroupTransform(oPublic, oSrc, scopeName, sScope, sScope);
}

function _namedPrivateScopeGroupTransform(oPublic, name, oSrc, scopeName, sScope) {
    __privateScopeGroupTransform(oPublic, oSrc, scopeName, sScope, name);
}

function __privateScopeGroupTransform(oPublic, oSrc, scopeName, sScope, nameOfScope) {
    _parseScopeGroup(oSrc, scopeName, (oGroup, scName, actName) => {
        _privateTransform(oPublic, actName, oGroup, scName, nameOfScope)
    }, (oGroup, scName, actName) => {
        _constPrivateTransform(oPublic, actName, oGroup, scName, nameOfScope)
    }, (oGroup, scName, actName) => {
        _varPrivateTransform(oPublic, actName, oGroup, scName, nameOfScope)
    });
}

function _protectedScopeGroupTransform(oPublic, name, oSrc, scopeName, sScope) {
    __protectedScopeGroupTransform(oPublic, oSrc, scopeName, sScope, sScope);
}

function _namedProtectedScopeGroupTransform(oPublic, name, oSrc, scopeName, sScope) {
    __protectedScopeGroupTransform(oPublic, oSrc, scopeName, sScope, name);
}

function __protectedScopeGroupTransform(oPublic, oSrc, scopeName, sScope, nameOfScope) {
    _parseScopeGroup(oSrc, scopeName, (oGroup, scName, actName) => {
        _protectedTransform(oPublic, actName, oGroup, scName, nameOfScope)
    }, (oGroup, scName, actName) => {
        _constProtectedTransform(oPublic, actName, oGroup, scName, nameOfScope)
    }, (oGroup, scName, actName) => {
        _varProtectedTransform(oPublic, actName, oGroup, scName, nameOfScope)
    });
}

function _parseScopeGroup(oSrc, scopeName, fnCallback, fnConstCallback, fnVarCallback) {
    let oGroup = oSrc[scopeName];
    if (!oGroup || typeof oGroup !== 'object') {
        throw new Error(`Invalid scope group for '${scopeName}'`);
    }
    Object.keys(oGroup).forEach(name => {
        let actName = name,
            decl = name;
        let i = name.indexOf(sConnector);
        if (i >= 0) {
            actName = name.substring(i + sConnector.length);
            decl = name.substring(0, i + sConnector.length);
        }
        switch (decl) {
            case sConst:
                fnConstCallback(oGroup, name, actName);
                break;
            case sVar:
                fnVarCallback(oGroup, name, actName);
                break;
            default:
                fnCallback(oGroup, name, name);
                break;
        }
    });
}

function _getSourcePropertyDescriptor(oSrc, prop) {
    // The attributes configurable, enumerable and writable are not inherited from
    // the source template. These are controlled by a combination of the 'var' and
    // 'const' qualifiers as well as the default attributes that apply to 
    // defineProperty.
    let desc = Object.getOwnPropertyDescriptor(oSrc, prop);
    delete desc.configurable;
    delete desc.enumerable;
    delete desc.writable;
    return (desc);
}

function _setConstDescriptor(desc) {
    if (!desc.set && !desc.get) desc.writable = false;
    desc.configurable = false;
    return (desc);
}

function _setVarDescriptor(desc) {
    if (!desc.set && !desc.get) desc.writable = true;
    return (desc);
}