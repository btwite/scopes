/**
 * Main for testing features of the Influence Framework
 */

"use strict"

let scopes = require('./scopes');

//test();
testScopesDefineProperty();
testCrossObjectAccess();
testScopesGroupParse();
testScopesParse();

function test() {
    log(Object.getPrototypeOf(() => {
        10
    }));
    log(Object.getPrototypeOf(function () {
        10
    }));
}

function testScopesDefineProperty() {
    let o1 = scopes.defineProperties({}, (Public, Private, Protected, Scope) => {
        return ({
            method1: function () {
                log('method1');
            },
            method2: {
                scope: 'private',
                value: function () {
                    log('method2');
                    Scope('myPrivate', this).method4()
                },
            },
            method3: function () {
                log('-----------------------')
                log('method3');
                Private(this).method2();
                log('-----------------------')
            },
            method4: {
                scope: {
                    private: 'myPrivate'
                },
                value: function () {
                    log('method4');
                    Public(this).method1();
                    Protected(this).method5();
                },
            },
            method5: {
                scope: 'protected',
                value: function () {
                    log('method5', this);
                }
            }
        });
    });
    log(o1);
    o1.method1();
    trycode(() => {
        o1.method2();
    });
    o1.method3();

    let o2 = scopes.defineProperties(Object.create(o1), (Public, Private, Protected, Scope) => {
        return ({
            method7: function () {
                log('-----------------------')
                log('method7');
                Protected(this).method5();
                Protected(this).method6();
                log('-----------------------')
            },
            method6: {
                scope: 'protected',
                value: function () {
                    log('method6');
                }
            }
        });
    });

    o2.method7();
    let o3 = Object.create(o2);
    let o4 = Object.create(o3);
    o4.method7();
    scopes.defineProperty(o3, 'meth1', () => {
        return ({
            scope: 'protected',
            value: function () {
                log('meth1');
            }
        });
    });
    scopes.defineProperty(o4, 'meth2', (Public, Private, Protected) => {
        return (function () {
            log('meth2');
            Protected(this).meth1();
        });
    });
    o4.meth2();
}

function testCrossObjectAccess() {
    const Person = scopes.parse((Public, Private) => {
        return {
            private_scope: {
                name: "No Name"
            },
            setName(x) {
                Private(this).name = x;
            },
            sayHelloTo(other) {
                console.log(`${Private(this).name} says hello to ${Private(other).name}`);
            },
        };
    });

    const tim = Object.create(Person);
    tim.setName("Tim");
    const john = Object.create(Person);
    john.setName("John");
    john.sayHelloTo(tim);
}

function testScopesGroupParse() {
    log('\n----- testScopesGroupParse -----')
    let scfns;
    let ot1 = {};
    scopes.parse(ot1, (Public, ...more) => {
        scfns = scopes.packageScopesFnArgs([Public, ...more]);
        return {
            method1: function () {
                log(`method1`);
            },
            private_scope: {
                method2: function () {
                    log(`method2`);
                },
                method3: function () {
                    log(`method3`);
                    Public(this).method1();
                },
            },
            protected_scope: {
                method4: function () {
                    log(`method4`);
                },
                method5: function () {
                    log(`method5`);
                    Public(this).method1();
                },
                const__value: 3000,
            },
            private_scope__myPrivate: {
                method6: function () {
                    log(`method6`);
                },
                method7: function () {
                    log(`method7`);
                    Public(this).method1();
                },
            },
            protected_scope__myProtected: {
                method8: function () {
                    log(`method8`);
                },
                method9: function () {
                    log(`method9`);
                    Public(this).method1();
                },
            },
        }
    });

    ot1.method1();
    trycode(() => {
        ot1.method2()
    });
    scfns.public(ot1).method1();
    scfns.private(ot1).method2();
    scfns.private(ot1).method3();
    trycode(() => {
        scfns.private(ot1).method4();
    });
    log(scfns.protected(ot1).value);
    scfns.protected(ot1).method4();
    scfns.protected(ot1).method5();
    let omyPrivate = scfns.scope('myPrivate', ot1);
    let omyProtected = scfns.scope('myProtected', ot1);
    omyPrivate.method7();
    trycode(() => {
        omyPrivate.method8();
    });
    omyProtected.method8();
    omyProtected.method9();

    log('Test inheritence of public, protected and named protected groups')
    let ot2 = scopes.parse(Object.create(ot1), (Public) => {
        return {
            method100: function () {
                log(`method100`);
            },
            protected_scope: {
                method400: function () {
                    log(`method400`);
                },
                method500: function () {
                    log(`method500`);
                    Public(this).method100();
                },
            },
            protected_scope__myProtected: {
                method800: function () {
                    log(`method800`);
                },
                method900: function () {
                    log(`method900`);
                    Public(this).method100();
                },
            },
        }
    });

    ot2.method1();
    ot2.method100();
    scfns.protected(ot2).method4();
    scfns.protected(ot2).method5();
    scfns.protected(ot2).method400();
    scfns.protected(ot2).method500();

    omyProtected = scfns.scope('myProtected', ot2);
    omyProtected.method8();
    omyProtected.method9();
    omyProtected.method800();
    omyProtected.method900();
}

function testScopesParse() {
    log('\n----- testScopesParse -----')
    let scfns1, scfns2, scfns3;
    let ot1 = scopes.parse((Public, Private, ...more) => {
        scfns1 = scopes.packageScopesFnArgs([Public, Private, ...more]);
        return {
            public__method1: function () {
                console.log('method1');
            },
            private__method2: function () {
                console.log('method2', "val2:", this.val2);
                Public(this).method1();
            },
            method3: function () {
                console.log('method3', 'val2:', Private(this).val2);
                Private(this).method2();
            },
            setVal2: function (v) {
                Private(this).val2 = v;
            },
            getVal2: function () {
                return (Private(this).val2);
            },
            get val2() {
                return (Private(this).val3);
            },
            set val2(v) {
                Private(this).val3 = v;
            },
            val1: 10,
            private__val2: 100,
            get private__val3() {
                return (this.val2);
            },
            set private__val3(v) {
                this.val2 = v;
            },
            const__cval: 1024,
            const_private__cval1: 2048,
            method4: function () {
                console.log('method4', Private(this).cval1);
                trycode(() => {
                    Private(this).cval1 = 10;
                });
                return ('success');
            },
            protected__method5: function () {
                console.log('method5')
            }
        };
    });

    let ot3 = scopes.parse(Object.create(ot1), (...more) => {
        scfns2 = scopes.packageScopesFnArgs([...more]);
        return {
            protected__method6: function () {
                console.log('method6')
            },
            protected__method7: function () {
                console.log('method7')
            },
        };
    });

    let ot4 = scopes.parse(Object.create(ot3), function () {
        scfns3 = scopes.packageScopesFnArgs(arguments);
        return {
            const_restricted__method8: function () {
                console.log('method8')
            },
        };
    });

    log('-- Transformed Object');
    log(ot1);
    console.log('-- Run public method declared with public. prefix');
    ot1.method1();
    console.log('-- Should fail trying to run private method as if public');
    trycode(() => {
        ot1.method2()
    });
    console.log('-- Run public method that calls a private method');
    ot1.method3();
    console.log('-- Run public method using a public scope function');
    scfns1.public(ot1).method1();
    console.log('-- Display public value. Should error trying to show private value.');
    console.log("val1:", ot1.val1);

    //    let ot2 = ift.createInstance(ot1);
    let ot2 = Object.create(ot1);
    console.log('-- Run public method that calls a private method for an instance');
    ot2.method3();
    console.log('-- Check that the private scope data is separate for instance and prototype');
    ot1.setVal2(300);
    ot2.setVal2(500);
    console.log('instance:', ot2.getVal2(), 'prototype', ot1.getVal2());
    console.log('-- Test getters and setters');
    ot1.val2 = 600;
    ot2.val2 = 700;
    console.log('instance:', ot2.val2, 'prototype', ot1.val2);

    console.log('-- Test constant values');
    console.log('cval', ot1.cval, ot2.cval);
    trycode(() => {
        ot1.cval = 2000
    });
    console.log('cval1', ot1.method4());

    // Test protected scope.
    console.log('-- Test protected scope');
    scfns2.protected(ot3).method5();
    scfns2.protected(ot3).method6();
    scfns2.protected(ot3).method7();
    ot3.method1();
    trycode(() => {
        scfns2.private(ot3).method2();
    });
    scfns3.protected(ot4).method7();

    // Test protected scope.
    //    console.log('-- Test restricted scope');
    //    scfns3.restricted(ot4).method8();
}

function log() {
    console.log.apply(undefined, arguments);
}

function trycode(fn) {
    try {
        fn()
    } catch (err) {
        console.log(err.name, err.message);
    }
}