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
    finalise,
    finalize: finalise,
    isFinal,
    isScoped,
    lock,
    isLocked,
    getScopeFns,
    pushDefaultPropertyAttributes,
    popDefaultPropertyAttributes,
    resetDefaultPropertyAttributes
};
Object.freeze(module.exports);

const sPublic = 'public';
const sPrivate = 'private';
const sProtected = 'protected';
const sSuper = 'super';
const sSelf = 'self';

const symPublic = Symbol.for('scopePublic');
const symID = Symbol.for('scopeID');
const symIDs = Symbol.for('scopeIDs');
const symFns = Symbol.for('scopeFns');
const symInstances = Symbol.for('scopesInstances');
const symScopeType = Symbol.for('scopeType');
const symScopeName = Symbol.for('scopeName');
const symFinal = Symbol.for('scopeFinal');
const symLocked = Symbol.for('scopeLocked');
const symKey = Symbol.for('scopeKey');

const scopesMap = new WeakMap(); // Map that contains the scopes extension object for a parsed object
const scopeKeys = new WeakMap(); // Map of keys for locked scoped objects.

const scopeTypeFns = {
    private: _privateThis,
    protected: _protectedThis
}
const scopeGetFns = {
    private: _getPrivateScope,
    protected: _getProtectedScope
}

let defPropAttrs = {
    enumerable: true,
    writable: false,
    configurable: false
};
const defAttrsStack = []; // Stack for managing default property attributes
defAttrsStack.push(defPropAttrs);

let lastScopeID = 0;

const _setSymbol = _setConstProp;
const _storeScopeFn = _setConstProp;


require('./scopesparser').setPropertyInterface({
    defineProperty: _defineParsedProperty,
    prepareParserOperation,
});

require('./scopesservices').setPropertyInterface({
    isScoped,
    defineProperty,
    getScopesObject: _getScopesObject,
    hasPrivateInstances: _hasPrivateInstances,
    getPrivateInstancesObject: _getPrivateInstancesObject,
    assignScopeID: _assignScopeID,
    resolvePublicObject: _resolvePublicObject,
    isFinal,
    sPublic,
    sPrivate,
    symPublic,
    symScopeName,
    symScopeType,
    symID,
    symInstances,
});


function pushDefaultPropertyAttributes(attrs) {
    let a = Object.assign({}, attrs);
    Object.keys(defAttrsStack[0]).forEach(name => {
        if (!a.hasOwnProperty(name)) a[name] = defAttrsStack[0][name];
    });
    defAttrsStack.push(defPropAttrs = a);
}

function popDefaultPropertyAttributes() {
    if (defAttrsStack.length == 1)
        return (null);
    let a = defAttrsStack.pop();
    defPropAttrs = defAttrsStack[defAttrsStack.length - 1];
    return (a);
}

function resetDefaultPropertyAttributes() {
    defPropAttrs = defAttrsStack[0];
    defAttrsStack.length = 1;
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
 *          4. If the descriptor is for a public non objext value then a value can be returned
 *             without the descriptor wrapper.
 */

function defineProperty(oPublic, prop, fnDescriptor) {
    let oScopes = _preparePropertyOperation(oPublic);
    let fns = oScopes[symFns];
    _defineProperty(oScopes, prop, fnDescriptor(fns.public, fns.private, fns.protected));
    return (oPublic);
}

function defineProperties(oPublic, fnDescriptors) {
    let oScopes = _preparePropertyOperation(oPublic);
    let fns = oScopes[symFns];
    let descs = fnDescriptors(fns.public, fns.private, fns.protected);
    Object.keys(descs).forEach(prop => {
        _defineProperty(oScopes, prop, descs[prop]);
    });
    return (oPublic);
}

function finalise(oScope) {
    if (typeof oScope !== 'object' || !oScope[symScopeName]) {
        throw new Error(`Object '${oScope}' cannot be finalised`);
    }
    let sProtScope = oScope[symScopeName];
    if (sProtScope == sProtected) {
        throw new Error('The default protected scope cannot be finalised');
    }
    let oScopes = _getScopesObject(oScope[symPublic]);
    if (!(oScopes)[symFns][sProtScope]) {
        throw new Error(`Protected scope '${sProtScope}' cannot be accessed`);
    }
    if (oScope[symScopeType] != sProtected) {
        throw new Error(`'${sProtScope}' is not a protected scope`);
    }
    if (!oScope[symFinal]) _setSymbol(oScope, symFinal, true);
    return (oScope);
}

function isFinal(oPublic, sProtScope) {
    if (typeof oPublic !== 'object') return (false);
    oPublic = oPublic[symPublic] || oPublic;
    if (!isScoped(oPublic)) return (false);
    let oScope = _getScopesObject(oPublic)[sProtScope];
    return (oScope && oScope[symFinal] ? true : false);
}

function isScoped(oPublic) {
    if (typeof oPublic !== 'object') return (false);
    return (scopesMap.get(oPublic[symPublic] || oPublic) ? true : false);
}

function lock(oPublic) {
    if (typeof oPublic !== 'object' || oPublic[symKey] || oPublic[symPublic]) {
        throw new Error('Invalid scope lock request');
    }
    let oScopes = _getScopesObject(oPublic);
    if (oScopes[symLocked]) {
        throw new Error('Object is already locked');
    }
    let key = {};
    _setSymbol(key, symKey, true);
    _setSymbol(oScopes, symLocked, true);
    scopeKeys.set(key, oPublic);
    return (Object.freeze(key));
}

function isLocked(oPublic) {
    if (typeof oPublic !== 'object') return (false);
    if (!isScoped((oPublic = oPublic[symPublic] || oPublic))) return (false);
    return (getScopesObject(oPublic)[symLocked] ? true : false);
}

function getScopeFns(o) {
    if (typeof o !== 'function' || !(o = o[symPublic])) {
        o = _resolvePublicObject(o);
    }
    let oScopes = _getScopesObject(o);
    return (Object.freeze(Object.create(oScopes[symFns])));
}

function _defineParsedProperty(oPublic, prop, desc) {
    _defineProperty(_getScopesObject(oPublic), prop, desc);
    return (oPublic);
}

function prepareParserOperation(oPublic, fnDescriptor) {
    let oScopes = _preparePropertyOperation(oPublic);
    let fns = oScopes[symFns];
    return (fnDescriptor(fns.public, fns.private, fns.protected));
}

function _preparePropertyOperation(oPublic) {
    let oScopes = _getScopesObject((oPublic = _resolvePublicObject(oPublic)));
    if (!oScopes[symID]) {
        _allocateScopeID(oPublic, oScopes);
    }
    if (!oScopes[symFns]) {
        let fns = oScopes[symFns] = {};
        _storeScopeFn(fns, sPublic, _publicThis(oScopes));
        _storeScopeFn(fns, sPrivate, _privateThis(oScopes[symID], sPrivate, oScopes));
        _storeScopeFn(fns, sProtected, _protectedThis(oScopes[symID], sProtected));
        _storeScopeFn(fns, sSuper, _superThis(oScopes));
        _storeScopeFn(fns, sSelf, _selfThis(oScopes));
    }
    return (oScopes);
};

function _defineProperty(oScopes, prop, desc) {
    desc = _parseDescriptor(desc);
    if (desc[symScopeType] == sPublic) return (Object.defineProperty(oScopes[symPublic], prop, desc));

    let oScope = scopeGetFns[desc[symScopeType]](oScopes, desc[symScopeName]);
    if (!oScope[symID]) {
        _setSymbol(oScope, symID, oScopes[symID]);
    }
    // If we don't have a scope function recorded then we do it now. Note however that if we have a
    // finalised protected scope then we don't regsiter a scope function.
    if (!oScopes[symFns][desc[symScopeName]] && !oScope[symFinal]) {
        _storeScopeFn(oScopes[symFns], desc[symScopeName], scopeTypeFns[desc[symScopeType]](oScopes[symID], desc[symScopeName], oScopes));
    }
    // Don't allow properties to be added to an instance of a finalised protected scope. This object owner
    // cannot access this scope through their allocated scope functions so we fail any property operations.
    if (oScope[symFinal] && !oScope.hasOwnProperty(symFinal)) {
        throw new Error(`Protected scope '${oScope[symScopeName]}' has been finalised`);
    }
    return (Object.defineProperty(oScope, prop, desc));
}

function _resolvePublicObject(o) {
    // Accept an object or if locked a key.
    if (typeof o !== 'object') {
        throw new Error('Invalid scope request');
    }
    if (o[symKey]) {
        if (!(o = scopeKeys.get(o))) {
            throw new Error('Invalid scope key');
        }
        return (o);
    }
    let oScopes = scopesMap.get((o = o[symPublic] || o));
    if (oScopes && oScopes[symLocked]) {
        throw new Error('Object is locked');
    }
    return (o);
}

function _getPrivateScope(oScopes, sScope) {
    let oScope = oScopes[sScope];
    if (oScope) {
        if (oScope[symScopeType] != sPrivate) {
            throw new Error(`Scope '${sScope}' is not a private scope`);
        }
        return (oScope);
    }
    oScopes[sScope] = oScope = {};
    _setSymbol(oScope, symPublic, oScopes[symPublic]);
    _setSymbol(oScope, symScopeName, sScope);
    _setSymbol(oScope, symScopeType, sPrivate);
    _applyFreezeSeal(oScope);
    return (oScope);
}

function _getProtectedScope(oScopes, sScope) {
    let oScope = oScopes[sScope];
    if (oScope) {
        if (oScope[symScopeType] != sProtected) {
            throw new Error(`Scope '${sScope}' is not a protected scope`);
        }
        return (oScope);
    }
    // Protected scopes are hierachical so need to see if we have a prototype
    oScopes[sScope] = oScope = Object.create(_getProtectedPrototype(oScopes[symPublic], sScope));
    _setSymbol(oScope, symPublic, oScopes[symPublic]);
    _setSymbol(oScope, symScopeName, sScope);
    _setSymbol(oScope, symScopeType, sProtected);
    _applyFreezeSeal(oScope);
    return (oScope);
}

function _getProtectedPrototype(oPublic, sScope) {
    let prot = Object.getPrototypeOf(oPublic);
    if (prot == null || prot === Object.prototype) return (Object.prototype);
    let oScopes = _getScopesObject(prot);
    let oScope = oScopes[sScope];
    if (!oScope) oScope = _getProtectedScope(oScopes, sScope);
    if (oScope[symFinal]) {
        // This protected scope has been finalised so all children must inherit from the
        // finalised scope object. This could be the current scope or the prototype of
        // the current scope.
        if (!oScope.hasOwnProperty(symFinal)) {
            oScope = Object.getPrototypeOf(oScope);
            if (!oScope.hasOwnProperty(symFinal)) {
                throw new Error('Finalised prototype structure is incorrect');
            }
        }
    }
    return (oScope);
}

function _allocateScopeID(oPublic, oScopes) {
    if (oScopes[symID]) {
        throw new Error('Scope ID has already been allocated');
    }
    oScopes[symID] = 'sid' + ++lastScopeID;
    _assignScopeID(oPublic, oScopes[symID], oScopes);
}

function _assignScopeID(oPublic, sid, oScopes = undefined) {
    if (!oScopes) oScopes = _getScopesObject(oPublic);
    if (!oScopes[symIDs][sid]) oScopes[symIDs][sid] = true;
}

function _getScopesObject(oPublic) {
    let oScopes = scopesMap.get(oPublic);
    if (oScopes) return (oScopes);
    return (_allocateScopesObject(oPublic));
}

function _allocateScopesObject(oPublic) {
    let oScopes = {};
    _setSymbol(oScopes, symPublic, oPublic);
    _setSymbol(oScopes, symIDs, Object.create(_getIDsPrototype(oPublic)));
    scopesMap.set(oPublic, oScopes);
    return (oScopes);
}

function _getIDsPrototype(oPublic) {
    let pubProt = Object.getPrototypeOf(oPublic);
    if (pubProt == null || pubProt === Object.prototype) return (Object.prototype);
    let oScopes = _getScopesObject(pubProt);
    if (!oScopes[symIDs]) {
        oScopes[symIDs] = Object.create(_getIDsPrototype(pubProt));
    }
    return (oScopes[symIDs]);
}

function _getPrivateInstancesObject(oScopes) {
    let oSymInstances = oScopes[symInstances];
    if (oSymInstances) return (oSymInstances);
    return (oScopes[symInstances] = {});
}

function _hasPrivateInstances(oScopes) {
    return (oScopes[symInstances] ? true : false);
}

function _publicThis(oScopes) {
    let fn = that => {
        return (that[symPublic] || that);
    };
    _setSymbol(fn, symPublic, oScopes[symPublic]);
    return (fn);
}

function _privateThis(id, sScope, oScopes) {
    return (that => {
        // Optimise access to the same private scope.
        if (!that || that[symID] == id && that[symScopeName] == sScope) return (that);

        let oPublic = that[symPublic] || that;
        let puboScopes = _getScopesObject(oPublic);
        _validateID(id, puboScopes, `Invalid ${sScope} scope function`);
        // Each object requires an instance of private data for inherited objects
        let oSymInstances = _getPrivateInstancesObject(puboScopes);
        let scopeInstance = oSymInstances[sScope];
        if (!scopeInstance) {
            oSymInstances[sScope] = scopeInstance = {};
        }
        let oPrivInstance = scopeInstance[id];
        if (!oPrivInstance) {
            // Need to inherit from the defined private scope object
            // Each object in a hierachy requires a separate instance for changes.
            // Note that we use the scopes object that was in focus when the scope
            // function was created.
            // Note that where the public object associated with 'that' actually
            // owns the private scope then we set the actual scope object to the
            // instance.
            if (!oScopes[sScope]) {
                throw new Error(`Scope '${sScope}' does not exist`);
            }
            if (puboScopes === oScopes) {
                oPrivInstance = oScopes[sScope];
            } else {
                oPrivInstance = Object.create(oScopes[sScope]);
                _setSymbol(oPrivInstance, symPublic, oPublic);
                _applyFreezeSeal(oPrivInstance);
            }
            scopeInstance[id] = oPrivInstance;
        }
        return (oPrivInstance);
    });
}

function _protectedThis(id, sScope) {
    return (that => {
        // Optimise access to the same protected scope.
        if (!that || that[symScopeName] == sScope) return (that);

        let oPublic = that[symPublic] || that;
        let puboScopes = _getScopesObject(oPublic);
        _validateID(id, puboScopes, `Invalid ${sScope} scope function`);
        let oScope = _getProtectedScope(puboScopes, sScope);
        return (oScope);
    });
}

function _superThis(oScopes) {
    return (__superThis(oScopes, self => {
        return (Object.getPrototypeOf(self));
    }));
}

function _selfThis(oScopes) {
    return (__superThis(oScopes, self => {
        return (self);
    }));
}

function __superThis(oScopes, fnStartPoint) {
    return ((that, sMeth, fnUndefined) => {
        let self = oScopes[symPublic];
        if (that[symScopeType]) {
            if (that[symScopeType] == sPrivate) return (_superUndefined(that, sMeth, fnUndefined));
            self = _getProtectedScope(oScopes, that[symScopeName])
        }
        if (!self.isPrototypeOf(that) && that !== self) return (_superUndefined(that, sMeth, fnUndefined));
        let prot = fnStartPoint(self);
        if (prot == null || !(sMeth in prot)) return (_superUndefined(that, sMeth, fnUndefined));
        let fn = _getSuperMethod(prot, sMeth);
        if (!fn) return (_superUndefined(that, sMeth, fnUndefined));
        return (_getSuperFn(fn, that, sMeth, fnUndefined));
    });
}

function _getSuperMethod(prot, sMeth) {
    for (; prot != null && prot !== Object.prototype; prot = Object.getPrototypeOf(prot)) {
        if (!prot.hasOwnProperty(sMeth)) continue;
        let fn = Object.getOwnPropertyDescriptor(prot, sMeth).value;
        if (!fn || typeof fn !== 'function') return (undefined);
        return (fn);
    }
    return (undefined);
}

function _getSuperFn(fn, that, sMeth, fnUndefined) {
    return ((...args) => {
        let result = fn.apply(that, args);
        if (result === undefined && fnUndefined) return (fnUndefined(that, sMeth, args));
        return (result);
    });
}

function _superUndefined(that, sMeth, fnUndefined) {
    return ((...args) => {
        if (fnUndefined) return (fnUndefined(that, sMeth, args));
        return (undefined);
    });
}

function _parseDescriptor(srcDesc) {

    let desc = {
        [symScopeType]: sPublic,
        [symScopeName]: sPublic
    };
    Object.assign(desc, defPropAttrs);

    // May have just been passed a public value that is not an object so need to wrap this.
    if (typeof srcDesc !== 'object' || Array.isArray(srcDesc)) {
        desc.value = srcDesc;
        return (desc);
    }
    // Copy descriptor details but will need to parse the scope property
    Object.keys(srcDesc).forEach(name => {
        switch (name) {
            case 'scope':
                switch (typeof srcDesc.scope) {
                    case 'string':
                        if ((desc[symScopeType] = srcDesc.scope) != sPublic && srcDesc.scope != sPrivate && srcDesc.scope != sProtected) {
                            throw new Error(`'${srcScope.scope}' is an invalid scope property value`);
                        }
                        desc[symScopeName] = srcDesc.scope;
                        break;
                    case 'object':
                        let o = srcDesc.scope;
                        if (o.private && o.protected) {
                            throw new Error("Invalid scope property object value. Only private or protected element permitted");
                        }
                        if (o.private) {
                            desc[symScopeType] = sPrivate;
                            desc[symScopeName] = o.private;
                        } else if (o.protected) {
                            desc[symScopeType] = sProtected;
                            desc[symScopeName] = o.protected;
                        } else {
                            throw new Error("Invalid scope property object value. Only private or protected element permitted");
                        }
                        if (typeof desc[symScopeName] !== 'string') {
                            throw new Error("String expected for scope name");
                        }
                        break;
                    default:
                        throw new Error('Invalid scope property in descriptor');
                        break;
                }
                break;
            case 'get':
            case 'set':
                delete desc.writable;
            default:
                desc[name] = srcDesc[name];
                break;
        }
    });
    return (desc);
}

function _applyFreezeSeal(oScope) {
    let oPublic = oScope[symPublic];
    if (Object.isFrozen(oPublic)) Object.freeze(oScope);
    else if (Object.isSealed(oPublic)) Object.seal(oScope);
}

function _setConstProp(o, prop, val) {
    Object.defineProperty(o, prop, {
        value: val,
        writable: false,
        configurable: false
    });
    return (o);
}

function _validateID(id, oScopes, errmsg) {
    let ids = oScopes[symIDs];
    if (!ids[id]) {
        throw new Error(errmsg);
    }
}