// src/__tests__/settings.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';

// --- Mock Utilities ---
// Mock the entire utils module ONCE
vi.mock('../utils', async (importActual) => {
    const actual = await importActual<typeof import('../utils')>();
    return {
        ...actual, // Keep non-mocked functions if needed
        // Define mocks for functions used by Settings component
        isLoggedIn: vi.fn(),
        getCurrentUsername: vi.fn(),
        logout: vi.fn(() => { // Mock logout to clear localStorage
            // Simulate logout actions relevant to tests
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
        }),
    };
});
// Import the mocked functions AFTER vi.mock
import { isLoggedIn, getCurrentUsername, logout } from '../utils';

// --- Mock react-router-dom ---
const mockNavigateFn = vi.fn(); // The actual function navigate will call

vi.mock('react-router-dom', async (importActual) => {
    const actual = await importActual<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: vi.fn(() => mockNavigateFn), // Return the mock function
        // Settings component doesn't use useParams
    };
});

// --- Mock Axios ---
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// --- Mock Assets ---
// Mock assets if they are imported directly and cause issues in tests
// vi.mock('../assets/pictures/some-image.png', () => ({ default: 'mock-image.png' }));

// Component to test
import Settings from '../assets/settings'; // Adjust path if necessary
import updateBlockedGenresOnServer from "../assets/settings";
// --- Type Definition ---
interface ProfileData {
    username: string;
    email: string | null;
    date_joined: string;
    last_login?: string | null;
    bio?: string | null;
    location?: string | null;
    birth_date?: string | null;
}

// --- Test Data & Constants ---
const mockUsername = 'settingsUser';
const mockAuthToken = 'settings-test-token';
const mockInitialProfileData: ProfileData = {
    username: mockUsername,
    email: 'settings@example.com',
    date_joined: '2023-01-15T10:00:00Z', // Use fixed dates
    last_login: '2023-10-25T11:00:00Z',
    bio: 'Initial Bio',
    location: 'Initial Location',
    birth_date: '1995-05-15', // Use YYYY-MM-DD format
};
const mockInitialBlockedGenres = ['Horror', 'Biography'];
const mockAvailableGenres = [ // For testing add/block form
    'Drama', 'Romance', 'History', 'Fiction', 'Comedy',
    'Horror', 'Young Adult', 'Biography', 'Economy', 'Custom'
];

// API URLs (Ensure these match component URLs exactly)
const profileApiUrl = `http://127.0.0.1:8000/api/profile/${mockUsername}/`;
const blockedGenresApiUrl = 'http://127.0.0.1:8000/api/blocked-genres/';
const updateUsernameUrl = 'http://127.0.0.1:8000/api/update-username/';
const updatePasswordUrl = 'http://127.0.0.1:8000/api/update-password/';
const updateEmailUrl = 'http://127.0.0.1:8000/api/update-email/';
const deleteAccountUrl = 'http://127.0.0.1:8000/api/delete-account/';
const blockGenresUrl = `http://127.0.0.1:8000/api/block-genres/`;
const unblockGenreUrl = `http://127.0.0.1:8000/api/unblock-genre/`;

// Helper to render with Router context
const renderSettingsComponent = () => render(<Settings />, { wrapper: BrowserRouter });

// --- Test Suite ---
describe('Settings Component', () => {
    let consoleErrorSpy: MockInstance;
    let alertSpy: MockInstance;

    // --- SETUP: Run before each test ---
    beforeEach(() => {
        vi.resetAllMocks(); // Reset all mocks

        // --- Mock utils ---
        vi.mocked(isLoggedIn).mockReturnValue(true);
        vi.mocked(getCurrentUsername).mockReturnValue(mockUsername);
        // logout mock implementation is in vi.mock('../utils', ...)

        // --- Mock localStorage ---
        localStorage.clear();
        vi.spyOn(window.localStorage.__proto__, 'getItem');
        vi.spyOn(window.localStorage.__proto__, 'setItem');
        vi.spyOn(window.localStorage.__proto__, 'removeItem');
        localStorage.setItem('authToken', mockAuthToken);
        localStorage.setItem('user', JSON.stringify({ username: mockUsername }));

        // --- Mock Axios GET calls (Defaults for initial render) ---
        mockedAxios.get.mockImplementation(async (url) => {
            if (url === profileApiUrl) {
                return { data: { ...mockInitialProfileData } };
            }
            if (url === blockedGenresApiUrl) {
                return { data: { blocked_genres: [...mockInitialBlockedGenres] } };
            }
            console.error(`!!!! Unhandled GET request in test beforeEach: ${url}`);
            throw new Error(`axios.get not mocked for URL: ${url}`);
        });
        // --- Default Axios POST/DELETE mocks (can be overridden) ---
        mockedAxios.post.mockResolvedValue({ data: { message: 'Default POST Success' } });
        mockedAxios.delete.mockResolvedValue({ data: { message: 'Default DELETE Success' } });

        // --- Spies ---
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks(); // Restore spies and original module implementations
        localStorage.clear(); // Ensure clean state after
        cleanup(); // Cleanup RTL renders
    });

    // Helper to wait for initial data loading
    const waitForLoad = async () => {
        await waitFor(() => {
            expect(mockedAxios.get).toHaveBeenCalledWith(profileApiUrl, expect.any(Object));
            expect(mockedAxios.get).toHaveBeenCalledWith(blockedGenresApiUrl, expect.any(Object));
        });
        await waitFor(() => expect(screen.queryByText(/loading your settings/i)).not.toBeInTheDocument());
        await screen.findByText(mockInitialProfileData.username); // Wait for username to confirm load
    };


    // --- Initial Load & Basic Rendering ---
    describe('Initial Load & Display', () => {
        it('redirects to home if not logged in', () => {
            vi.mocked(isLoggedIn).mockReturnValue(false);
            localStorage.removeItem('authToken');
            render(<Settings />);
            expect(mockNavigateFn).toHaveBeenCalledWith('/');
            expect(mockedAxios.get).not.toHaveBeenCalled();
        });

        it('shows loading state initially then displays fetched data', async () => {
            // Make fetches take time
            let profilePromise = new Promise<void>(r => setTimeout(r, 10));
            let genrePromise = new Promise<void>(r => setTimeout(r, 15));
            mockedAxios.get.mockImplementation(async (url) => {
                if (url === profileApiUrl) { await profilePromise; return { data: mockInitialProfileData }; }
                if (url === blockedGenresApiUrl) { await genrePromise; return { data: { blocked_genres: mockInitialBlockedGenres } }; }
                throw new Error("Unhandled GET");
            });

            render(<Settings />);
            expect(screen.getByText(/loading your settings/i)).toBeInTheDocument();

            await waitForLoad(); // Use helper

            expect(mockedAxios.get).toHaveBeenCalledWith(profileApiUrl, expect.any(Object));
            expect(mockedAxios.get).toHaveBeenCalledWith(blockedGenresApiUrl, expect.any(Object));

            expect(screen.getByText(mockInitialProfileData.username)).toBeInTheDocument();
            expect(screen.getByText(mockInitialProfileData.email!)).toBeInTheDocument();
            expect(screen.getByText(mockInitialBlockedGenres[0])).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /change username/i })).toBeInTheDocument();
        });

        it('displays error message if profile fetch fails', async () => {
            const profileError = new Error("Simulated profile fetch failure");
            // Override profile fetch mock
            mockedAxios.get.mockImplementation(async (url) => {
                if (url === profileApiUrl) throw profileError;
                if (url === blockedGenresApiUrl) return { data: { blocked_genres: [] } }; // Allow genres
                throw new Error(`Unhandled GET: ${url}`);
            });

            render(<Settings />);

            expect(await screen.findByText(/failed to load your profile data/i)).toBeInTheDocument();
            expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching user data:", profileError);
            expect(screen.queryByText(/loading your settings/i)).not.toBeInTheDocument();
        });

        it('logs an error if blocked genres fetch fails but still renders profile', async () => {
            const genreError = new Error("Simulated genre fetch failure");
            // Mock profile success, genre failure
            mockedAxios.get.mockImplementation(async (url) => {
                if (url === profileApiUrl) return { data: { ...mockInitialProfileData } };
                if (url === blockedGenresApiUrl) throw genreError;
                throw new Error(`Unhandled GET: ${url}`);
            });

            render(<Settings />);

            expect(await screen.findByText(mockInitialProfileData.username)).toBeInTheDocument();

            await waitFor(() => {
                expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching blocked genres:", genreError);
            });

            expect(screen.queryByText(/Error fetching blocked genres/i)).not.toBeInTheDocument();
            expect(screen.getByRole('heading', { name: /Blocked Book Genres/i })).toBeInTheDocument();
            expect(await screen.findByText(/You're not currently blocking any genres./i)).toBeInTheDocument();
        });
    }); // End Initial Load & Display


    // --- Account Management ---
    describe('Account Management Forms', () => {
        // --- Button Names & Labels ---
        const toggleUsernameBtn = /change username/i;
        const togglePasswordBtn = /change password/i;
        const toggleEmailBtn = /change email/i;
        const toggleDeleteBtn = /delete account/i;
        const logoutButtonName = /log out/i;
        const cancelButtonName = /cancel/i;
        const confirmDeleteBtn = /yes, delete my account/i;
        const submitUsernameBtn = /update username/i; // Verified from JSX
        const submitPasswordBtn = /update password/i; // Verified from JSX
        const submitEmailBtn = /update email/i;       // Verified from JSX
        const newUsernameLabel = /new username/i;
        const currentPasswordLabel = /current password/i;
        const newPasswordLabel = /^new password/i;
        const confirmPasswordLabel = /confirm new password/i;
        const newEmailLabel = /new email/i;

        // Helper to open a form section and wait for it
        const openForm = async (toggleButtonName: RegExp, expectedLabel?: RegExp) => {
            const user = userEvent.setup();
            // Ensure component is loaded before trying to find button
            await screen.findByText(mockInitialProfileData.username);
            const toggleButton = await screen.findByRole('button', { name: toggleButtonName });
            await user.click(toggleButton);
            if (expectedLabel) {
                await screen.findByLabelText(expectedLabel); // Wait for form input
            } else {
                // If no label, wait for Cancel button as indicator form is open
                await screen.findByRole('button', { name: cancelButtonName });
            }
            return user;
        };


        // --- Logout Action ---
        describe('Logout Action', () => {
            it('calls logout util and navigates home when logout button is clicked', async () => {
                const user = userEvent.setup();
                render(<Settings />);
                await waitForLoad();

                const logoutButton = screen.getByRole('button', { name: logoutButtonName });
                await user.click(logoutButton);

                expect(logout).toHaveBeenCalledTimes(1);
                expect(localStorage.getItem('authToken')).toBeNull();
                expect(localStorage.getItem('user')).toBeNull();
                expect(mockNavigateFn).toHaveBeenCalledTimes(1);
                expect(mockNavigateFn).toHaveBeenCalledWith('/');
            });
        }); // End Logout Action

        // --- TODO: Add FULL describe blocks for Change Password API calls, Change Email, Delete Account ---

    }); // End Account Management describe block


    test('shows error if new username is empty when submitting', async () => {
        const { container } = render(<Settings />);

        // Find and click the button that toggles the form visibility (e.g., "Change Username")
        const changeUsernameButton = await screen.findByRole('button', { name: /change username/i });
        fireEvent.click(changeUsernameButton);

        // Use the container to get the form element by tag name
        const formElement = container.querySelector('form');

        // Type guard to ensure formElement is not null
        if (formElement) {
            // Find the input field for "New Username"
            const usernameInput = screen.getByLabelText(/new username/i);
            expect(usernameInput).toBeInTheDocument();

            // Submit the form with an empty username
            fireEvent.submit(formElement);

            // Use getAllByText to handle multiple matches
            const errorMessages = screen.getAllByText(/username cannot be empty/i);
            expect(errorMessages.length).toBeGreaterThan(0); // At least one error message should appear
        } else {
            // Handle the case when formElement is not found
            throw new Error('Form element not found');
        }
    });

    test('shows error if new password and confirm password do not match', async () => {
        const { container } = render(<Settings />);

        // Find and click the button that toggles the form visibility (e.g., "Change Password")
        const changePasswordButton = await screen.findByRole('button', { name: /change password/i });
        fireEvent.click(changePasswordButton);

        // Use the container to get the form element by tag name
        const formElement = container.querySelector('form');

        // Type guard to ensure formElement is not null
        if (formElement) {
            // Use regular expressions to match labels starting with specific text
            const currentPasswordInput = screen.getByLabelText(/current password/i);
            const newPasswordInput = screen.getByLabelText(/^new password/i);  // Matches any label starting with "New Password"
            const confirmPasswordInput = screen.getByLabelText(/^confirm new password/i);  // Matches any label starting with "Confirm New Password"

            // Ensure all inputs are in the document
            expect(currentPasswordInput).toBeInTheDocument();
            expect(newPasswordInput).toBeInTheDocument();
            expect(confirmPasswordInput).toBeInTheDocument();

            // Submit the form with mismatched passwords
            fireEvent.change(currentPasswordInput, { target: { value: 'currentPassword123' } });
            fireEvent.change(newPasswordInput, { target: { value: 'newPassword123' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'differentPassword123' } });
            fireEvent.submit(formElement);

            // Check if the error message for "New passwords do not match" is shown
            const errorMessage = await screen.findByText(/new passwords do not match/i);
            expect(errorMessage).toBeInTheDocument(); // Ensure the error message appears
        } else {
            throw new Error('Form element not found');
        }
    });

    it('successfully updates the username and logs out after showing success message', async () => {
        // Arrange: Set up localStorage and mock API response
        localStorage.setItem('authToken', mockAuthToken);
        localStorage.setItem('user', JSON.stringify({ username: mockUsername }));
        mockedAxios.post.mockResolvedValueOnce({ data: { message: 'Username updated' } });

        // Render component
        const { container } = render(
            <BrowserRouter>
                <Settings />
            </BrowserRouter>
        );

        // Click "Change Username" button to open form
        const changeUsernameBtn = await screen.findByRole('button', { name: /change username/i });
        fireEvent.click(changeUsernameBtn);

        // Safely find the form element
        const formElement = container.querySelector('form');
        if (!formElement) throw new Error('Form element not found');

        // Fill in the username field
        const usernameInput = screen.getByLabelText(/new username/i);
        expect(usernameInput).toBeInTheDocument();
        await userEvent.clear(usernameInput);
        await userEvent.type(usernameInput, 'updatedUser123');

        // Submit the form
        fireEvent.submit(formElement);

        // Assert: success message appears
        await waitFor(() => {
            expect(screen.getByText(/username updated successfully/i)).toBeInTheDocument();
        });

        // Assert: localStorage is updated
        const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
        expect(updatedUser.username).toBe('updatedUser123');

        // Assert: logout and navigate triggered after timeout
        await waitFor(() => {
            expect(logout).toHaveBeenCalled();
            expect(mockNavigateFn).toHaveBeenCalledWith('/');
        }, { timeout: 4000 });
    });

    it('displays error message if API fails during username update', async () => {
        // Arrange: Set up localStorage and mock rejected API response
        localStorage.setItem('authToken', mockAuthToken);
        localStorage.setItem('user', JSON.stringify({ username: mockUsername }));

        // Mock API error
        mockedAxios.post.mockRejectedValueOnce({
            response: {
                data: { error: 'Username already taken' },
            },
        });

        // Render component
        const { container } = render(
            <BrowserRouter>
                <Settings />
            </BrowserRouter>
        );

        // Click to open the username change form
        const changeUsernameBtn = await screen.findByRole('button', { name: /change username/i });
        fireEvent.click(changeUsernameBtn);

        // Get the form and fill it out
        const formElement = container.querySelector('form');
        if (!formElement) throw new Error('Form element not found');

        const usernameInput = screen.getByLabelText(/new username/i);
        await userEvent.clear(usernameInput);
        await userEvent.type(usernameInput, 'takenUsername');

        // Submit the form
        fireEvent.submit(formElement);

        // Assert: error message appears from API response
        await waitFor(() => {
            expect(screen.getByText(/username already taken/i)).toBeInTheDocument();
        });
    });

    it('successfully updates password and logs out after showing success message', async () => {
        // Arrange localStorage
        localStorage.setItem('authToken', mockAuthToken);
        localStorage.setItem('user', JSON.stringify({ username: mockUsername }));

        // Mock successful response
        mockedAxios.post.mockResolvedValueOnce({ data: { message: 'Password updated' } });

        // Render component
        render(
            <BrowserRouter>
                <Settings />
            </BrowserRouter>
        );

        // Click button to reveal password form
        const changePasswordBtn = await screen.findByRole('button', { name: /change password/i });
        await userEvent.click(changePasswordBtn);

        // Fill out fields
        const currentPasswordInput = screen.getByLabelText(/^current password/i);
        const newPasswordInput = screen.getByLabelText(/^new password/i);
        const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

        await userEvent.type(currentPasswordInput, 'oldPass123!');
        await userEvent.type(newPasswordInput, 'newPass456!');
        await userEvent.type(confirmPasswordInput, 'newPass456!');

        // Submit form
        const saveButton = screen.getByRole('button', { name: /Update Password/i });
        await userEvent.click(saveButton);

        // Assert success message appears
        await waitFor(() => {
            expect(screen.getByText(/password updated successfully/i)).toBeInTheDocument();
        });

        // Assert logout and redirection after timeout
        await waitFor(() => {
            expect(logout).toHaveBeenCalled();
            expect(mockNavigateFn).toHaveBeenCalledWith('/');
        }, { timeout: 4000 });
    });

    it('displays error if current password is missing when submitting password form', async () => {
        const { container } = render(
            <BrowserRouter>
                <Settings />
            </BrowserRouter>
        );

        // Open the password change form
        const changePasswordBtn = await screen.findByRole('button', { name: /change password/i });
        fireEvent.click(changePasswordBtn);

        const formElement = container.querySelector('form');
        if (!formElement) throw new Error('Form element not found');

        // Fill only new and confirm password
        const newPasswordInput = screen.getByLabelText(/^new password/i);
        const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

        await userEvent.type(newPasswordInput, 'newPass123!');
        await userEvent.type(confirmPasswordInput, 'newPass123!');

        // Submit the form
        fireEvent.submit(formElement);

        // Expect: validation error appears
        await waitFor(() => {
            expect(screen.getByText(/current password is required/i)).toBeInTheDocument();
        });
    });


    it('displays error if new password or confirmation is missing', async () => {
        const { container } = render(
            <BrowserRouter>
                <Settings />
            </BrowserRouter>
        );

        // Open the password change form
        const changePasswordBtn = await screen.findByRole('button', { name: /change password/i });
        fireEvent.click(changePasswordBtn);

        const formElement = container.querySelector('form');
        if (!formElement) throw new Error('Form element not found');

        // Fill only current password
        const currentPasswordInput = screen.getByLabelText(/^current password/i);
        await userEvent.type(currentPasswordInput, 'oldPass123!');

        // Submit the form without new/confirm password
        fireEvent.submit(formElement);

        // Expect: validation error appears
        await waitFor(() => {
            expect(screen.getByText(/new password and confirmation are required/i)).toBeInTheDocument();
        });
    });

    it('shows error if new email is empty and handles successful email update with logout', async () => {
        // Arrange: Mock localStorage and API
        const { container } = render(
            <BrowserRouter>
                <Settings />
            </BrowserRouter>
        );

        localStorage.setItem('authToken', mockAuthToken);
        localStorage.setItem('user', JSON.stringify({ ...mockInitialProfileData }));

        // Open the email change form
        const changeEmailButton = await screen.findByRole('button', { name: /change email/i });
        fireEvent.click(changeEmailButton);

        const formElement = container.querySelector('form');
        if (!formElement) throw new Error('Form element not found');

        // ---- EMPTY FIELD VALIDATION ----
        const emailInput = screen.getByLabelText(/new email/i);
        expect(emailInput).toBeInTheDocument();

        // Leave email input blank and submit
        await userEvent.clear(emailInput);
        fireEvent.submit(formElement);

        const errorMessages = await screen.findAllByText(/email cannot be empty/i);
        expect(errorMessages.length).toBeGreaterThan(0);

        // ---- SUCCESSFUL SUBMISSION ----
        const updatedEmail = 'newemail@example.com';
        mockedAxios.post.mockResolvedValueOnce({ data: { message: 'Email updated' } });

        await userEvent.type(emailInput, updatedEmail);
        fireEvent.submit(formElement);

        await waitFor(() => {
            expect(screen.getByText(/email updated successfully/i)).toBeInTheDocument();
        });

        const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
        expect(updatedUser.email).toBe(updatedEmail);

        // Check logout and navigation after timeout
        await waitFor(() => {
            expect(logout).toHaveBeenCalled();
            expect(mockNavigateFn).toHaveBeenCalledWith('/');
        }, { timeout: 4000 });
    });

    it('successfully deletes the account and redirects to home with message', async () => {
        // Arrange: Set up localStorage and mock axios delete
        localStorage.setItem('authToken', mockAuthToken);
        localStorage.setItem('user', JSON.stringify(mockInitialProfileData));

        mockedAxios.delete.mockResolvedValueOnce({ data: { message: 'Account deleted' } });

        render(
            <BrowserRouter>
                <Settings />
            </BrowserRouter>
        );

        // Click the delete account button
        const deleteBtn = await screen.findByRole('button', { name: /delete account/i });
        userEvent.click(deleteBtn);

        // Wait for the confirmation button to appear
        const confirmDeleteBtn = await screen.findByRole('button', { name: /yes, delete my account/i });

        // Click the confirmation button to proceed with account deletion
        userEvent.click(confirmDeleteBtn);

        // Assert: API was called with the correct token
        await waitFor(() => {
            expect(mockedAxios.delete).toHaveBeenCalledWith(
                'http://127.0.0.1:8000/api/delete-account/',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: `Token ${mockAuthToken}`
                    })
                })
            );
        });

        // Assert: localStorage cleared and redirect triggered
        expect(localStorage.getItem('user')).toBeNull();
        expect(localStorage.getItem('authToken')).toBeNull();
        expect(mockNavigateFn).toHaveBeenCalledWith('/', {
            state: { message: 'Your account has been successfully deleted' }
        });
    });

    test('disables submit button if no genre is selected', async () => {
        const { container } = render(<Settings />);

        // Reveal the "Block Genre" form (this part depends on your component logic—adjust if needed)
        const toggleGenreFormButton = await screen.findByRole('button', { name: /block additional genres/i });
        fireEvent.click(toggleGenreFormButton);

        // Ensure the form is in the document
        const formElement = container.querySelector('form');
        expect(formElement).toBeInTheDocument();

        // Find the select input for genre
        const genreSelect = screen.getByLabelText(/select genre to block/i);
        expect(genreSelect).toBeInTheDocument();

        // Ensure default option is selected
        expect((genreSelect as HTMLSelectElement).value).toBe('');

        // Find the submit button
        const submitButton = screen.getByRole('button', { name: /block genre/i });

        // Check if the button is disabled due to no genre selected
        expect(submitButton).toBeDisabled();
    });

    test('adds a selected genre and shows success message', async () => {
        const { container } = render(<Settings />);

        // Step 1: Reveal the Block Genre form
        const toggleFormButton = await screen.findByRole('button', { name: /block additional genres/i });
        fireEvent.click(toggleFormButton);

        // Step 2: Get the form and the genre select input
        const formElement = container.querySelector('form');
        expect(formElement).toBeInTheDocument();

        const genreSelect = screen.getByLabelText(/select genre to block/i);
        expect(genreSelect).toBeInTheDocument();

        // Step 3: Select a genre (assumes "Romance" is available)
        fireEvent.change(genreSelect, { target: { value: 'Romance' } });
        expect((genreSelect as HTMLSelectElement).value).toBe('Romance');

        // Step 4: Submit the form
        fireEvent.submit(formElement!);

        // Step 5: Wait for success message to appear
        const successMessage = await screen.findByText(/successfully blocked "Romance" genre/i);
        expect(successMessage).toBeInTheDocument();
    });
    test('removes a blocked genre and shows success message', async () => {
        // Optional: Set up mock localStorage
        localStorage.setItem('authToken', 'fake-token');

        render(<Settings />);

        // Step 1: Find the list item for the genre (e.g., "Horror")
        const horrorTag = await screen.findByText('Horror');
        const genreTagItem = horrorTag.closest('li');
        expect(genreTagItem).toBeInTheDocument();

        // Step 2: Within that <li>, find and click the remove button
        const removeBtn = within(genreTagItem!).getByTitle('Remove genre');
        fireEvent.click(removeBtn);

        // Step 3: Wait for the genre to be removed from the DOM
        await waitFor(() => {
            expect(screen.queryByText('Horror')).not.toBeInTheDocument();
        });

        // Step 4: Check for success message
        const successMessage = await screen.findByText(/successfully unblocked "horror" genre/i);
        expect(successMessage).toBeInTheDocument();
    });

    test('adds a custom blocked genre and shows success message', async () => {
        render(<Settings />);

        // Step 1: Open the "Block Additional Genres" form
        const toggleFormBtn = await screen.findByRole('button', { name: /block additional genres/i });
        fireEvent.click(toggleFormBtn);

        // Step 2: Select "Custom" from the dropdown
        const selectElement = screen.getByLabelText(/select genre to block/i);
        fireEvent.change(selectElement, { target: { value: 'Custom' } });

        // Step 3: Fill in the custom genre input
        const customInput = await screen.findByPlaceholderText(/enter a custom genre name/i);
        fireEvent.change(customInput, { target: { value: 'Dark Fantasy' } });

        // Step 4: Submit the form
        const submitBtn = screen.getByRole('button', { name: /block genre/i });
        fireEvent.click(submitBtn);

        // Step 5: Wait for the genre to appear in the blocked list
        await waitFor(() => {
            expect(screen.getByText('Dark Fantasy')).toBeInTheDocument();
        });

        // Step 6: Check for the success message
        const successMessage = screen.getByText(/successfully blocked "dark fantasy" genre/i);
        expect(successMessage).toBeInTheDocument();
    });

    test('navigates to home when "Return to Home" button is clicked', async () => {
        const mockNavigate = vi.fn();

        vi.mock('react-router-dom', async () => {
            const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
            return {
                ...actual,
                useNavigate: () => mockNavigateFn,
            };
        });

        const { container } = render(<Settings />);

        const returnHomeButton = await screen.findByRole('button', { name: /return to home/i });
        expect(returnHomeButton).toBeInTheDocument();

        fireEvent.click(returnHomeButton);

        expect(mockNavigateFn).toHaveBeenCalledWith('/');
    });

    test('shows error message when password update fails', async () => {
        render(<Settings />);

        // Open the password change form (assuming it's initially hidden)
        const changePasswordButton = await screen.findByRole('button', { name: /change password/i });
        fireEvent.click(changePasswordButton);

        // Fill in form inputs with incorrect values
        fireEvent.change(screen.getByLabelText(/current password/i), {
            target: { value: 'wrong-current-password' },
        });
        fireEvent.change(screen.getByLabelText(/^new password/i), {
            target: { value: 'newSecurePass123' },
        });
        fireEvent.change(screen.getByLabelText(/confirm new password/i), {
            target: { value: 'newSecurePass123' },
        });

        // Simulate API failure
        mockedAxios.post.mockRejectedValueOnce({
            response: {
                data: {
                    error: 'Current password is incorrect',
                },
            },
        });

        // Submit form
        fireEvent.click(screen.getByRole('button', { name: /update password/i }));

        // Expect the error message to appear in the form
        await waitFor(() => {
            expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument();
        });
    });

    test('shows custom error message when email update fails with error response from API', async () => {
        // Render the Settings component
        render(<Settings />);
      
        // Open the email change form (assuming it's initially hidden)
        const changeEmailButton = await screen.findByRole('button', { name: /change email/i });
        fireEvent.click(changeEmailButton);
      
        // Fill in form inputs
        fireEvent.change(screen.getByLabelText(/new email/i), {
          target: { value: 'invalid-email@example.com' },
        });
      
        // Simulate API failure with a custom error message
        mockedAxios.post.mockRejectedValueOnce({
          response: {
            data: {
              error: 'Custom error: Invalid email format', // Simulated custom error message from API
            },
          },
        });
      
        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: /update email/i }));
      
        // Wait for the error message to appear and assert that the error message is displayed
        await waitFor(() => {
          expect(screen.getByText(/custom error: invalid email format/i)).toBeInTheDocument();
        });
      });
      
      test('shows error message when account deletion fails', async () => {
        render(<Settings />);
      
        // Wait for the settings page to finish loading
        await screen.findByText(/account settings/i); // or any other visible loaded element
      
        // Step 1: Click the first "Delete Account" button
        const initialDeleteBtn = screen.getByRole('button', { name: /delete account/i });
        fireEvent.click(initialDeleteBtn);
      
        // Step 2: Mock the failed delete request
        mockedAxios.delete.mockRejectedValueOnce({
          response: { data: { error: 'Account deletion failed due to server error' } },
        });
      
        // Step 3: Confirm deletion
        const confirmDeleteBtn = screen.getByRole('button', { name: /yes, delete my account/i });
        fireEvent.click(confirmDeleteBtn);
      
        // Step 4: Expect error message to appear
        await waitFor(() => {
          expect(screen.getByText(/account deletion failed due to server error/i)).toBeInTheDocument();
        });
      });
      
      it('logs an error when unblocking a genre fails', async () => {
        mockedAxios.get.mockResolvedValueOnce({
          data: {
            blocked_genres: ['Horror', 'Biography'],
            available_genres: [],
          },
        });
      
        mockedAxios.post.mockRejectedValueOnce(new Error('Server error'));
      
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
        render(<Settings />);
      
        await screen.findByText("You're currently blocking these genres:");
      
        const removeButtons = screen.getAllByRole('button', { name: /remove/i });
        expect(removeButtons.length).toBeGreaterThan(0);
      
        await userEvent.click(removeButtons[0]);
      
        await waitFor(() => {
          expect(consoleSpy).toHaveBeenCalledWith(
            'Error unblocking genre:',
            expect.any(Error)
          );
        });
      
        consoleSpy.mockRestore();
      });

     
    
      
    
}); // End Settings Component describe block