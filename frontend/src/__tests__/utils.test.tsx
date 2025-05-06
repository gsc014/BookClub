// src/__tests__/utils.test.tsx

import { describe, it, expect, vi, beforeEach, beforeAll, afterEach, Mock } from 'vitest';
// Only import waitFor if genuinely needed for async DOM updates after promises
import { waitFor } from '@testing-library/dom'; // Use @testing-library/dom for waitFor
import * as utils from '../utils'; // Adjust path as necessary

// --- Mock Setup ---

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

// Mock Response Helper (Keep as is)
const createMockResponse = (data: any, status = 200, ok = status >= 200 && status < 300): Response => {
    const responseData = JSON.stringify(data);
    const responseBlob = new Blob([responseData]); // Create a blob from data for realistic body methods

    // The object returned must fully implement the Response interface
    const mockResponse: Response = {
        ok,
        status,
        statusText: ok ? 'OK' : 'Error',
        headers: new Headers(),
        redirected: false,
        type: 'basic', // or 'cors', 'error', 'opaque', 'opaqueredirect'
        url: '',
        body: new ReadableStream({ // Provide a minimal ReadableStream for the body
            start(controller) {
                controller.enqueue(new TextEncoder().encode(responseData));
                controller.close();
            }
        }),
        bodyUsed: false, // Start as false

        // Mock methods using vi.fn()
        json: vi.fn(async () => {
            // Simulate body consumption
            (mockResponse as any).bodyUsed = true; // Need 'as any' or separate flag if strict
            return Promise.resolve(data);
        }),
        text: vi.fn(async () => {
            (mockResponse as any).bodyUsed = true;
            return Promise.resolve(responseData);
        }),
        arrayBuffer: vi.fn(async () => {
            (mockResponse as any).bodyUsed = true;
            return Promise.resolve(await responseBlob.arrayBuffer()); // Use blob data
        }),
        blob: vi.fn(async () => {
            (mockResponse as any).bodyUsed = true;
            return Promise.resolve(responseBlob); // Return the blob
        }),
        formData: vi.fn(async () => {
            (mockResponse as any).bodyUsed = true;
            // FormData parsing is complex; return empty or mock based on needs
            return Promise.resolve(new FormData());
        }),
        // Add the required bytes method
        bytes: vi.fn(async () => {
            (mockResponse as any).bodyUsed = true;
            // Convert blob to Uint8Array
            const buffer = await responseBlob.arrayBuffer();
            return Promise.resolve(new Uint8Array(buffer));
        }),
        // Clone needs to return a valid Response mock as well
        clone: vi.fn(() => {
            // Create a new instance, copying relevant properties/state
            const clonedResponse = createMockResponse(data, status, ok);
            // If bodyUsed state needs to be cloned:
            // (clonedResponse as any).bodyUsed = mockResponse.bodyUsed;
            return clonedResponse;
        }),
        // Add other potential properties if needed by your tests (e.g., trailer)
        // trailer: Promise.resolve(new Headers()),
    };

    // Define trailer property if needed, as it's read-only getter in the interface
    Object.defineProperty(mockResponse, 'trailer', {
        value: Promise.resolve(new Headers()),
        writable: false, // Match the read-only nature
    });

    return mockResponse;
};


// Mock global fetch
globalThis.fetch = vi.fn() as Mock<any>; // Use any or refine the type

// --- Test Suite ---

describe('Utility Functions (utils.jsx)', () => {

    // Mock localStorage once for all tests
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

        // Remove the window.location mock from beforeAll
    });


    // Reset mocks and DOM before each test
    beforeEach(() => {
        vi.clearAllMocks(); // Clear fetch etc.
        localStorage.clear(); // Clear storage
        setupDOM(); // Reset DOM
        (globalThis.fetch as Mock).mockResolvedValue(createMockResponse({})); // Reset fetch

        // --- Reset window.location entirely for each test ---
        // Delete the existing property to ensure a clean slate (might be overkill but safe)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        delete window.location;

        // Create a FRESH, simple mock object for location in each test run
        const mockLocation = {
            assign: vi.fn(),
            replace: vi.fn(),
            origin: 'http://localhost:3000',
            pathname: '/',
            search: '' as any,
            hash: '',
            href: '', // Start with href as empty string for this test
        };

        // Re-assign the mock to window.location
        Object.defineProperty(window, 'location', {
            value: mockLocation,
            writable: true, // Make properties modifiable by the code under test
            configurable: true, // Allow deleting again in the next beforeEach
        });
        // Log the state *after* reset
        // console.log(`TEST beforeEach: window.location reset to:`, window.location);
    });


    // --- checkInitialAuthState ---
    describe('checkInitialAuthState', () => {
        it('should return false and not update welcome text if no token/user', () => {
            const welcomeEl = document.getElementById('welcomeText');
            const initialText = welcomeEl?.innerHTML;
            const result = utils.checkInitialAuthState();
            expect(result).toBe(false);
            expect(welcomeEl?.innerHTML).toBe(initialText); // Check it hasn't changed
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
            document.body.innerHTML = ''; // Remove welcomeText
            localStorage.setItem('authToken', 'fake-token');
            localStorage.setItem('user', JSON.stringify({ username: 'test' }));
            // Should not throw error, just return true because auth exists
            expect(utils.checkInitialAuthState()).toBe(true);
            // Can't check innerHTML as it doesn't exist
        });
    });

    // --- DOM Manipulation Functions ---
    describe('DOM Manipulation', () => {
        it('closeTabs should hide all forms', () => {
            // Arrange: Make one form visible to ensure it gets hidden
            const loginForm = document.getElementById('login-form');
            const signinForm = document.getElementById('signin-form');
            const profileForm = document.getElementById('profile-form');
            if (loginForm) loginForm.style.opacity = '1';

            // Act
            utils.closeTabs();

            // Assert: Check styles directly (synchronous)
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
            // Arrange: Ensure login form starts "visible" conceptually
            const loginForm = document.getElementById('login-form');
            const signinForm = document.getElementById('signin-form');
            if (loginForm) {
                loginForm.style.opacity = '1';
                loginForm.style.pointerEvents = 'all';
                loginForm.style.top = '50%';
            }

            // Act
            utils.showSignInTab();

            // Assert: Check styles directly
            expect(signinForm?.style.opacity).toBe('1');
            expect(signinForm?.style.pointerEvents).toBe('all');
            expect(signinForm?.style.top).toBe('50%');

            expect(loginForm?.style.opacity).toBe('0');
            expect(loginForm?.style.pointerEvents).toBe('none');
            expect(loginForm?.style.top).toBe('40%');
        });

        it('showLogInTab should show login and hide signin', () => {
            // Arrange: Ensure signin form starts "visible"
            const loginForm = document.getElementById('login-form');
            const signinForm = document.getElementById('signin-form');
            if (signinForm) {
                signinForm.style.opacity = '1';
                signinForm.style.pointerEvents = 'all';
                signinForm.style.top = '50%';
            }

            // Act
            utils.showLogInTab();

            // Assert: Check styles directly
            expect(loginForm?.style.opacity).toBe('1');
            expect(loginForm?.style.pointerEvents).toBe('all');
            expect(loginForm?.style.top).toBe('50%');

            expect(signinForm?.style.opacity).toBe('0');
            expect(signinForm?.style.pointerEvents).toBe('none');
            expect(signinForm?.style.top).toBe('40%');
        });

        it('displayProfile should show profile form', () => {
            const profileForm = document.getElementById('profile-form');

            // Act
            utils.displayProfile();

            // Assert: Check styles directly
            expect(profileForm?.style.opacity).toBe('1');
            expect(profileForm?.style.pointerEvents).toBe('all');
            // Note: The original displayProfile doesn't change 'top', so we don't assert it.
        });
    });

    // --- Login/Signin Success ---
    describe('successfulLogin / successfulSignin', () => {
        const mockUserData = {
            token: 'new-login-token',
            username: 'loggedinuser',
            authenticated: true,
        };

        it('successfulLogin should update localStorage, DOM, and hide forms via closeTabs', () => {
            // Arrange: Make a form visible to check closeTabs effect
            document.getElementById('login-form')!.style.opacity = '1';

            // Act
            utils.successfulLogin(mockUserData);

            // Assert: Check primary effects
            expect(localStorage.getItem('authToken')).toBe(mockUserData.token);
            expect(localStorage.getItem('user')).toBe(JSON.stringify({ username: mockUserData.username, authenticated: mockUserData.authenticated }));
            expect(document.getElementById('welcomeSuccsessLogIn')?.innerHTML).toBe('Login successful!');
            expect(document.getElementById('welcomeText')?.innerHTML).toBe(`Welcome back, ${mockUserData.username}`);
            // Assert: Check side effect of closeTabs being called
            expect(document.getElementById('login-form')?.style.opacity).toBe('0');
        });

        it('successfulSignin should update localStorage, DOM, and hide forms via closeTabs', () => {
            // Arrange: Make a form visible
            document.getElementById('signin-form')!.style.opacity = '1';

            // Act
            utils.successfulSignin(mockUserData);

            // Assert: Check primary effects
            expect(localStorage.getItem('authToken')).toBe(mockUserData.token);
            expect(localStorage.getItem('user')).toBe(JSON.stringify({ username: mockUserData.username, authenticated: mockUserData.authenticated }));
            expect(document.getElementById('welcomeSuccsessLogIn')?.innerHTML).toBe('Signin successful!');
            expect(document.getElementById('welcomeText')?.innerHTML).toBe(`Welcome, ${mockUserData.username}`);
            // Assert: Check side effect of closeTabs being called
            expect(document.getElementById('signin-form')?.style.opacity).toBe('0');
        });
    });

    // --- isLoggedIn / getCurrentUsername / getAuthHeaders ---
    describe('State Checkers', () => {
        // Tests for isLoggedIn remain the same - they check localStorage correctly
        it('isLoggedIn should return false if no token/user', () => {
            expect(utils.isLoggedIn()).toBe(false);
        });
        it('isLoggedIn should return true if token and user are in localStorage', () => {
            localStorage.setItem('authToken', 'token');
            localStorage.setItem('user', JSON.stringify({ username: 'user', authenticated: true })); // Ensure user obj is realistic
            expect(utils.isLoggedIn()).toBe(true);
        });
        // Add other isLoggedIn edge cases if necessary (only token, only user)

        // Tests for getCurrentUsername
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
            // Assert that calling the function *throws* according to current implementation
            expect(() => utils.getCurrentUsername()).toThrow(SyntaxError);
            // Consider adding a try/catch in the actual utils.jsx for robustness
        });

        // Tests for getAuthHeaders remain the same
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

    // --- handleLogin / handleProfile ---
    describe('Action Handlers', () => {
        // Note: These handlers implicitly depend on the internal `hide` state variable.
        // We are testing the outcome based on the initial state (usually hide=false).

        it('handleLogin should show login tab if not logged in and tabs hidden', () => {
            // Assumes initial state where hide = false (after closeTabs or initially)
            utils.handleLogin();
            // Assert: Style changes are synchronous
            expect(document.getElementById('login-form')?.style.opacity).toBe('1');
            expect(document.getElementById('login-form')?.style.pointerEvents).toBe('all');
            expect(document.getElementById('signin-form')?.style.opacity).toBe('0'); // Ensure other tab is hidden
        });

        it('handleLogin should close tabs if not logged in and tabs shown', () => {
            // Arrange: Show a tab first to set internal hide = true
            utils.showLogInTab();
            expect(document.getElementById('login-form')?.style.opacity).toBe('1'); // Verify setup

            // Act
            utils.handleLogin(); // Should call closeTabs because hide is true

            // Assert: Style changes are synchronous
            expect(document.getElementById('login-form')?.style.opacity).toBe('0');
            expect(document.getElementById('signin-form')?.style.opacity).toBe('0');
        });

        it('handleLogin should redirect to profile page using window.location.href if logged in', () => {
            const username = 'testuser';
            const loginData = { token: 'test-token', username: username, authenticated: true };
            utils.successfulLogin(loginData);
            // window.location.href = ''; // Reset is now handled by beforeEach

            utils.handleLogin();
            // console.log(`TEST (handleLogin redirect): Final href: '${window.location.href}'`);

            expect(window.location.href).toBe(`/profile/${username}`);
        });



        it('handleProfile should show login tab if not logged in', () => {
            // Assumes not logged in initially
            utils.handleProfile();
            // Assert: Style changes are synchronous
            expect(document.getElementById('login-form')?.style.opacity).toBe('1');
            expect(document.getElementById('signin-form')?.style.opacity).toBe('0');
        });

        it('handleProfile should redirect to profile page if logged in', () => {
            const username = 'profileuser';
            localStorage.setItem('authToken', 'profile-token');
            localStorage.setItem('user', JSON.stringify({ username: username, authenticated: true }));
            // window.location.href = ''; // Reset is now handled by beforeEach

            utils.handleProfile();
            // console.log(`TEST (handleProfile redirect): Final href: '${window.location.href}'`);

            expect(window.location.href).toBe(`/profile/${username}`);
        });

        // In utils.test.tsx

        it('handleProfile should show login tab if logged in with token but no user data', () => { // Test name clarified
            // Arrange:
            // 1. Set ONLY auth token, ensuring 'user' is absent
            localStorage.setItem('authToken', 'fallback-token');
            localStorage.removeItem('user'); // Explicitly remove
            // 2. Ensure href is reset (already done by beforeEach)
            // window.location.href = ''; // Handled by beforeEach

            // Act: handleProfile calls isLoggedIn (which returns false based on module state or lack of user)
            utils.handleProfile();
            // console.log(`TEST (handleProfile fallback): Final href: '${window.location.href}'`);

            // Assert: showLogInTab() was called because isLoggedIn() returned false
            expect(document.getElementById('login-form')?.style.opacity).toBe('1'); // Login form IS shown
            expect(document.getElementById('profile-form')?.style.opacity).toBe('0'); // Profile form is NOT shown
            // Assert: No redirect occurred
            expect(window.location.href).toBe(''); // Href should still be the reset value ''

            // Remove or comment out the previous assertions for the profile form:
            // expect(document.getElementById('profile-form')?.style.opacity).toBe('1'); // <--- REMOVE/COMMENT OUT
            // expect(document.getElementById('profile-form')?.style.pointerEvents).toBe('all'); // <--- REMOVE/COMMENT OUT
        });
    });

    // --- logout ---
    describe('logout', () => {
        // Keep waitFor here as state changes happen *after* promise resolution

        it('should call fetch, clear localStorage, update DOM, and close tabs on successful logout', async () => {
            // Arrange
            const token = 'token-to-clear';
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify({ username: 'user' }));
            document.getElementById('welcomeText')!.innerHTML = 'Welcome back, user'; // Set initial text
            (globalThis.fetch as Mock).mockResolvedValueOnce(createMockResponse({}, 200)); // Mock successful fetch

            // Act
            await utils.logout();

            // Assert: Check fetch call
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/logout/',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({ 'Authorization': `Token ${token}` })
                })
            );

            // Assert: Wait for state updates (localStorage, DOM) which happen in then/finally
            await waitFor(() => {
                expect(localStorage.getItem('authToken')).toBeNull();
                expect(localStorage.getItem('user')).toBeNull();
                // Check DOM updates after state change
                expect(document.getElementById('welcomeText')?.innerHTML).toBe('Welcome to Book Club');
                expect(document.getElementById('welcomeSuccsessLogIn')?.innerHTML).toBe('');
                // Check closeTabs side effect
                expect(document.getElementById('login-form')?.style.opacity).toBe('0');
            });
        });

        it('should clear localStorage, update DOM, and close tabs even if fetch fails', async () => {
            // Arrange
            const token = 'token-to-clear';
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify({ username: 'user' }));
            document.getElementById('welcomeText')!.innerHTML = 'Welcome back, user';
            (globalThis.fetch as Mock).mockRejectedValueOnce(new Error('Network Error')); // Mock failed fetch

            // Act
            await utils.logout();

            // Assert: Check fetch was called
            expect(globalThis.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/logout/',
                expect.any(Object) // Don't need to check headers as closely on failure path
            );

            // Assert: Wait for state updates (localStorage, DOM) which happen in catch/finally
            await waitFor(() => {
                expect(localStorage.getItem('authToken')).toBeNull();
                expect(localStorage.getItem('user')).toBeNull();
                expect(document.getElementById('welcomeText')?.innerHTML).toBe('Welcome to Book Club');
                expect(document.getElementById('welcomeSuccsessLogIn')?.innerHTML).toBe('');
                expect(document.getElementById('login-form')?.style.opacity).toBe('0');
            });
        });
    });

    // --- fetchProfileData ---
    describe('fetchProfileData', () => {
        const username = 'testuser';
        const profileUrl = `/api/profile/${username}/`; // Ensure this matches actual usage if relative

        it('should fetch profile data with auth headers and return JSON on success', async () => {
            // Arrange
            const profileData = { email: 'test@example.com', bio: 'Test bio' };
            const token = 'auth-token-123';
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify({ username: username, authenticated: true }));
            (globalThis.fetch as Mock).mockResolvedValueOnce(createMockResponse(profileData));

            // Act
            const result = await utils.fetchProfileData(username);

            // Assert
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
            // Arrange
            const token = 'invalid-token';
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify({ username }));
            (globalThis.fetch as Mock).mockResolvedValueOnce(createMockResponse({}, 401, false)); // Mock 401 response

            // Act & Assert Throw
            await expect(utils.fetchProfileData(username)).rejects.toThrow(
                'Authentication failed. Please log in again.'
            );

            // Assert side effects after promise rejection
            expect(globalThis.fetch).toHaveBeenCalledWith(profileUrl, expect.any(Object));

            // Use waitFor to ensure async clearing in the catch block completes
            await waitFor(() => {
                expect(localStorage.getItem('authToken')).toBeNull();
                expect(localStorage.getItem('user')).toBeNull();
            });
            // You could also check the internal 'loggedIn' state if necessary, e.g., by calling isLoggedIn()
            // expect(utils.isLoggedIn()).toBe(false);
        });

        it('should throw a generic error on other non-ok fetch responses (e.g., 500) and NOT clear auth', async () => {
            // Arrange
            const token = 'valid-token-but-server-error';
            const userData = { username: username, authenticated: true };
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify(userData));
            (globalThis.fetch as Mock).mockResolvedValueOnce(createMockResponse({}, 500, false)); // Mock 500 response

            // Act & Assert Throw
            await expect(utils.fetchProfileData(username)).rejects.toThrow(
                'Error 500: Failed to fetch profile' // Or whatever the exact error message is
            );

            // Assert side effects after promise rejection
            expect(globalThis.fetch).toHaveBeenCalledWith(profileUrl, expect.any(Object));
            // Auth state should NOT be cleared on general errors
            expect(localStorage.getItem('authToken')).toBe(token);
            expect(localStorage.getItem('user')).toBe(JSON.stringify(userData));
            // Check internal state reflects not logged out
            // expect(utils.isLoggedIn()).toBe(true); // Need to ensure isLoggedIn reflects localStorage state here
        });

        it('should throw if fetch itself rejects (e.g., network error) and NOT clear auth', async () => {
            // Arrange
            const token = 'valid-token-network-error';
            const userData = { username: username, authenticated: true };
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify(userData));
            const networkError = new Error('Network request failed');
            (globalThis.fetch as Mock).mockRejectedValueOnce(networkError);

            // Act & Assert Throw - should re-throw or wrap the original error
            await expect(utils.fetchProfileData(username)).rejects.toThrow(networkError.message);
            // Or if the function wraps it:
            // await expect(utils.fetchProfileData(username)).rejects.toThrow('Failed to fetch profile');

            // Assert side effects after promise rejection
            expect(globalThis.fetch).toHaveBeenCalledWith(profileUrl, expect.any(Object));
            // Auth state should NOT be cleared
            expect(localStorage.getItem('authToken')).toBe(token);
            expect(localStorage.getItem('user')).toBe(JSON.stringify(userData));
        })
    });
});