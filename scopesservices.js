/**
 * scopesservices : @file
 * 
 * Provides a set of support services for an Object's scope structure.
 */

'use strict'

module.exports = {
    assign,
    freeze,
    seal,
    getOwnPropertyDescriptor,
    delete: _delete,
    log,
    setPropertyInterface
};
Object.freeze(module.exports);

let property = undefined;
let symPublic, symScopeName, symScopeType, symID, sPublic, sPrivate;

function setPropertyInterface(intface) {
    if (!property) {
        property = intface;
        symPublic = property.symPublic;
        symScopeName = property.symScopeName;
        symScopeType = property.symScopeType;
        symID = property.symID;
        sPublic = property.sPublic;
        sPrivate = property.sPrivate;
    }
}

function assign(oTarget, ...sources) {
    sources.forEach((oSrc) => {
        _assign(oTarget, oSrc);
    });
    return (oTarget);
}

function _assign(oTarget, oSrc) {
    Object.keys(oSrc).forEach(prop => {
        property.defineProperty(oTarget, prop, () => {
            return (Object.getOwnPropertyDescriptor(oSrc, prop));
        });
    });
    if (!property.isScoped(oSrc))
        return;
    let oScopes = property.getScopesObject(oSrc);
    Object.keys(oScopes).forEach(sScope => {
        // Only assign protected scopes. Private scopes are only associated
        // with the owning object but remain referencable by assigned public
        // and protected methods. When a remote private scope is accessed
        // a private instance is created locally.
        let oScope = oScopes[sScope];
        if (oScope[symScopeType] == sPrivate) return;
        Object.keys(oScope).forEach(prop => {
            property.defineProperty(oTarget, prop, () => {
                return (getOwnPropertyDescriptor(oScope, prop));
            });
        })
    });
    if (property.isScoped(oTarget)) {
        property.assignScopeID(oTarget, oScopes[symID]);
    }
}

function _delete(oScope, prop) {
    if (!(oScope = _checkPrivateScope(oScope))) return (undefined);
    delete oScope[prop];
    return (undefined);
}

function getOwnPropertyDescriptor(oScope, prop) {
    if (!oScope[symPublic]) {
        let desc = Object.getOwnPropertyDescriptor(oScope, prop);
        desc.scope = sPublic;
        return (desc);
    }
    if (!(oScope = _checkPrivateScope(oScope))) return (undefined);

    let desc = Object.getOwnPropertyDescriptor(oScope, prop);
    if (!desc) return (undefined);
    if (oScope[symScopeType]) {
        if (oScope[symScopeType] == oScope[symScopeName]) {
            desc.scope = oScope[symScopeType];
        } else {
            desc.scope = {
                [oScope[symScopeType]]: oScope[symScopeName]
            };
        }
    }
    return (desc);
}

function _checkPrivateScope(oScope) {
    if (oScope[symScopeType] == sPrivate) {
        // Private scopes require an instance object per 'this' context. We need to
        // go up to the actual scope prototype but also ensure that it belongs to the
        // same public object. If there is no prototype then we are at the scope object.
        let prot = Object.getPrototypeOf(oScope);
        if (prot) {
            if (prot[symPublic] !== oScope[symPublic]) {
                return (undefined);
            }
            oScope = prot;
        }
    }
    return (oScope);
}

function freeze(oPublic) {
    return (_applyScopeOperation(oPublic, (o) => {
        return (Object.freeze(o));
    }));
}

function seal(oPublic) {
    return (_applyScopeOperation(oPublic, (o) => {
        return (Object.seal(o));
    }));
}

function _applyScopeOperation(oPublic, fnOp) {
    if (!property.isScoped(oPublic)) return (fnOp(oPublic));
    let oScopes = property.getScopesObject(oPublic);
    Object.keys(oScopes).forEach(sScope => {
        fnOp(oScopes[sScope]);
    });
    if (property.hasPrivateInstances(oScopes)) {
        let instances = property.getPrivateInstancesObject(oScopes);
        Object.keys(instances).forEach(sScope => {
            let instance = instances[sScope];
            Object.keys(instance).forEach(id => {
                fnOp(instance[id]);
            });
        });
    }
    return (fnOp(oPublic));
}

function log(objs, fnLogger) {
    // Objects can be a single object or an array.
    if (!fnLogger) fnLogger = (...more) => {
        console.log(...more);
    };
    if (!Array.isArray(objs)) {
        _log(objs, fnLogger);
        return;
    }
    objs.forEach(o => {
        _log(o, fnLogger)
    });
}

function _log(oPublic, fnLogger) {
    // Make sure we have a real object to process otherwise just hand off to
    // the logger.
    if (typeof oPublic !== 'object' || Array.isArray(oPublic) || !property.isScoped(oPublic)) {
        fnLogger(oPublic);
        return;
    }

    let oScopes = property.getScopesObject(oPublic);
    fnLogger(`[-- (${oScopes[symID]})\npublic:`);
    fnLogger(oPublic);
    Object.keys(oScopes).forEach(sScope => {
        fnLogger(sScope + ':');
        let oScope = oScopes[sScope];
        fnLogger(oScope);
    });
    if (property.hasPrivateInstances(oScopes)) {
        let instances = property.getPrivateInstancesObject(oScopes);
        Object.keys(instances).forEach(sScope => {
            let instance = instances[sScope];
            Object.keys(instance).forEach(id => {
                if (id == oScopes[symID]) return;
                let o = instance[id];
                fnLogger(sScope + '.' + id + ':');
                fnLogger(o);
            });
        });
    }
    fnLogger('--]');
}