/**
 * scopesparser : @file
 * 
 * Provides the declarative parser support for scopes object template using the
 * property name to define scopes syntax extensions.
 * 
 * This is a meta level interface which is essentially
 * 
 */

'use strict'

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
    .set(sPrivateScopeGroup, _privateScopeGroupTransform)
    .set(sProtectedScopeGroup, _protectedScopeGroupTransform)
    .set(sNamedPrivateScopeGroup, _namedPrivateScopeGroupTransform)
    .set(sNamedProtectedScopeGroup, _namedProtectedScopeGroupTransform)

const transformsScope = (new Map)
    .set(sPublicScope, sPublic)
    .set(sPrivateScope, sPrivate)
    .set(sProtectedScope, sProtected)
    .set(sConst, sPublic)
    .set(sConstPublicScope, sPublic)
    .set(sConstPrivateScope, sPrivate)
    .set(sConstProtectedScope, sProtected)
    .set(sPrivateScopeGroup, sPrivate)
    .set(sProtectedScopeGroup, sProtected)
    .set(sNamedPrivateScopeGroup, sPrivate)
    .set(sNamedProtectedScopeGroup, sProtected)

/**
 * Parse a POJO with scope extended elements and produce a native implementation
 * Scope extension is defined by prefixing element names with:
 *      public__    - This is the default and provided for completness.
 *      private__   - Access is limited to the owning object.
 *      protected__ - Access is limited to objects in the prototype hierachy.
 *      const_*__   - The element is declared as a constant. Applies to data properties.
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
        oPublic = Object.create(null);
    } else if (!oPublic || typeof oPublic !== 'object') {
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
        Object.freeze(oPublic);
    } else if (Object.isSealed(spec)) {
        Object.seal(oPublic);
    }
    return (oPublic);
}

function _publicTransform(oPublic, name, oSrc, scopeName) {
    __publicTransform(oPublic, name, Object.getOwnPropertyDescriptor(oSrc, scopeName));
}

function _constTransform(oPublic, name, oSrc, scopeName) {
    _constPublicTransform.apply(undefined, arguments);
}

function _constPublicTransform(oPublic, name, oSrc, scopeName) {
    __publicTransform(oPublic, name, _setConstDescriptor(Object.getOwnPropertyDescriptor(oSrc, scopeName)));
}

function __publicTransform(oPublic, name, desc) {
    property.defineProperty(oPublic, name, desc);
}


function _privateTransform(oPublic, name, oSrc, scopeName, sScope) {
    __privateTransform(oPublic, name, sScope, Object.getOwnPropertyDescriptor(oSrc, scopeName));
}

function _constPrivateTransform(oPublic, name, oSrc, scopeName, sScope) {
    let desc = Object.getOwnPropertyDescriptor(oSrc, scopeName);
    __privateTransform(oPublic, name, sScope, _setConstDescriptor(desc));
}

function __privateTransform(oPublic, name, sScope, desc) {
    desc.scope = {
        private: sScope
    };
    property.defineProperty(oPublic, name, desc);
}


function _protectedTransform(oPublic, name, oSrc, scopeName, sScope) {
    __protectedTransform(oPublic, name, sScope, Object.getOwnPropertyDescriptor(oSrc, scopeName));
}

function _constProtectedTransform(oPublic, name, oSrc, scopeName, sScope) {
    let desc = Object.getOwnPropertyDescriptor(oSrc, scopeName);
    __protectedTransform(oPublic, name, sScope, _setConstDescriptor(desc));
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
    });
}

function _parseScopeGroup(oSrc, scopeName, fnCallback, fnConstCallback) {
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
        if (!transforms.get(decl)) {
            fnCallback(oGroup, name, name);
        } else if (decl === sConst) {
            fnConstCallback(oGroup, name, actName);
        }
    });
}

function _setConstDescriptor(desc) {
    desc.writable = false;
    desc.configurable = false;
    return (desc);
}