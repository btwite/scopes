/**
 * scopesproperty : @file
 * 
 * Provides scopes property service for defining a property scope descriptor to
 * a property.
 * 
 */

'use strict'

module.exports = {
    defineProperty,
    defineProperties,
};
Object.freeze(module.exports);

require('./scopesparser').setPropertyInterface({
    defineProperty
});

const sPublic = 'public';
const sPrivate = 'private';
const sProtected = 'protected';

const symPublic = Symbol.for('scopePublic');
const symID = Symbol.for('scopeID');
const symIDs = Symbol.for('scopeIDs');
const symFns = Symbol.for('scopeFns');
const symScopeFn = Symbol.for('scopeFn');
const symInstances = Symbol.for('scopesInstances');
const symProtScopes = Symbol.for('scopesProtected');
const symScopeType = Symbol.for('scopeType');
const symScopeName = Symbol.for('scopeName');

const scopesMap = new WeakMap(); // Map that contains the scopes extension object for a parsed object

// The public scope function is generic so only need one instance.
const fnPublic = that => {
    return (that[symPublic] || that);
}

const scopeTypeFns = {
    private: _privateThis,
    protected: _protectedThis
}
const scopeGetFns = {
    private: _getPrivateScope,
    protected: _getProtectedScope
}

let lastScopeID = 0;

/**
 * Extension of Object.defineProperty that will create a property for the supplied object
 * in the nominated scope. This is the core function for implementing scope based properties
 * and is also used by the declarative scopes parser.
 * 
 * @param {object} oPublic
 *      The public object that the scoped property is associated with. Please note that you
 *      cannot create a scoped property within a scope object.
 * 
 * @param {string} prop
 *      The name of the property to be defined or modified. The name may also be a Symbol
 * 
 * @param {onbject} fnDescriptor
 *      Function that returns a property descriptor as defined by Object.defineProperty with 
 *      the addition of the 'scope' element :
 *          scope : ('public' | 'private' | 'protected') |
 *                  <{> (private | protected) : '<name of scope>' <}>
 * 
 *      Notes :
 *          1. If 'scope' is not present then public scope is assumed.
 *          2. Other than 'scope' all other attributes are as defined by
 *             Object.defineProperty.
 *          3. Descriptor function is passed the scopes context functions.
 *             fnPublic, fnPrivate, fnProtected and fnScope, where fnScope takes the name of 
 *             a user defined private or protected scope and returns a function for that
 *             scope. The returned scope function can then be shared with other trusted
 *             objects.
 *             Example: let myScope = fnScope('myScope'); .... myScope(this).prop
 */

function defineProperty(oPublic, prop, fnDescriptor) {
    if (typeof oPublic !== 'object' || oPublic.symID) {
        throw new Error('Invalid object for defining a scope property');
    }

    let oScopes = _getScopesObject(oPublic);
    if (!oScopes.symID) {
        _allocateScopeID(oPublic, oScopes);
    }
    let fns = oScopes.symFns;
    if (!fns) {
        oScopes.symFns = fns = {
            public: _publicThis(),
            private: _privateThis(oScopes.symID, sPrivate, oScopes),
            protected: _protectedThis(oScopes.symID, sProtected),
            symScopeFn: _scopeThis(undefined, undefined, oScopes)
        }
    };

    let desc = _parseDescriptor(fnDescriptor(fns.public, fns.private, fns.protected, fns.symScopeFn));
    if (!fns[desc.symScopeName]) {
        fns[desc.symScopeName] = scopeTypeFns[desc.symScopeType](oScopes.symID, desc.symScopeName, oScopes);
    }

    let oScope = scopeGetFns(oScopes, desc.symScopeName);
    if (!oScope.symID) {
        _setSymbol(oScope, symID, oScopes.symID);
        _setSymbol(oScope, symScopeName, desc.symScopeName);
    }


    desc.sid = sid;
    _getScopeFunction
    return (getScopeConstructor(desc));
}

function _getPrivateScope(oScopes, sScope) {
    let oScope = oScopes[sScope];
    if (oScope) return (oScope);
    oScopes[sScope] = oScope = Object.create(null);
    _setSymbol(oScope, symPublic, oScopes.symPublic);
    return (oScope);
}

function _getProtectedScope(oScopes, sScope) {
    let oScope = oScopes[sScope];
    if (oScope) return (oScope);
    // Protected scopes are hierachical so need to see if we have a prototype
    let prot = Object.getPrototypeOf(oScopes.symPublic);
    if (prot == null) return (null);
    prot = _getProtectedScope(_getScopesObject(prot), sScope);
    oScopes[sScope] = oScope = Object.create(prot);
    _setSymbol(oScope, symPublic, oScopes.symPublic);
    return (oScope);
}

function _allocateScopeID(oPublic, oScopes) {
    if (oScopes.symID) {
        throw new Error('Scope ID has already been allocated');
    }
    oScopes.symID = 'sid' + ++lastScopeID;
    _assignScopeID(oPublic, oScopes.symID, oScopes);
}

function _assignScopeID(oPublic, sid, oScopes) {
    if (!oScopes) oScopes = _getScopesObject(oPublic);
    if (!oScopes.symIDs) {
        oScopes.symIDs = Object.create(_getIDsPrototype(oPublic));
    }
    if (!oScopes.symIDs[sid]) oScopes.symIDs[sid] = true;
}

function _getIDsPrototype(oPublic) {
    let pubProt = Object.getPrototypeOf(oPublic);
    if (pubProt == null) return (null);
    let oScopes = _getScopesObject(pubProt);
    if (!oScopes.symIDs) {
        oScopes.symIDs = Object.create(_getIDsPrototype(pubProt));
        return (oScopes.symIDs);
    }
}

function _getScopesObject(oPublic) {
    let oScopes = scopesMap.get(oPublic);
    if (oPublic) return (oScopes);
    return (_allocateScopesObject(oPublic));
}

function _allocateScopesObject(oPublic) {
    let oScopes = Object.create(null);
    _setSymbol(oScopes, symPublic, oPublic);
    scopesMap.set(oPublic, oScopes);
    return (oScopes);
}

function _getPrivateInstancesObject(oPublic) {
    let oScopes = _getScopesObject(oPublic);
    let oSymInstances = oScopes[symInstances];
    if (oSymInstances) return (oSymInstances);
    return (oScopes[symInstances] = Object.create(null));
}

function _publicThis() {
    return (fnPublic);
}

function _privateThis(id, sScope, oScopes) {
    return (that => {
        // Optimise access to the same private scope.
        if (that.symID == id && that.symScopeName == sScope) return (that);

        let oPublic = that[symPublic] || that;
        _validateID(id, oPublic, `Invalid ${sScope} scope function`);
        // Each object requires an instance of private data for inherited objects
        let oSymInstances = _getPrivateInstancesObject(oPublic);
        let scopeInstance = oSymInstances[sScope];
        if (!scopeInstance) {
            oSymInstances[sScope] = scopeInstance = Object.create(null);
        }
        let oPrivInstance = scopeInstance[id];
        if (!oPrivInstance) {
            // Need to inherit from the defined private scope object
            // Each object in a hierachy requires a separate instance for changes.
            // Note that we use the scopes object that was in focus when the scope
            // function was created.
            if (!oScopes[sScope]) {
                throw new Error(`Scope '${sScope}' does not exist`);
            }
            scopeInstance[id] = oPrivInstance = Object.create(oScopes[sScope]);
        }
        return (oPrivInstance);
    });
}

function _protectedThis(id, sScope) {
    return (that => {
        // Optimise access to the same protected scope.
        if (that.symScopeName == sScope) return (that);

        let oPublic = that[symPublic] || that;
        _validateID(id, oPublic, `Invalid ${sScope} scope function`);
        let oScope = _getScopesObject(oPublic)[sScope];
        if (!oScope) {
            throw new Error(`Scope '${sScope}' does not exist`);
        }
        return (oScope);
    });
}

function _scopeThis(oScopes) {
    return ((that, name) => {
        let fn = oScopes.symFns[name];
        if (!fn) {
            throw new Error(`Scope '${name}' does not exist`);
        }
        return (fn(that));
    });
}

function _parseDescriptor(srcDesc) {
    let desc = {
        symScopeType: sPublic,
        symScopeName: sPublic
    };
    // Copy descriptor details but will need to parse the scope property
    Object.keys(srcDesc).forEach(name => {
        if (name != 'scope') {
            Object.defineProperty(desc, name, Object.getOwnPropertyDescriptor(srcDesc, name));
            return;
        }
        if (typeof srcDesc.scope === 'string') {
            if ((desc.symScopeType = srcDesc.scope) != sPublic && srcDesc.scope != sPrivate && srcDesc.scope != sProtected) {
                throw new Error(`'${srcScope.scope}' is an invalid scope property value`);
            }
            desc.symScopeName = srcDesc.scope;
        } else if (typeof srcDesc.scope === 'object') {
            let o = srcDesc.scope;
            if (o.private && o.protected) {
                throw new Error("Invalid scope property object value. Only private or protected element permitted");
            }
            if (o.private) {
                desc.symScopeType = sPrivate;
                desc.symScopeName = o.private;
            } else if (o.protected) {
                desc.symScopeType = sProtected;
                desc.symScopeName = o.protected;
            } else {
                throw new Error("Invalid scope property object value. Only private or protected element permitted");
            }
            if (typeof desc.symScopeName !== 'string') {
                throw new Error("String expected for scope name");
            }
        } else {
            throw new Error('Invalid scope property in descriptor');
        }
    });
    return (desc);
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

function old_privateThis(oScopes, id, sScope) {
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

function old_protectedThis(oScopes, id, sScope) {
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