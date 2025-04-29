// src/__tests__/utils.test.tsx

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { waitFor } from '@testing-library/react';
import * as utils from '../utils';

// Helper to create mock DOM elements
const setupDOM = () => {
  document.body.innerHTML = `
    <div id="login-form" style="opacity: 0; pointer-events: none; top: 40%;">Login Form</div>
    <div id="signin-form" style="opacity: 0; pointer-events: none; top: 40%;">Signin Form</div>
    <div id="profile-form" style="opacity: 0; pointer-events: none; top: 40%;">Profile Form</div>
    <div id="welcomeText">Welcome Message</div>
    <div id="welcomeSuccsessLogIn">Success Message</div>
  `;
};

// Mock Response Helper
const createMockResponse = (data: any, status = 200): Response => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: vi.fn(() => ({ ...createMockResponse(data, status) })),
    body: null,
    bodyUsed: false,
    arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(0))),
    blob: vi.fn(() => Promise.resolve(new Blob())),
    formData: vi.fn(() => Promise.resolve(new FormData())),
    text: vi.fn(() => Promise.resolve(JSON.stringify(data))),
    bytes: vi.fn(() => Promise.resolve(new Uint8Array())),
});

// Mock global fetch
globalThis.fetch = vi.fn() as Mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>;

// Mock window.location
const originalLocation = window.location;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
delete window.location;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
window.location = {
    ...originalLocation,
    assign: vi.fn(),
    replace: vi.fn(),
    href: '',
};

describe('Utility Functions (utils.jsx)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        setupDOM(); // Reset DOM
        (globalThis.fetch as Mock).mockResolvedValue(createMockResponse({})); // Reset fetch mock
        // Reset location mock calls and href
        vi.mocked(window.location.assign).mockClear();
        vi.mocked(window.location.replace).mockClear();
        window.location.href = '';
    });

    // --- checkInitialAuthState ---
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
    });

    // --- DOM Manipulation Functions ---
    describe('DOM Manipulation', () => {
        it('closeTabs should hide all forms', () => {
            document.getElementById('login-form')!.style.opacity = '1';
            utils.closeTabs();
            expect(document.getElementById('login-form')?.style.opacity).toBe('0');
            expect(document.getElementById('signin-form')?.style.opacity).toBe('0');
            expect(document.getElementById('profile-form')?.style.opacity).toBe('0');
            expect(document.getElementById('login-form')?.style.pointerEvents).toBe('none');
        });

        it('showSignInTab should show signin and hide login', () => {
            document.getElementById('login-form')!.style.opacity = '1';
            utils.showSignInTab();
            expect(document.getElementById('signin-form')?.style.opacity).toBe('1');
            expect(document.getElementById('signin-form')?.style.pointerEvents).toBe('all');
            expect(document.getElementById('signin-form')?.style.top).toBe('50%');
            expect(document.getElementById('login-form')?.style.opacity).toBe('0');
        });

         it('showLogInTab should show login and hide signin', () => {
            document.getElementById('signin-form')!.style.opacity = '1';
            utils.showLogInTab();
            expect(document.getElementById('login-form')?.style.opacity).toBe('1');
            expect(document.getElementById('login-form')?.style.pointerEvents).toBe('all');
            expect(document.getElementById('login-form')?.style.top).toBe('50%');
            expect(document.getElementById('signin-form')?.style.opacity).toBe('0');
         });

         it('displayProfile should show profile form', () => {
            utils.displayProfile();
            expect(document.getElementById('profile-form')?.style.opacity).toBe('1');
            expect(document.getElementById('profile-form')?.style.pointerEvents).toBe('all');
         });
    });

    // --- Login/Signin Success ---
     describe('successfulLogin / successfulSignin', () => {
        const mockUserData = {
            token: 'new-login-token',
            username: 'loggedinuser',
            authenticated: true,
        };

        it('successfulLogin should update state, localStorage, DOM, and hide forms', () => {
            document.getElementById('login-form')!.style.opacity = '1'; // Arrange visibility
            utils.successfulLogin(mockUserData);

            expect(localStorage.getItem('authToken')).toBe(mockUserData.token);
            expect(localStorage.getItem('user')).toBe(JSON.stringify({ username: mockUserData.username, authenticated: mockUserData.authenticated }));
            expect(document.getElementById('welcomeSuccsessLogIn')?.innerHTML).toBe('Login successful!');
            expect(document.getElementById('welcomeText')?.innerHTML).toBe(`Welcome back, ${mockUserData.username}`);
            expect(utils.isLoggedIn()).toBe(true);
            expect(document.getElementById('login-form')?.style.opacity).toBe('0'); // Check closeTabs effect
        });

        it('successfulSignin should update state, localStorage, DOM, and hide forms', () => {
             document.getElementById('signin-form')!.style.opacity = '1'; // Arrange visibility
             utils.successfulSignin(mockUserData);

             expect(localStorage.getItem('authToken')).toBe(mockUserData.token);
             expect(localStorage.getItem('user')).toBe(JSON.stringify({ username: mockUserData.username, authenticated: mockUserData.authenticated }));
             expect(document.getElementById('welcomeSuccsessLogIn')?.innerHTML).toBe('Signin successful!');
             expect(document.getElementById('welcomeText')?.innerHTML).toBe(`Welcome, ${mockUserData.username}`);
             expect(utils.isLoggedIn()).toBe(true);
             expect(document.getElementById('signin-form')?.style.opacity).toBe('0'); // Check closeTabs effect
        });
     });

    // --- isLoggedIn / getCurrentUsername / getAuthHeaders ---
    describe('State Checkers', () => {
        it('isLoggedIn should return false if no token/user', () => {
            expect(utils.isLoggedIn()).toBe(false);
        });

        it('isLoggedIn should return false if only token exists', () => {
            localStorage.setItem('authToken', 'token');
            expect(utils.isLoggedIn()).toBe(false);
        });

        it('isLoggedIn should return false if only user exists', () => {
            localStorage.setItem('user', JSON.stringify({ username: 'user' }));
            expect(utils.isLoggedIn()).toBe(false);
        });

        it('isLoggedIn should return true if token and user are in localStorage', () => {
            localStorage.setItem('authToken', 'token');
            localStorage.setItem('user', JSON.stringify({ username: 'user' }));
            expect(utils.isLoggedIn()).toBe(true);
        });

        it('getCurrentUsername should return username from localStorage', () => {
            const username = 'testuser';
            localStorage.setItem('user', JSON.stringify({ username }));
            expect(utils.getCurrentUsername()).toBe(username);
        });

        it('getCurrentUsername should return null if user not in localStorage or data malformed', () => {
            expect(utils.getCurrentUsername()).toBeNull();
            localStorage.setItem('user', '{not json');
            expect(utils.getCurrentUsername()).toBeNull(); // Handle potential parse error
        });

        it('getAuthHeaders should return default headers if no token', () => {
            expect(utils.getAuthHeaders()).toEqual({ 'Content-Type': 'application/json' });
        });

        it('getAuthHeaders should include Authorization header if token exists', () => {
            const token = 'my-secret-token';
            localStorage.setItem('authToken', token);
            expect(utils.getAuthHeaders()).toEqual({
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`, // Ensure prefix matches usage
            });
        });
    });

    // --- handleLogin / handleProfile ---
    describe('Action Handlers', () => {
        it('handleLogin should show login tab if not logged in and tabs hidden', async () => {
            utils.handleLogin();
            await waitFor(() => {
                expect(document.getElementById('login-form')?.style.opacity).toBe('1');
            });
            expect(document.getElementById('login-form')?.style.pointerEvents).toBe('all');
            expect(document.getElementById('signin-form')?.style.opacity).toBe('0');
        });

        it('handleLogin should close tabs if not logged in and tabs shown', async () => {
            utils.showLogInTab(); // Show a tab first
            await waitFor(() => {
                 expect(document.getElementById('login-form')?.style.opacity).toBe('1');
            });
            utils.handleLogin(); // Should close it now
            await waitFor(() => {
                 expect(document.getElementById('login-form')?.style.opacity).toBe('0');
            });
            expect(document.getElementById('signin-form')?.style.opacity).toBe('0');
        });

        it('handleLogin should redirect to profile page if logged in', () => {
            const username = 'testuser';
            utils.successfulLogin({ token: 'test', username: username, authenticated: true }); // Setup logged in state
            utils.handleLogin();
            expect(window.location.href).toBe(`/profile/${username}`);
        });

        it('handleProfile should show login tab if not logged in', async () => {
            utils.handleProfile();
            await waitFor(() => {
                expect(document.getElementById('login-form')?.style.opacity).toBe('1');
            });
            expect(document.getElementById('signin-form')?.style.opacity).toBe('0');
        });

        it('handleProfile should redirect to profile page if logged in', () => {
            const username = 'profileuser';
            utils.successfulLogin({ token: 'test', username: username, authenticated: true }); // Setup logged in state
            utils.handleProfile();
            expect(window.location.href).toBe(`/profile/${username}`);
         });

        it('handleProfile should display profile modal as fallback if logged in but no username', () => {
             localStorage.setItem('authToken', 'test-token'); // Simulate logged in via token
             localStorage.removeItem('user'); // But user data is missing
             utils.isLoggedIn(); // Update internal state based on check

             utils.handleProfile();

             expect(window.location.href).toBe(''); // No redirect
             expect(document.getElementById('profile-form')?.style.opacity).toBe('1');
             expect(document.getElementById('profile-form')?.style.pointerEvents).toBe('all');
         });
    });

    // --- logout ---
    describe('logout', () => {
        it('should call fetch, clear localStorage, update DOM, and close tabs on successful logout', async () => {
            localStorage.setItem('authToken', 'token-to-clear');
            localStorage.setItem('user', JSON.stringify({ username: 'user' }));
            (globalThis.fetch as Mock).mockResolvedValueOnce(createMockResponse({}));

            await utils.logout();

            await waitFor(() => { // Wait for state updates in finally()
                 expect(localStorage.getItem('authToken')).toBeNull();
                 expect(localStorage.getItem('user')).toBeNull();
                 expect(utils.isLoggedIn()).toBe(false);
            });
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/logout/',
                expect.objectContaining({ method: 'POST', headers: expect.objectContaining({'Authorization': 'Token token-to-clear'}) })
            );
            expect(document.getElementById('welcomeText')?.innerHTML).toBe('Welcome to Book Club');
            expect(document.getElementById('login-form')?.style.opacity).toBe('0'); // Check closeTabs effect
        });

        it('should clear localStorage, update DOM, and close tabs even if fetch fails', async () => {
            localStorage.setItem('authToken', 'token-to-clear');
            localStorage.setItem('user', JSON.stringify({ username: 'user' }));
            (globalThis.fetch as Mock).mockRejectedValueOnce(new Error('Network Error'));

            await utils.logout(); // .finally() handles cleanup

            await waitFor(() => { // Wait for state updates in finally()
                  expect(localStorage.getItem('authToken')).toBeNull();
                  expect(localStorage.getItem('user')).toBeNull();
                  expect(utils.isLoggedIn()).toBe(false);
             });
             expect(globalThis.fetch).toHaveBeenCalled();
             expect(document.getElementById('welcomeText')?.innerHTML).toBe('Welcome to Book Club');
             expect(document.getElementById('login-form')?.style.opacity).toBe('0');
        });
    });

    // --- fetchProfileData ---
    describe('fetchProfileData', () => {
        const username = 'testuser';
        const profileUrl = `/api/profile/${username}/`;

        it('should fetch profile data with auth headers and return JSON on success', async () => {
            const profileData = { email: 'test@example.com', bio: 'Test bio' };
            const token = 'auth-token-123';
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify({ username: username })); // Also set user for getAuthHeaders
            (globalThis.fetch as Mock).mockResolvedValueOnce(createMockResponse(profileData));

            const result = await utils.fetchProfileData(username);

            expect(globalThis.fetch).toHaveBeenCalledWith(
                profileUrl,
                expect.objectContaining({ method: 'GET', headers: expect.objectContaining({'Authorization': `Token ${token}`}) })
            );
            expect(result).toEqual(profileData);
        });

        it('should throw, clear auth, and update state on 401 error', async () => {
             localStorage.setItem('authToken', 'invalid-token');
             localStorage.setItem('user', JSON.stringify({ username }));
             (globalThis.fetch as Mock).mockResolvedValueOnce(createMockResponse({}, 401));

            await expect(utils.fetchProfileData(username)).rejects.toThrow(
                'Authentication failed. Please log in again.'
            );

            // Assert state *after* rejection is handled
            expect(globalThis.fetch).toHaveBeenCalledWith(profileUrl, expect.any(Object));
            // Wait for localStorage updates if they happen async in error handler (though likely sync here)
            await waitFor(() => {
                expect(localStorage.getItem('authToken')).toBeNull();
                expect(localStorage.getItem('user')).toBeNull();
            });
            expect(utils.isLoggedIn()).toBe(false); // Check state update
        });

         it('should throw a generic error on other fetch failures and NOT clear auth', async () => {
             const token = 'token';
             const userData = { username: username, authenticated: true }; // Define the full user data
             localStorage.setItem('authToken', token);
             localStorage.setItem('user', JSON.stringify(userData)); // Store the full user data
             (globalThis.fetch as Mock).mockResolvedValueOnce(createMockResponse({}, 500));

            await expect(utils.fetchProfileData(username)).rejects.toThrow(
                'Error 500: Failed to fetch profile'
            );

             expect(globalThis.fetch).toHaveBeenCalledWith(profileUrl, expect.any(Object));
             // Auth state should NOT be cleared
             expect(localStorage.getItem('authToken')).toBe(token);
             expect(localStorage.getItem('user')).toBe(JSON.stringify(userData));
             expect(utils.isLoggedIn()).toBe(true); // State not reset
         });
    });
});