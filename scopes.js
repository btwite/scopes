/**
 * ifTransform : @file
 * 
 * Provides POJO scope support services.
 * 
 */

'use strict'

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

const symRoot = Symbol.for('scopesRoot');
const symID = Symbol.for('scopesID');
const symIDs = Symbol.for('scopesIDs');

const sflConst = 'flConst';

const scopesMap = new WeakMap(); // Map that contains the scopes extension object for a parsed object

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

let nextID = 1; // Next Object ID number

/**
 * Replace Object.create so that we can auto detect instance creation and prepare the correct
 * structure.
 * There is also a functions to remove and reinstate the hook which should be called with care. 
 */
let fnObjectCreate;
setObjectCreateHook();

function removeObjectCreateHook() {
    if (fnObjectCreate)
        Object.Create = fnObjectCreate;
}

function setObjectCreateHook() {
    fnObjectCreate = Object.create;
    Object.create = createInstance;
}

function objectCreate(prototype, properties) {
    return (fnObjectCreate.apply(undefined, arguments));
}

function createInstance(prototype, properties) {
    let o = fnObjectCreate.apply(undefined, arguments);
    if (!o[symID]) {
        return (o);
    }

    // Create the scopes object and finish off the initial structure
    // Don't need IDs as these will be inherited from prototype
    _setSymbol(o, symRoot, o);
    let oScopes = fnObjectCreate(null);
    _setSymbol(oScopes, symRoot, o);
    scopesMap.set(o, oScopes);

    return (o);
}

/**
 * Parse a javascript POJO with scope extended elements and produce a native implementation.
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
 * @param {object} o
 *      POJO object to transform
 * 
 * @param {object} prototype
 *      Optional prototype object to be attached to the object.
 */

function parse(fnObj) {
    // Process the variable arguments. We allow the prototype to be replaced with
    // function to receive the full scope function list.
    let prototype = null,
        fnScopes = undefined;
    if (arguments.length > 1) {
        fnScopes = arguments[arguments.length - 1];
        prototype = arguments[1];
        if (arguments.length == 2) {
            if (typeof fnScopes === 'function') {
                prototype = null;
            } else {
                fnScopes = undefined
            }
        }
    }

    let scopeFns = {}; // Scope access interface object.
    let o = fnObj( // Call back for the object to parse
        _getPublicFn(scopeFns),
        _getPrivateFn(scopeFns),
        _getProtectedFn(scopeFns)
    );
    if (!o || typeof o !== 'object') {
        throw new Error("Can only parse type object");
    }

    // If a separate prototype has been provided then we assume the object to parse 
    // is a template. Otherwise we take the prototype that the object has assigned.
    if (!prototype || typeof prototype !== 'object') {
        prototype = Object.getPrototypeOf(o);
    }

    // Allocate our normalised object and associated scopes object.
    let oRoot = fnObjectCreate(prototype); // Root object is the public object and interface.
    scopeFns.object = oRoot; // Save here for access convenience
    _setSymbol(oRoot, symRoot, oRoot); // All scope objects link back to the public root
    _assignIDs(oRoot); // Unique ID and supported inherited IDs.

    let oScopes = fnObjectCreate(null); // Create our matching scopes object.
    _setSymbol(oScopes, symRoot, oRoot);
    oScopes.protectedScopes = [];
    scopesMap.set(oRoot, oScopes);

    // Iterate through the object specification and transform extended declarative property names.
    Object.keys(o).forEach(name => {
        let actName = name,
            decl = name;
        let i = name.indexOf(sConnector);
        if (i >= 0) {
            actName = name.substring(i + sConnector.length);
            decl = name.substring(0, i + sConnector.length);
        }
        let transformer = transforms.get(decl);
        if (transformer) {
            transformer(scopeFns, oScopes, o, name, actName, transformsScope.get(decl));
            return;
        }
        _publicTransform(scopeFns, oScopes, o, name, name, sPublic);
    });

    // if we have a prototype then we need to check all protected type scopes that exist 
    // for the prototype and creating mappings for scopes that were not inherited in this
    // normalisation. For example out prototype may have a standard protected scope but we may
    // not. In this case all protected scopes of the prototype are also our protected scopes.
    _fixHierachicalScopes(oRoot, oScopes, scopeFns);

    // Set default functions for scopes that have not been declared
    _setDefaultScopeFn(scopeFns, sPublic);
    _setDefaultScopeFn(scopeFns, sPrivate);
    _setDefaultScopeFn(scopeFns, sProtected);

    if (Object.isFrozen(o)) {
        Object.freeze(oRoot);
    } else if (Object.isSealed(o)) {
        Object.seal(oRoot);
    }

    // Give the caller the complete list of scope functions if they want it
    delete scopeFns.object;
    if (fnScopes) {
        fnScopes(scopeFns);
    }

    return (oRoot);
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
    Object.defineProperty(scopeFns.object, name, desc);
    if (!scopeFns.public) {
        scopeFns.public = _publicThis(scopeFns.object[symID]);
    }
}

function _publicThis(id) {
    return (that => {
        let root = that[symRoot];
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
    Object.defineProperty(_getPrivateScope(scopeFns.object, oScopes, sScope), name, desc);
    if (_isPropertyWritable(desc)) {
        oScopes[sflConst + sScope] = false;
    }
    if (!scopeFns[sScope]) {
        scopeFns[sScope] = _privateThis(oScopes, scopeFns.object[symID], sScope);
    }
}

function _privateThis(oScopes, id, sScope) {
    return (that => {
        let root = that[symRoot];
        _validateID(id, root, `Invalid ${sScope} scope function`);
        // Each object requires an instance of private data for inherited objects
        let oRootScopes = scopesMap.get(root);
        let sData = sScope + 'Data';
        if (!oRootScopes[sData]) {
            oRootScopes[sData] = fnObjectCreate(null);
        }
        let oPrivateData = oRootScopes[sData][id];
        if (!oPrivateData) {
            if (oScopes[sflConst + sScope]) {
                oRootScopes[sData][id] = oPrivateData = oScopes[sScope]; // Can just use constant private object
            } else {
                oRootScopes[sData][id] = oPrivateData = fnObjectCreate(oScopes[sScope]); // Otherwise inherit from it
            }
        }
        return (oPrivateData);
    });
}

function _getPrivateScope(oRoot, oScopes, sScope) {
    return (_getScope(sScope, oRoot, oScopes,
        (oScope) => {
            oScopes[sflConst + sScope] = true;
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
    Object.defineProperty(_getProtectedScope(scopeFns.object, oScopes, sScope), name, desc);
    if (!scopeFns[sScope]) {
        scopeFns[sScope] = _protectedThis(oScopes, scopeFns.object[symID], sScope);
        oScopes.protectedScopes[oScopes.protectedScopes.length] = sScope;
    }
}

function _protectedThis(oScopes, id, sScope) {
    return (that => {
        let root = that[symRoot];
        _validateID(id, root, `Invalid ${sScope} scope function`);
        return (scopesMap.get(root)[sScope]);
    });
}

function _getProtectedScope(oRoot, oScopes, sScope) {
    return (_getScope(sScope, oRoot, oScopes, undefined, () => {
        return (_getScopePrototype(sScope, oRoot));
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


function _fixHierachicalScopes(oRoot, oScopes, scopeFns) {
    _getPrototypeProtectedScopes(oRoot).forEach(sScope => {
        let prot = _getScopePrototype(sScope, oRoot);
        if (prot) {
            if (oScopes[sScope]) {
                return;
            }
            oScopes[sScope] = fnObjectCreate(prot);
            oScopes.protectedScopes[oScopes.protectedScopes.length] = sScope;
            // Only add the scope function to the scope function list for the default protected
            // scope. Named scopes have a level of secrecy and can only be referenced and shared
            // by those in the know.
            if (sScope == sProtected)
                scopeFns[sScope] = _protectedThis(oScopes, scopeFns.object[symID], sScope);
        }
    });
}

function _getPrototypeProtectedScopes(oRoot) {
    for (let prot = Object.getPrototypeOf(oRoot); prot; prot = Object.getPrototypeOf(prot)) {
        if (!prot[symID])
            continue;
        let oScopes = scopesMap.get(prot);
        return (oScopes.protectedScopes);
    }
    return ([]);
}

function _getScopePrototype(sScope, oRoot) {
    for (let prot = Object.getPrototypeOf(oRoot); prot; prot = Object.getPrototypeOf(prot)) {
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
    if (desc.hasOwnProperty('writable')) {
        desc.writable = false;
    }
    return (desc);
}

function _isPropertyWritable(desc) {
    return (desc.writable || desc.set);
}

function _getScope(sScope, oRoot, oScopes, fnInit, fnPrototype) {
    let oScope = oScopes[sScope];
    if (!oScope) {
        let prototype = fnPrototype ? fnPrototype() : null;
        oScopes[sScope] = oScope = fnObjectCreate(prototype);
        if (fnInit) {
            fnInit(oScope);
        }
        _setSymbol(oScope, symRoot, oRoot);
    }
    return (oScope);
}

function _nextID() {
    return ('O' + nextID++);
}

module.exports = {
    parse,
    createInstance,
    objectCreate,
    setObjectCreateHook,
    removeObjectCreateHook
}

Object.freeze(module.exports);