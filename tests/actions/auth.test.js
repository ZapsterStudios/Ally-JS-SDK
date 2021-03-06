/**
 * Require test requirements.
 */
const auth = require('../../src/actions/auth');
const factories = require('../factories');

/**
 * Require test mocks.
 */
require('../mocks/storage.mock');
const axios = require('../mocks/axios.mock');

/** @test */
test('invalid login attempt does not change data', async () => {
    axios.reset();
    axios.mock('login').reply(401);

    expect.assertions(4);
    await auth.login('unregistered@example.com', 'secret').catch(error => {
        expect(auth.user()).toBeNull();
        expect(auth.token()).toBeNull();
        expect(auth.expiry()).toBeNull();

        expect(auth.check()).toBe(false);
    });
});

/** @test */
test('valid login attempt with failed user retrival does not change data', async () => {
    axios.reset();
    axios.mock('login').reply(...factories.login());
    axios.mock('account.show').reply(404);

    expect.assertions(4);
    await auth.login('registered@example.com', 'secret').catch(error => {
        expect(auth.user()).toBeNull();
        expect(auth.token()).toBeNull();
        expect(auth.expiry()).toBeNull();

        expect(auth.check()).toBe(false);
    });
});

/** @test */
test('valid login attempt does change data', async () => {
    axios.reset();
    axios.mock('login').reply(...factories.login());
    axios.mock('account.show').reply(...factories.user());

    expect.assertions(4);
    await auth.login('registered@example.com', 'secret').then(response => {
        expect(auth.token()).toEqual(factories.login()[1]);
        expect(auth.user()).toEqual(factories.user()[1]);
        expect(auth.expiry()).not.toBeNull();

        expect(auth.check()).toBe(true);
    });
});

/** @test */
test('invalid refesh attempt does not change data', async () => {
    axios.reset();
    axios.mock('refresh').reply(404);

    expect.assertions(2);
    auth.reset();
    await auth.refresh('some-refresh-token').catch(error => {
        expect(auth.token()).toBeNull();
        expect(auth.expiry()).toBeNull();
    });
});

/** @test */
test('valid refresh attempt does change data', async () => {
    axios.reset();
    axios.mock('refresh').reply(...factories.login());

    expect.assertions(2);
    auth.reset();
    await auth.refresh('some-refresh-token').then(response => {
        expect(auth.token()).toEqual(factories.login()[1]);
        expect(auth.expiry()).not.toBeNull();
    });
});

/** @test */
test('valid logout request does reset data', async () => {
    axios.reset();
    axios.mock('logout').reply(200, 'Token revoked.');

    await auth.logout().then(response => {
        expect(auth.user()).toBeNull();
        expect(auth.token()).toBeNull();
        expect(auth.expiry()).toBeNull();

        expect(auth.check()).toBe(false);
    });
});

/** @test */
test('can start and stop impersonation', () => {
    axios.reset();
    axios.mock('login').reply(...factories.login());
    axios.mock('account.show').reply(...factories.user(1));

    expect.assertions(10);
    return auth.login('registered@example.com', 'secret').then(async response => {
        axios.reset();
        axios.mock('dashboard.users.impersonation.store', {user: 2}).reply(...factories.login());
        axios.mock('account.show').reply(...factories.user(2));

        await auth.startImpersonation(2).then(response => {
            expect(auth.token()).toEqual(factories.login()[1]);
            expect(auth.user()).toEqual(factories.user(2)[1]);
            expect(auth.expiry()).not.toBeNull();

            expect(auth.user().id).toBe(2);

            expect(auth.check()).toBe(true);
        });

        axios.mock('dashboard.users.impersonation.destroy').reply(200);

        await auth.stopImpersonation().then(response => {
            expect(auth.token()).toEqual(factories.login()[1]);
            expect(auth.user()).toEqual(factories.user()[1]);
            expect(auth.expiry()).not.toBeNull();

            expect(auth.user().id).toBe(1);

            expect(auth.check()).toBe(true);
        });
    });
});
