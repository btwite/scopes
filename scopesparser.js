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
 * @param {object} spec
 *      POJO object with scope extended property names to be transformed.
 */

function parse(oPublic, spec) {
    if (arguments.length == 1) {
        spec = oPublic;
        oPublic = Object.create(null);
    }

    if (!oPublic || typeof oPublic !== 'object') {
        throw new Error("Can only parse type object");
    }

    // Iterate through the object specification and transform extended declarative property names.
    Object.keys(o).forEach(name => {
        let actName = name,
            decl = name;
        let i = name.indexOf(sConnector);
        if (i >= 0) {
            actName = name.substring(i + sConnector.length);
            decl = name.substring(0, i + sConnector.length);
        }
        let desc;
        let transformer = transforms.get(decl);
        if (transformer) {
            desc = transformer(name, actName, transformsScope.get(decl));
        } else {
            desc = _publicTransform(name, name, sPublic);
        }
        property.defineProperty(oPublic, actName, desc);
    });

    // Set default functions for scopes that have not been declared
    _setDefaultScopeFn(scopeFns, sPublic);
    _setDefaultScopeFn(scopeFns, sPrivate);
    _setDefaultScopeFn(scopeFns, sProtected);

    // Prepare the super function object
    superObj.dispatch = _getSuperDispatchFn(oPublic);

    if (Object.isFrozen(o)) {
        Object.freeze(oPublic);
    } else if (Object.isSealed(o)) {
        Object.seal(oPublic);
    }

    // Give the caller the complete list of scope functions if they want it
    delete scopeFns.oPublic;
    if (fnScopes) {
        fnScopes(scopeFns);
    }

    return (oPublic);
}

function _getPublicFn(scopeFns) {
    return (that => {
        return (scopeFns.public(that));
    });
}

function _getPrivateFn(scopeFns) {
    return (that => {
        return (scopeFns.private(that));
    });
}

function _getProtectedFn(scopeFns) {
    return (that => {
        return (scopeFns.protected(that));
    });
}

function _getSuperFn(superObj) {
    return ((that, sMethod, args, noMethodCallback) => {
        return (superObj.dispatch.apply(undefined, arguments));
    });
}

function _getSuperDispatchFn(oPublic) {
    return ((that, sMethod, args, noMethodCall) => {
        // We have the current instance (that) and the executing code public object.
        // If the instance however is from a protected scope then we will need to work
        // back up the prototype list until we find the correct prototype protected instance
        // to match.
    });
}

function _setDefaultScopeFn(scopeFns, sScope) {
    if (!scopeFns[sScope])
        scopeFns[sScope] = that => {
            throw new Error(`Scope ${sScope} is empty`)
        };
}

function _assignIDs(o) {
    // Assign our unique ID
    let id = _nextID();
    _setSymbol(o, symID, id);

    // Look up the prototype list to capture the supported inherited IDs.
    let ids1 = {};
    ids1[id] = true;
    for (let p = Object.getPrototypeOf(o); p != null; p = Object.getPrototypeOf(p)) {
        let ids2 = p[symIDs];
        if (!ids2)
            continue;
        Object.assign(ids1, ids2);
        break;
    }
    _setSymbol(o, symIDs, Object.freeze(ids1));
    return (o);
}

function _setSymbol(o, sym, val) {
    Object.defineProperty(o, sym, {
        value: val,
        writable: false,
        configurable: false
    });
    return (o);
}

function _validateID(id, o, errmsg) {
    let ids = o[symIDs];
    if (!ids || !ids[id]) {
        throw new Error(errmsg);
    }
}

function _createScopesObject(oPublic) {

    // ??? Need to work out where this goes.    
    // if we have a prototype then we need to check all protected type scopes that exist 
    // for the prototype and creating mappings for scopes that were not inherited in this
    // normalisation. For example out prototype may have a standard protected scope but we may
    // not. In this case all protected scopes of the prototype are also our protected scopes.
    _fixHierachicalScopes(oPublic, oScopes, scopeFns);

    // ???? Need to work out where these are stored as our public object may already be frozen
    // or sealed. Note that we can't freeze or seal scope extension as it is built on the fly
    _setSymbol(oPublic, symPublic, oPublic); // All scope objects link back to the public root
    _assignIDs(oPublic); // Unique ID and supported inherited IDs.

    let oScopes = Object.create(null);
    _setSymbol(oScopes, symPublic, oPublic);
    oScopes[symInstances] = Object.create(null);
    oScopes[symAttributes] = Object.create(null);
    oScopes[symProtScopes] = [];
    scopesMap.set(oPublic, oScopes);
    return (oScopes);
}

function _publicTransform(scopeFns, oScopes, oSrc, scopeName, name) {
    __publicTransform(scopeFns, oScopes, oSrc, scopeName, name, Object.getOwnPropertyDescriptor(oSrc, scopeName));
}

function _constTransform(scopeFns, oScopes, oSrc, scopeName, name) {
    _constPublicTransform.apply(undefined, arguments);
}

function _constPublicTransform(scopeFns, oScopes, oSrc, scopeName, name) {
    let desc = Object.getOwnPropertyDescriptor(oSrc, scopeName);
    __publicTransform(scopeFns, oScopes, oSrc, scopeName, name, _setConstDescriptor(desc));
}

function __publicTransform(scopeFns, oScopes, oSrc, scopeName, name, desc) {
    Object.defineProperty(scopeFns.oPublic, name, desc);
    if (!scopeFns.public) {
        scopeFns.public = _publicThis(scopeFns.oPublic[symID]);
    }
}

function _publicThis(id) {
    return (that => {
        let root = that[symPublic];
        _validateID(id, root, 'Invalid public scope function');
        return (root)
    });
}

function _privateTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope) {
    __privateTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope, Object.getOwnPropertyDescriptor(oSrc, scopeName));
}

function _constPrivateTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope) {
    let desc = Object.getOwnPropertyDescriptor(oSrc, scopeName);
    __privateTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope, _setConstDescriptor(desc));
}

function __privateTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope, desc) {
    Object.defineProperty(_getPrivateScope(scopeFns.oPublic, oScopes, sScope), name, desc);
    if (_isPropertyWritable(desc)) {
        oScopes[symAttributes].constantScopes[sScope] = false;
    }
    if (!scopeFns[sScope]) {
        scopeFns[sScope] = _privateThis(oScopes, scopeFns.oPublic[symID], sScope);
    }
}

function _privateThis(oScopes, id, sScope) {
    return (that => {
        let root = that[symPublic];
        _validateID(id, root, `Invalid ${sScope} scope function`);
        // Each object requires an instance of private data for inherited objects
        let oSymInstances = scopesMap.get(root)[symInstances];
        let scopeInstance = oSymInstances[sScope];
        if (!scopeInstance) {
            oSymInstances[sScope] = scopeInstance = Object.create(null);
        }
        let oPrivInstance = scopeInstance[id];
        if (!oPrivInstance) {
            if (oScopes[symAttributes].constantScopes[sScope]) {
                scopeInstance[id] = oPrivInstance = oScopes[sScope]; // Can just use constant private object
            } else {
                scopeInstance[id] = oPrivInstance = Object.create(oScopes[sScope]); // Otherwise inherit from it
            }
        }
        return (oPrivInstance);
    });
}

function _getPrivateScope(oPublic, oScopes, sScope) {
    return (_getScope(sScope, oPublic, oScopes,
        () => {
            let constScopes = oScopes[symAttributes].constantScopes;
            if (!constScopes) {
                oScopes[symAttributes].constantScopes = constScopes = Object.create(null);
            }
            constScopes[sScope] = true;
        }));
}


function _protectedTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope) {
    __protectedTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope, Object.getOwnPropertyDescriptor(oSrc, scopeName));
}

function _constProtectedTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope) {
    let desc = Object.getOwnPropertyDescriptor(oSrc, scopeName);
    __protectedTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope, _setConstDescriptor(desc));
}

function __protectedTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope, desc) {
    Object.defineProperty(_getProtectedScope(scopeFns.oPublic, oScopes, sScope), name, desc);
    if (!scopeFns[sScope]) {
        scopeFns[sScope] = _protectedThis(oScopes, scopeFns.oPublic[symID], sScope);
        oScopes[symProtScopes][oScopes[symProtScopes].length] = sScope;
    }
}

function _protectedThis(oScopes, id, sScope) {
    return (that => {
        let root = that[symPublic];
        _validateID(id, root, `Invalid ${sScope} scope function`);
        return (scopesMap.get(root)[sScope]);
    });
}

function _getProtectedScope(oPublic, oScopes, sScope) {
    return (_getScope(sScope, oPublic, oScopes, undefined, () => {
        return (_getScopePrototype(sScope, oPublic));
    }));
}

function _privateScopeGroupTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope) {
    __privateScopeGroupTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope, sScope);
}

function _namedPrivateScopeGroupTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope) {
    __privateScopeGroupTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope, name);
}

function __privateScopeGroupTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope, nameOfScope) {
    _parseScopeGroup(oSrc, scopeName, (oGroup, scName, actName) => {
        _privateTransform(scopeFns, oScopes, oGroup, scName, actName, nameOfScope)
    }, (oGroup, scName, actName) => {
        _constPrivateTransform(scopeFns, oScopes, oGroup, scName, actName, nameOfScope)
    });
}

function _protectedScopeGroupTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope) {
    __protectedScopeGroupTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope, sScope);
}

function _namedProtectedScopeGroupTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope) {
    __protectedScopeGroupTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope, name);
}

function __protectedScopeGroupTransform(scopeFns, oScopes, oSrc, scopeName, name, sScope, nameOfScope) {
    _parseScopeGroup(oSrc, scopeName, (oGroup, scName, actName) => {
        _protectedTransform(scopeFns, oScopes, oGroup, scName, actName, nameOfScope)
    }, (oGroup, scName, actName) => {
        _constProtectedTransform(scopeFns, oScopes, oGroup, scName, actName, nameOfScope)
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


function _fixHierachicalScopes(oPublic, oScopes, scopeFns) {
    _getPrototypeProtectedScopes(oPublic).forEach(sScope => {
        let prot = _getScopePrototype(sScope, oPublic);
        if (prot) {
            if (oScopes[sScope]) {
                return;
            }
            oScopes[sScope] = Object.create(prot);
            oScopes[symProtScopes][oScopes[symProtScopes].length] = sScope;
            // Only add the scope function to the scope function list for the default protected
            // scope. Named scopes have a level of secrecy and can only be referenced and shared
            // by those in the know.
            if (sScope == sProtected)
                scopeFns[sScope] = _protectedThis(oScopes, scopeFns.oPublic[symID], sScope);
        }
    });
}

function _getPrototypeProtectedScopes(oPublic) {
    for (let prot = Object.getPrototypeOf(oPublic); prot; prot = Object.getPrototypeOf(prot)) {
        if (!prot[symID])
            continue;
        let oScopes = scopesMap.get(prot);
        return (oScopes[symProtScopes]);
    }
    return ([]);
}

function _getScopePrototype(sScope, oPublic) {
    for (let prot = Object.getPrototypeOf(oPublic); prot; prot = Object.getPrototypeOf(prot)) {
        if (!prot[symID])
            continue;
        let oScopes = scopesMap.get(prot);
        if (oScopes[sScope])
            return (oScopes[sScope]);
        return (null);
    }
    return (null);
}

function _setConstDescriptor(desc) {
    if (desc.hasOwnProperty('writable')) desc.writable = false;
    desc.configurable = false;
    return (desc);
}

function _isPropertyWritable(desc) {
    return (desc.writable || desc.set);
}

function _getScope(sScope, oPublic, oScopes, fnInit, fnPrototype) {
    let oScope = oScopes[sScope];
    if (!oScope) {
        let prototype = fnPrototype ? fnPrototype() : null;
        oScopes[sScope] = oScope = Object.create(prototype);
        if (fnInit) {
            fnInit(oScope);
        }
        _setSymbol(oScope, symPublic, oPublic);
    }
    return (oScope);
}