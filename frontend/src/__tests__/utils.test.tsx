import { describe, it, expect, vi, beforeEach, beforeAll, Mock } from 'vitest';
import { waitFor } from '@testing-library/dom';
import * as utils from '../utils';

const setupDOM = () => {
    document.body.innerHTML = `
    <div id="login-form" style="opacity: 0; pointer-events: none; top: 40%;">Login Form</div>
    <div id="signin-form" style="opacity: 0; pointer-events: none; top: 40%;">Signin Form</div>
    <div id="profile-form" style="opacity: 0; pointer-events: none; top: 40%;">Profile Form</div>
    <div id="welcomeText">Welcome Message</div>
    <div id="welcomeSuccsessLogIn">Success Message</div>
  `;
};

const createMockResponse = (data: any, status = 200, ok = status >= 200 && status < 300): Response => {
    const responseData = JSON.stringify(data);
    const responseBlob = new Blob([responseData]);
    const mockResponse: Response = {
        ok,
        status,
        statusText: ok ? 'OK' : 'Error',
        headers: new Headers(),
        redirected: false,
        type: 'basic',
        url: '',
        body: new ReadableStream({
            start(controller) {
                controller.enqueue(new TextEncoder().encode(responseData));
                controller.close();
            }
        }),
        bodyUsed: false,
        json: vi.fn(async () => {
            (mockResponse as any).bodyUsed = true;
            return Promise.resolve(data);
        }),
        text: vi.fn(async () => {
            (mockResponse as any).bodyUsed = true;
            return Promise.resolve(responseData);
        }),
        arrayBuffer: vi.fn(async () => {
            (mockResponse as any).bodyUsed = true;
            return Promise.resolve(await responseBlob.arrayBuffer());
        }),
        blob: vi.fn(async () => {
            (mockResponse as any).bodyUsed = true;
            return Promise.resolve(responseBlob);
        }),
        formData: vi.fn(async () => {
            (mockResponse as any).bodyUsed = true;
            return Promise.resolve(new FormData());
        }),
        bytes: vi.fn(async () => {
            (mockResponse as any).bodyUsed = true;
            const buffer = await responseBlob.arrayBuffer();
            return Promise.resolve(new Uint8Array(buffer));
        }),
        clone: vi.fn(() => {
            const clonedResponse = createMockResponse(data, status, ok);
            return clonedResponse;
        }),
    };
    Object.defineProperty(mockResponse, 'trailer', {
        value: Promise.resolve(new Headers()),
        writable: false,
    });
    return mockResponse;
};

globalThis.fetch = vi.fn() as Mock<any>;

describe('Utility Functions (utils.jsx)', () => {

    beforeAll(() => {
        const storageMock = (() => {
            let store: Record<string, string> = {};
            return {
                getItem: (key: string): string | null => store[key] || null,
                setItem: (key: string, value: string) => { store[key] = value.toString(); },
                removeItem: (key: string) => { delete store[key]; },
                clear: () => { store = {}; },
            };
        })();
        Object.defineProperty(window, 'localStorage', {
            value: storageMock,
            writable: true,
        });
    });

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        setupDOM();
        (globalThis.fetch as Mock).mockResolvedValue(createMockResponse({}));
        // @ts-ignore
        delete window.location;
        const mockLocation = {
            assign: vi.fn(),
            replace: vi.fn(),
            origin: 'http://localhost:3000',
            pathname: '/',
            search: '' as any,
            hash: '',
            href: '',
        };
        Object.defineProperty(window, 'location', {
            value: mockLocation,
            writable: true,
            configurable: true,
        });
    });

    describe('checkInitialAuthState', () => {
        it('should return false and not update welcome text if no token/user', () => {
            const welcomeEl = document.getElementById('welcomeText');
            const initialText = welcomeEl?.innerHTML;
            const result = utils.checkInitialAuthState();
            expect(result).toBe(false);
            expect(welcomeEl?.innerHTML).toBe(initialText);
        });

        it('should return true and update welcome text if token and user exist', () => {
            const username = 'testuser';
            localStorage.setItem('authToken', 'fake-token');
            localStorage.setItem('user', JSON.stringify({ username }));
            const welcomeEl = document.getElementById('welcomeText');
            const result = utils.checkInitialAuthState();
            expect(result).toBe(true);
            expect(welcomeEl?.innerHTML).toBe(`Welcome back, ${username}`);
        });

        it('should return false if welcomeText element does not exist', () => {
            document.body.innerHTML = '';
            localStorage.setItem('authToken', 'fake-token');
            localStorage.setItem('user', JSON.stringify({ username: 'test' }));
            expect(utils.checkInitialAuthState()).toBe(true);
        });
    });

    describe('DOM Manipulation', () => {
        it('closeTabs should hide all forms', () => {
            const loginForm = document.getElementById('login-form');
            const signinForm = document.getElementById('signin-form');
            const profileForm = document.getElementById('profile-form');
            if (loginForm) loginForm.style.opacity = '1';
            utils.closeTabs();
            expect(loginForm?.style.opacity).toBe('0');
            expect(loginForm?.style.pointerEvents).toBe('none');
            expect(loginForm?.style.top).toBe('40%');
            expect(signinForm?.style.opacity).toBe('0');
            expect(signinForm?.style.pointerEvents).toBe('none');
            expect(signinForm?.style.top).toBe('40%');
            expect(profileForm?.style.opacity).toBe('0');
            expect(profileForm?.style.pointerEvents).toBe('none');
            expect(profileForm?.style.top).toBe('40%');
        });

        it('showSignInTab should show signin and hide login', () => {
            const loginForm = document.getElementById('login-form');
            const signinForm = document.getElementById('signin-form');
            if (loginForm) {
                loginForm.style.opacity = '1';
                loginForm.style.pointerEvents = 'all';
                loginForm.style.top = '50%';
            }
            utils.showSignInTab();
            expect(signinForm?.style.opacity).toBe('1');
            expect(signinForm?.style.pointerEvents).toBe('all');
            expect(signinForm?.style.top).toBe('50%');
            expect(loginForm?.style.opacity).toBe('0');
            expect(loginForm?.style.pointerEvents).toBe('none');
            expect(loginForm?.style.top).toBe('40%');
        });

        it('showLogInTab should show login and hide signin', () => {
            const loginForm = document.getElementById('login-form');
            const signinForm = document.getElementById('signin-form');
            if (signinForm) {
                signinForm.style.opacity = '1';
                signinForm.style.pointerEvents = 'all';
                signinForm.style.top = '50%';
            }
            utils.showLogInTab();
            expect(loginForm?.style.opacity).toBe('1');
            expect(loginForm?.style.pointerEvents).toBe('all');
            expect(loginForm?.style.top).toBe('50%');
            expect(signinForm?.style.opacity).toBe('0');
            expect(signinForm?.style.pointerEvents).toBe('none');
            expect(signinForm?.style.top).toBe('40%');
        });

        it('displayProfile should show profile form', () => {
            const profileForm = document.getElementById('profile-form');
            utils.displayProfile();
            expect(profileForm?.style.opacity).toBe('1');
            expect(profileForm?.style.pointerEvents).toBe('all');
        });
    });

    describe('successfulLogin / successfulSignin', () => {
        const mockUserData = {
            token: 'new-login-token',
            username: 'loggedinuser',
            authenticated: true,
        };

        it('successfulLogin should update localStorage, DOM, and hide forms via closeTabs', () => {
            document.getElementById('login-form')!.style.opacity = '1';
            utils.successfulLogin(mockUserData);
            expect(localStorage.getItem('authToken')).toBe(mockUserData.token);
            expect(localStorage.getItem('user')).toBe(JSON.stringify({ username: mockUserData.username, authenticated: mockUserData.authenticated }));
            expect(document.getElementById('welcomeSuccsessLogIn')?.innerHTML).toBe('Login successful!');
            expect(document.getElementById('welcomeText')?.innerHTML).toBe(`Welcome back, ${mockUserData.username}`);
            expect(document.getElementById('login-form')?.style.opacity).toBe('0');
        });

        it('successfulSignin should update localStorage, DOM, and hide forms via closeTabs', () => {
            document.getElementById('signin-form')!.style.opacity = '1';
            utils.successfulSignin(mockUserData);
            expect(localStorage.getItem('authToken')).toBe(mockUserData.token);
            expect(localStorage.getItem('user')).toBe(JSON.stringify({ username: mockUserData.username, authenticated: mockUserData.authenticated }));
            expect(document.getElementById('welcomeSuccsessLogIn')?.innerHTML).toBe('Signin successful!');
            expect(document.getElementById('welcomeText')?.innerHTML).toBe(`Welcome, ${mockUserData.username}`);
            expect(document.getElementById('signin-form')?.style.opacity).toBe('0');
        });
    });

    describe('State Checkers', () => {
        it('isLoggedIn should return false if no token/user', () => {
            expect(utils.isLoggedIn()).toBe(false);
        });
        it('isLoggedIn should return true if token and user are in localStorage', () => {
            localStorage.setItem('authToken', 'token');
            localStorage.setItem('user', JSON.stringify({ username: 'user', authenticated: true }));
            expect(utils.isLoggedIn()).toBe(true);
        });

        it('getCurrentUsername should return username from localStorage', () => {
            const username = 'testuser';
            localStorage.setItem('user', JSON.stringify({ username }));
            expect(utils.getCurrentUsername()).toBe(username);
        });

        it('getCurrentUsername should return null if user key not in localStorage', () => {
            expect(utils.getCurrentUsername()).toBeNull();
        });

        it('should throw SyntaxError if user data in localStorage is malformed JSON', () => {
            localStorage.setItem('user', 'this is not json');
            expect(() => utils.getCurrentUsername()).toThrow(SyntaxError);
        });

        it('getAuthHeaders should return default headers if no token', () => {
            expect(utils.getAuthHeaders()).toEqual({ 'Content-Type': 'application/json' });
        });
        it('getAuthHeaders should include Authorization header if token exists', () => {
            const token = 'my-secret-token';
            localStorage.setItem('authToken', token);
            expect(utils.getAuthHeaders()).toEqual({
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
            });
        });
    });

    describe('Action Handlers', () => {
        it('handleLogin should show login tab if not logged in and tabs hidden', () => {
            utils.handleLogin();
            expect(document.getElementById('login-form')?.style.opacity).toBe('1');
            expect(document.getElementById('login-form')?.style.pointerEvents).toBe('all');
            expect(document.getElementById('signin-form')?.style.opacity).toBe('0');
        });

        it('handleLogin should close tabs if not logged in and tabs shown', () => {
            utils.showLogInTab();
            expect(document.getElementById('login-form')?.style.opacity).toBe('1');
            utils.handleLogin();
            expect(document.getElementById('login-form')?.style.opacity).toBe('0');
            expect(document.getElementById('signin-form')?.style.opacity).toBe('0');
        });

        it('handleLogin should redirect to profile page using window.location.href if logged in', () => {
            const username = 'testuser';
            const loginData = { token: 'test-token', username: username, authenticated: true };
            utils.successfulLogin(loginData);
            utils.handleLogin();
            expect(window.location.href).toBe(`/profile/${username}`);
        });

        it('handleProfile should show login tab if not logged in', () => {
            utils.handleProfile();
            expect(document.getElementById('login-form')?.style.opacity).toBe('1');
            expect(document.getElementById('signin-form')?.style.opacity).toBe('0');
        });

        it('handleProfile should redirect to profile page if logged in', () => {
            const username = 'profileuser';
            localStorage.setItem('authToken', 'profile-token');
            localStorage.setItem('user', JSON.stringify({ username: username, authenticated: true }));
            utils.handleProfile();
            expect(window.location.href).toBe(`/profile/${username}`);
        });

        it('handleProfile should show login tab if logged in with token but no user data', () => {
            localStorage.setItem('authToken', 'fallback-token');
            localStorage.removeItem('user');
            utils.handleProfile();
            expect(document.getElementById('login-form')?.style.opacity).toBe('1');
            expect(document.getElementById('profile-form')?.style.opacity).toBe('0');
            expect(window.location.href).toBe('');
        });
    });

    describe('logout', () => {
        it('should call fetch, clear localStorage, update DOM, and close tabs on successful logout', async () => {
            const token = 'token-to-clear';
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify({ username: 'user' }));
            document.getElementById('welcomeText')!.innerHTML = 'Welcome back, user';
            (globalThis.fetch as Mock).mockResolvedValueOnce(createMockResponse({}, 200));
            await utils.logout();
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/logout/',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({ 'Authorization': `Token ${token}` })
                })
            );
            await waitFor(() => {
                expect(localStorage.getItem('authToken')).toBeNull();
                expect(localStorage.getItem('user')).toBeNull();
                expect(document.getElementById('welcomeText')?.innerHTML).toBe('Welcome to Book Club');
                expect(document.getElementById('welcomeSuccsessLogIn')?.innerHTML).toBe('');
                expect(document.getElementById('login-form')?.style.opacity).toBe('0');
            });
        });

        it('should clear localStorage, update DOM, and close tabs even if fetch fails', async () => {
            const token = 'token-to-clear';
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify({ username: 'user' }));
            document.getElementById('welcomeText')!.innerHTML = 'Welcome back, user';
            (globalThis.fetch as Mock).mockRejectedValueOnce(new Error('Network Error'));
            await utils.logout();
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/logout/',
                expect.any(Object)
            );
            await waitFor(() => {
                expect(localStorage.getItem('authToken')).toBeNull();
                expect(localStorage.getItem('user')).toBeNull();
                expect(document.getElementById('welcomeText')?.innerHTML).toBe('Welcome to Book Club');
                expect(document.getElementById('welcomeSuccsessLogIn')?.innerHTML).toBe('');
                expect(document.getElementById('login-form')?.style.opacity).toBe('0');
            });
        });
    });

    describe('fetchProfileData', () => {
        const username = 'testuser';
        const profileUrl = `/api/profile/${username}/`;

        it('should fetch profile data with auth headers and return JSON on success', async () => {
            const profileData = { email: 'test@example.com', bio: 'Test bio' };
            const token = 'auth-token-123';
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify({ username: username, authenticated: true }));
            (globalThis.fetch as Mock).mockResolvedValueOnce(createMockResponse(profileData));
            const result = await utils.fetchProfileData(username);
            expect(globalThis.fetch).toHaveBeenCalledWith(
                profileUrl,
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({ 'Authorization': `Token ${token}` })
                })
            );
            expect(result).toEqual(profileData);
        });

        it('should throw, clear auth tokens/user from localStorage on 401 error', async () => {
            const token = 'invalid-token';
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify({ username }));
            (globalThis.fetch as Mock).mockResolvedValueOnce(createMockResponse({}, 401, false));
            await expect(utils.fetchProfileData(username)).rejects.toThrow(
                'Authentication failed. Please log in again.'
            );
            expect(globalThis.fetch).toHaveBeenCalledWith(profileUrl, expect.any(Object));
            await waitFor(() => {
                expect(localStorage.getItem('authToken')).toBeNull();
                expect(localStorage.getItem('user')).toBeNull();
            });
        });

        it('should throw a generic error on other non-ok fetch responses (e.g., 500) and NOT clear auth', async () => {
            const token = 'valid-token-but-server-error';
            const userData = { username: username, authenticated: true };
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify(userData));
            (globalThis.fetch as Mock).mockResolvedValueOnce(createMockResponse({}, 500, false));
            await expect(utils.fetchProfileData(username)).rejects.toThrow(
                'Error 500: Failed to fetch profile'
            );
            expect(globalThis.fetch).toHaveBeenCalledWith(profileUrl, expect.any(Object));
            expect(localStorage.getItem('authToken')).toBe(token);
            expect(localStorage.getItem('user')).toBe(JSON.stringify(userData));
        });

        it('should throw if fetch itself rejects (e.g., network error) and NOT clear auth', async () => {
            const token = 'valid-token-network-error';
            const userData = { username: username, authenticated: true };
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify(userData));
            const networkError = new Error('Network request failed');
            (globalThis.fetch as Mock).mockRejectedValueOnce(networkError);
            await expect(utils.fetchProfileData(username)).rejects.toThrow(networkError.message);
            expect(globalThis.fetch).toHaveBeenCalledWith(profileUrl, expect.any(Object));
            expect(localStorage.getItem('authToken')).toBe(token);
            expect(localStorage.getItem('user')).toBe(JSON.stringify(userData));
        })
    });
});