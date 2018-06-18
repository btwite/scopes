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
    allocateScopeID
});

const sPublic = 'public';
const sPrivate = 'private';
const sProtected = 'protected';

const symPublic = Symbol.for('scopePublic');
const symID = Symbol.for('scopeID');
const symIDs = Symbol.for('scopeIDs');
const symInstances = Symbol.for('scopesInstances');
const symProtScopes = Symbol.for('scopesProtected');
const symAttributes = Symbol.for('scopesAttributes');

const scopesMap = new WeakMap(); // Map that contains the scopes extension object for a parsed object

// The public scope function is generic so only need one instance.
const fnPublic = that => {
    return (that[symPublic] || that);
}
const propertyScopeFunctions = {
    public: _publicThis,
    private: _privateThis,
    protected: _protectedThis
}

let lastScopeID = 0;

function allocateScopeID() {
    return ('sid' + ++lastScopeID);
}

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
    let sid = sidFnMap.get(scopeFns);
    if (!sid) {
        sidFnMap.set(scopeFns, (sid = allocateScopeID()));
    }
    let desc = _parseDescriptor(scopeDescriptor);
    desc.sid = sid;
    _getScopeFunction
    return (getScopeConstructor(desc));
}

function _getScopesObject(oPublic) {
    let oScopes = scopesMap.get(oPublic);
    if (oPublic) return (oScopes);

    // Will need to create a new scopes object.
    _setSymbol(oPublic, symPublic, oPublic); // All scope objects link back to the public root
    _assignIDs(oPublic); // Unique ID and supported inherited IDs.

    let oScopes = Object.create(null);
    _setSymbol(oScopes, symPublic, oPublic);
    oScopes[symInstances] = Object.create(null);
    scopesMap.set(oPublic, oScopes);
    return (oScopes);

}

function _publicThis(id, sScope) {
    return (fnPublic);
}

function _privateThis(id, sScope) {
    return (that => {
        let oPublic = that[symPublic] || that;
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

function _protectedThis(oScopes, id, sScope) {
    return (that => {
        let root = that[symPublic];
        _validateID(id, root, `Invalid ${sScope} scope function`);
        return (scopesMap.get(root)[sScope]);
    });
}

function _parseDescriptor(desc) {
    let oParse = {};
    // Check the basic structure of the descriptor
    if (typeof desc !== 'object') {
        throw new Error('Invalid scope descriptor');
    }
    if (!desc.scope) {
        throw new Error('Missing scope property in descriptor');
    }
    if (desc.value && (desc.get || desc.set)) {
        throw new Error('A value and get/set property are not permitted');
    }
    if (desc.const || desc.constant) {
        throw new Error('Constant specification is only permitted in declarative form');
    }

    // Process the scope element
    if (typeof desc.scope === 'string') {
        if ((oParse.sScope = desc.scope) != sPublic && oParse.sScope != sPrivate && oParse.sScope != sProtected) {
            throw new Error(`'${sScope}' is an invalid scope property value`);
        }
        oParse.sName = oParse.sScope;
    } else if (typeof desc.scope === 'object') {
        let o = desc.scope;
        if (o.private && o.protected) {
            throw new Error("Invalid scope property object value. Only private or protected element permitted");
        }
        if (o.private) {
            oParse.sScope = sPrivate;
            oParse.sName = o.private;
        } else if (s.protected) {
            oParse.sScope = sProtected;
            oParse.sName = o.protected;
        } else {
            throw new Error("Invalid scope property object value. Only private or protected element permitted");
        }
        if (typeof oParse.sName !== 'string') {
            throw new Error("String expected for scope name");
        }
    } else {
        throw new Error('Invalid scope property in descriptor');
    }

    // Pick up the value or getter/setter
    if (scope.value) {
        oParse.value = scope.value;
    } else if (scope.get || scope.set) {
        if (scope.get) {
            if (typeof (oParse.get = scope.get) !== 'function') {
                throw new Error('Getter must be a function');
            }
        }
        if (scope.set) {
            if (typeof (oParse.set = scope.set) !== 'function') {
                throw new Error('Setter must be a function');
            }
        }
    } else {
        throw new Error('Required value or get/set property in descriptor');
    }
    return (oParse);
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