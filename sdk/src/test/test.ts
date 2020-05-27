import {expect, spy, fetchMock} from '@ringcentral/sdk-utils/test';
import {SDK, SDKOptions} from '../SDK';

export function apiCall(method, path, json, status = 200, statusText = 'OK', headers = null) {
    const isJson = typeof json !== 'string';

    if (isJson && !headers) headers = {'Content-Type': 'application/json'};

    fetchMock.mock({
        method,
        matcher: `http://whatever${path}`,
        repeat: 1,
        overwriteRoutes: false,
        response: new fetchMock.config.Response(isJson ? JSON.stringify(json) : json, {
            status,
            statusText,
            headers,
        }),
    });
}

export function authentication() {
    apiCall('POST', '/restapi/oauth/token', {
        access_token: 'ACCESS_TOKEN',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'REFRESH_TOKEN',
        refresh_token_expires_in: 60480,
        scope: 'SMS RCM Foo Boo',
        expireTime: new Date().getTime() + 3600000,
    });
}

export function logout() {
    apiCall('POST', '/restapi/oauth/revoke', {});
}

export function tokenRefresh(failure = false) {
    if (!failure) {
        apiCall('POST', '/restapi/oauth/token', {
            access_token: 'ACCESS_TOKEN_FROM_REFRESH',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'REFRESH_TOKEN_FROM_REFRESH',
            refresh_token_expires_in: 60480,
            scope: 'SMS RCM Foo Boo',
        });
    } else {
        apiCall(
            'POST',
            '/restapi/oauth/token',
            {
                message: 'Wrong token',
                error_description: 'Wrong token',
                description: 'Wrong token',
            },
            400,
        );
    }
}

export function createSdk(options: SDKOptions = {}) {
    return new SDK({
        server: 'http://whatever',
        clientId: 'whatever',
        clientSecret: 'whatever',
        Request: fetchMock.config.Request,
        Response: fetchMock.config.Response,
        Headers: fetchMock.config.Headers,
        fetch: fetchMock.fetchHandler,
        refreshDelayMs: 1,
        redirectUri: 'http://foo',
        handleRateLimit: false,
        ...options,
    });
}

export function asyncTest(fn: (sdk: SDK) => any) {
    return async () => {
        const sdk = createSdk(); // {cachePrefix: 'prefix-' + Date.now()}

        const clean = async () => {
            fetchMock.restore();
            await sdk.cache().clean();
        };

        try {
            await clean();

            authentication();

            const platofrm = sdk.platform();

            await platofrm.login({
                username: 'whatever',
                password: 'whatever',
            });

            await fn(sdk);

            expect(fetchMock.done()).to.equal(true);

            await clean();
        } catch (e) {
            await clean();
            console.error(e.stack); //eslint-disable-line
            throw e;
        }
    };
}

export async function expectThrows(fn, errorText = '', additional = (e?: Error) => {}) {
    try {
        await fn();
        throw new Error('This should not be reached');
    } catch (e) {
        expect(e.message).to.have.string(errorText);
        await additional(e);
    }
}

export {spy, SDK, expect};