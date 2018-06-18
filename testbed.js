/**
 * Main for testing features of the Influence Framework
 */

"use strict"

let scopes = require('./scopes');
scopes.setObjectHooks();

test();
//testCrossObjectAccess();
//testScopesGroupParse();
//testScopesParse();

function test() {
    let scopefns = {};
    let o1 = {};
    // If value, writable, get, set are absent then treated as a data element.
    // If value or writable and get or set defined throw exception.
    scopes.defineProperty(o, "propName", (Public, Private, Protected, Scope) => {
        return ({
            scope: 'scopeName', // or { scopeName : 'myScope' }
            configurable: true,
            enumerable: true,
            value: undefined,
            writable: true,
            get: function () {},
            set: function (v) {},
        });
    });

    scopes.defineProperties(o, (Public, Private, Protected, Scope) => {
        return ({
            property1: {},
            property2: {}
        });
    })

    let o1 = {
        meth1: scopes.property(scopeFns, {
            scope: 'private',
            value: function () {
                scopeFns.public(this).meth2();
                scopeFns.myProt(this, () => {
                    this.meth3();
                });
            },
        }),
        meth3: scopes.property(scopeFns, {
            scope: {
                protected: 'myProt'
            },
            get: function () {
                return (10);
            },
            set: function (v) {

            }
        }),
        meth2: function () {
            log('Hello World');
        }
    }
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
    let ot1 = scopes.parse((Public, Private) => {
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
    }, s => {
        scfns = s
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
    scfns.myPrivate(ot1).method6();
    scfns.myPrivate(ot1).method7();
    trycode(() => {
        scfns.myPrivate(ot1).method8();
    });
    scfns.myProtected(ot1).method8();
    scfns.myProtected(ot1).method9();

    log('Test inheritence of public, protected and named protected groups')
    let ot2 = scopes.parse((Public) => {
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
    }, ot1);

    ot2.method1();
    ot2.method100();
    scfns.protected(ot2).method4();
    scfns.protected(ot2).method5();
    scfns.protected(ot2).method400();
    scfns.protected(ot2).method500();
    scfns.myProtected(ot2).method8();
    scfns.myProtected(ot2).method9();
    scfns.myProtected(ot2).method800();
    scfns.myProtected(ot2).method900();
}

function testScopesParse() {
    log('\n----- testScopesParse -----')
    let scfns1, scfns2, scfns3;
    let ot1 = scopes.parse((Public, Private) => {
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
    }, s => {
        scfns1 = s;
    });

    let ot3 = scopes.parse(() => {
        return {
            protected__method6: function () {
                console.log('method6')
            },
            protected__method7: function () {
                console.log('method7')
            },
        };
    }, ot1, s => {
        scfns2 = s;
    });

    let ot4 = scopes.parse(() => {
        return {
            const_restricted__method8: function () {
                console.log('method8')
            },
        };
    }, ot3, s => {
        scfns3 = s;
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