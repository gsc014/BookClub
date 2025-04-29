// src/__tests__/settings.test.tsx (or .jsx)

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mocked, MockInstance } from 'vitest';
import axios, { AxiosStatic } from 'axios';
import { useNavigate } from 'react-router-dom';

// Component to test
import Settings from '../assets/settings'; // Adjust path if necessary

// Mock utils
import { isLoggedIn, getCurrentUsername, logout } from '../utils';

// --- Mocks ---
vi.mock('axios');
const mockedAxios = axios as Mocked<AxiosStatic>;

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock utils module
vi.mock('../utils', () => ({
    isLoggedIn: vi.fn(),
    getCurrentUsername: vi.fn(),
    logout: vi.fn(),
}));
// --- Type Definition ---
interface ProfileData {
    username: string;
    email: string | null;
    date_joined: string;
    last_login?: string | null; // Make optional as not used everywhere
    bio?: string | null;
    location?: string | null;
    birth_date?: string | null;
    blocked_genres?: string[] | null;
}

// --- Test Data & Constants ---
const mockUsername = 'settingsUser';
const mockInitialProfileData: ProfileData = {
    username: mockUsername,
    email: 'settings@example.com',
    date_joined: new Date('2023-02-01T10:00:00Z').toISOString(),
    blocked_genres: ['Horror', 'Self-Help'],
};
const mockInitialUserLocalStorage = { username: mockUsername, email: 'settings@example.com' };
const mockAuthToken = 'settings-test-token';
const profileUrl = `http://127.0.0.1:8000/api/user_profile/${mockUsername}/`;
const updateUsernameUrl = 'http://127.0.0.1:8000/api/update-username/';
const updatePasswordUrl = 'http://127.0.0.1:8000/api/update-password/';
const updateEmailUrl = 'http://127.0.0.1:8000/api/update-email/';
const deleteAccountUrl = 'http://127.0.0.1:8000/api/delete-account/';
const updatePreferencesUrl = 'http://127.0.0.1:8000/api/update-preferences/';

// --- Test Suite ---
describe('Settings Component', () => {
    let mockLocalStorageStore: Record<string, string>; // In-memory store for localStorage mock

     // Helper to setup default mocks before each test
     const setupMocks = (profileData: ProfileData | null = mockInitialProfileData) => {
        vi.mocked(isLoggedIn).mockReturnValue(true);
        vi.mocked(getCurrentUsername).mockReturnValue(mockUsername);
        // Use the mock localStorage implementation set in beforeEach
        localStorage.setItem('authToken', mockAuthToken);
        localStorage.setItem('user', JSON.stringify(mockInitialUserLocalStorage));
        localStorage.setItem('blockedGenres', JSON.stringify(profileData?.blocked_genres || []));

        // Mock Axios GET for profile data
        mockedAxios.get.mockImplementation(async (url) => {
            if (url === profileUrl) {
                 if (profileData) {
                     return { data: { ...profileData } };
                 } else {
                     throw new Error("Simulated fetch failure");
                 }
            }
            throw new Error(`Unhandled GET in test: ${url}`);
        });
        // Default successful POST/DELETE, clear before each test potentially overrides
        mockedAxios.post.mockResolvedValue({ data: { message: 'Success' } });
        mockedAxios.delete.mockResolvedValue({ data: { message: 'Deleted' } });
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock localStorage directly for this suite
        mockLocalStorageStore = {}; // Reset store
        vi.stubGlobal('localStorage', {
            setItem: vi.fn((key, value) => { mockLocalStorageStore[key] = String(value); }),
            getItem: vi.fn((key) => mockLocalStorageStore[key] || null),
            removeItem: vi.fn((key) => { delete mockLocalStorageStore[key]; }),
            clear: vi.fn(() => { mockLocalStorageStore = {}; }),
            // Add length and key(index) if needed, though usually not for basic mocks
            length: 0, // You might need to update this dynamically if component uses it
            key: vi.fn((index: number) => null)
        });

        // Apply default mocks using the helper
        setupMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals(); // Restore original localStorage
    });

     // Helper to wait for initial data loading
     const waitForLoad = async () => {
        await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledWith(profileUrl, expect.anything()));
        await waitFor(() => expect(screen.queryByText(/loading your settings/i)).not.toBeInTheDocument());
   };


    // --- Initial Load & Basic Rendering ---
    describe('Initial Load & Display', () => {
        it('redirects to home if not logged in', () => {
            vi.mocked(isLoggedIn).mockReturnValue(false);
            localStorage.removeItem('authToken'); // Use mock removeItem
            render(<Settings />);
            expect(mockNavigate).toHaveBeenCalledWith('/');
            expect(mockedAxios.get).not.toHaveBeenCalled();
        });

        it('shows loading state initially', async () => {
            mockedAxios.get.mockImplementation(() => new Promise(() => {}));
            render(<Settings />);
            expect(screen.getByText(/loading your settings/i)).toBeInTheDocument();
            // Verify fetch attempt started after component mount
            await waitFor(() => {
                expect(mockedAxios.get).toHaveBeenCalledWith(profileUrl, expect.anything());
            });
        });

        it('displays fetched user info and initial settings sections', async () => {
            render(<Settings />);
            await waitForLoad();
            // Check basic info
            expect(screen.getByText(`Username:`)).toBeInTheDocument();
            expect(screen.getByText(mockInitialProfileData.username)).toBeInTheDocument();
            expect(screen.getByText(`Email:`)).toBeInTheDocument();
            expect(screen.getByText(mockInitialProfileData.email!)).toBeInTheDocument();
            expect(screen.getByText(`Member Since:`)).toBeInTheDocument();
            expect(screen.getByText(new Date(mockInitialProfileData.date_joined).toLocaleDateString())).toBeInTheDocument();
            // Check section headers and initial button states
            expect(screen.getByRole('heading', { name: /account management/i })).toBeInTheDocument();
            // ... check other elements ...
        });

         it('displays initial blocked genres', async () => {
             render(<Settings />);
             await waitForLoad();
             const horrorTag = screen.getByText('Horror');
             const selfHelpTag = screen.getByText('Self-Help');
             expect(horrorTag).toBeInTheDocument();
             expect(within(horrorTag.closest('li')!).getByTitle(/remove genre/i)).toBeInTheDocument();
             expect(selfHelpTag).toBeInTheDocument();
              expect(within(selfHelpTag.closest('li')!).getByTitle(/remove genre/i)).toBeInTheDocument();
         });

        it('handles error during initial data fetch and reads localStorage genres', async () => {
             const fallbackGenres = ['Old', 'Genres From Storage'];
             // Set localStorage BEFORE mocking the rejection
             localStorage.setItem('blockedGenres', JSON.stringify(fallbackGenres));
             // Mock GET to reject
             mockedAxios.get.mockImplementation(async (url) => {
                   if (url === profileUrl) { throw new Error('API Down'); }
                   throw new Error(`Unhandled GET: ${url}`);
               });

             render(<Settings />);
             expect(await screen.findByText(/failed to load your profile data/i)).toBeInTheDocument();
             // Check that blockedGenres state reflects the fallback localStorage value
             await waitFor(() => {
                 expect(screen.getByText(fallbackGenres[0])).toBeInTheDocument();
                 expect(screen.getByText(fallbackGenres[1])).toBeInTheDocument();
             });
             expect(screen.queryByText('Horror')).not.toBeInTheDocument(); // Ensure initial mock wasn't used
         });
    });


    // --- Account Management Forms ---
    describe('Account Management Forms', () => {
        const usernameButtonName = /change username/i;
        const passwordButtonName = /change password/i;
        const emailButtonName = /change email/i;
        const deleteButtonName = /delete account/i;
        const cancelButtonName = /cancel/i;
        const confirmDeleteButtonName = /yes, delete my account/i;
        const newUsernameLabel = /new username/i;
        const currentPasswordLabel = /current password/i;
        const newPasswordLabel = /^new password:$/i;
        const confirmPasswordLabel = /confirm new password/i;
        const newEmailLabel = /new email/i;


        beforeEach(() => { setupMocks(); });

        it('toggles username form correctly', async () => {
            render(<Settings />);
            await waitForLoad();
            const toggleButton = screen.getByRole('button', { name: usernameButtonName });
            fireEvent.click(toggleButton);
            expect(await screen.findByLabelText(newUsernameLabel)).toBeInTheDocument();
            expect(toggleButton).toHaveTextContent(cancelButtonName);
            fireEvent.click(toggleButton);
            expect(screen.queryByLabelText(newUsernameLabel)).not.toBeInTheDocument();
            expect(toggleButton).toHaveTextContent(usernameButtonName);
         });

        it('toggles password form correctly', async () => {
            render(<Settings />);
            await waitForLoad();
            const toggleButton = screen.getByRole('button', { name: passwordButtonName });
            fireEvent.click(toggleButton);
            expect(await screen.findByLabelText(currentPasswordLabel)).toBeInTheDocument();
            expect(toggleButton).toHaveTextContent(cancelButtonName);
            fireEvent.click(toggleButton);
            expect(screen.queryByLabelText(currentPasswordLabel)).not.toBeInTheDocument();
            expect(toggleButton).toHaveTextContent(passwordButtonName);
         });

        it('ensures only one account form is open at a time', async () => {
             render(<Settings />);
             await waitForLoad();
             const usernameButton = screen.getByRole('button', { name: usernameButtonName });
             const passwordButton = screen.getByRole('button', { name: passwordButtonName });
             fireEvent.click(usernameButton);
             expect(await screen.findByLabelText(newUsernameLabel)).toBeInTheDocument();
             expect(screen.queryByLabelText(currentPasswordLabel)).not.toBeInTheDocument();
             fireEvent.click(passwordButton);
             expect(await screen.findByLabelText(currentPasswordLabel)).toBeInTheDocument();
             expect(screen.queryByLabelText(newUsernameLabel)).not.toBeInTheDocument();
         });

        // --- Username Change ---
        it('updates username successfully and shows success message', async () => {
            const newUsername = 'newUser123';
            mockedAxios.post.mockResolvedValueOnce({ data: { message: 'Username updated' } });
            render(<Settings />);
            await waitForLoad();
            fireEvent.click(screen.getByRole('button', { name: usernameButtonName }));
            const input = await screen.findByLabelText(newUsernameLabel);
            const submitButton = screen.getByRole('button', { name: /update username/i });
            fireEvent.change(input, { target: { value: newUsername } });
            fireEvent.click(submitButton);
            await waitFor(() => { expect(mockedAxios.post).toHaveBeenCalledTimes(1); });
            expect(mockedAxios.post).toHaveBeenCalledWith(
                updateUsernameUrl,
                { new_username: newUsername },
                expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Token ${mockAuthToken}` }) })
            );
            expect(await screen.findByText(/username updated successfully/i)).toBeInTheDocument();
            expect(mockLocalStorageStore['user']).toBe(JSON.stringify({ ...mockInitialUserLocalStorage, username: newUsername }));
        });

         it('shows error if username update fails', async () => {
            const errorMsg = 'Username already taken';
            mockedAxios.post.mockRejectedValueOnce({ response: { data: { error: errorMsg } } });
            render(<Settings />);
            await waitForLoad();
            fireEvent.click(screen.getByRole('button', { name: usernameButtonName }));
            const input = await screen.findByLabelText(newUsernameLabel);
            const submitButton = screen.getByRole('button', { name: /update username/i });
            fireEvent.change(input, { target: { value: 'takenUser' } });
            fireEvent.click(submitButton);
            expect(await screen.findByText(errorMsg)).toBeInTheDocument();
            expect(logout).not.toHaveBeenCalled();
            expect(mockNavigate).not.toHaveBeenCalledWith('/');
         });

        // --- Password Change ---
         it('updates password successfully', async () => {
             mockedAxios.post.mockResolvedValueOnce({ data: { message: 'Password updated' } });
             render(<Settings />);
             await waitForLoad();
             fireEvent.click(screen.getByRole('button', { name: passwordButtonName }));
             const currentPass = await screen.findByLabelText(currentPasswordLabel);
             const newPass = screen.getByLabelText(newPasswordLabel);
             const confirmPass = screen.getByLabelText(confirmPasswordLabel);
             const submitButton = screen.getByRole('button', { name: /update password/i });
             fireEvent.change(currentPass, { target: { value: 'oldPassword' } });
             fireEvent.change(newPass, { target: { value: 'newSecurePassword' } });
             fireEvent.change(confirmPass, { target: { value: 'newSecurePassword' } });
             fireEvent.click(submitButton);
             await waitFor(() => { expect(mockedAxios.post).toHaveBeenCalledTimes(1); });
             expect(mockedAxios.post).toHaveBeenCalledWith(
                 updatePasswordUrl,
                 { current_password: 'oldPassword', new_password: 'newSecurePassword' },
                 expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Token ${mockAuthToken}` }) })
             );
             expect(await screen.findByText(/password updated successfully/i)).toBeInTheDocument();
         });

         it('shows error if passwords do not match', async () => {
              render(<Settings />);
              await waitForLoad();
              fireEvent.click(screen.getByRole('button', { name: passwordButtonName }));
              const currentPass = await screen.findByLabelText(currentPasswordLabel);
              const newPass = screen.getByLabelText(newPasswordLabel);
              const confirmPass = screen.getByLabelText(confirmPasswordLabel);
              const submitButton = screen.getByRole('button', { name: /update password/i });
              fireEvent.change(currentPass, { target: { value: 'oldPassword' } });
              fireEvent.change(newPass, { target: { value: 'newPass1' } });
              fireEvent.change(confirmPass, { target: { value: 'newPass2' } });
              fireEvent.click(submitButton);
              expect(await screen.findByText(/new passwords do not match/i)).toBeInTheDocument();
              expect(mockedAxios.post).not.toHaveBeenCalled();
          });

          // --- Email Change ---
         it('updates email successfully', async () => {
             const newEmail = 'new@example.com';
             mockedAxios.post.mockResolvedValueOnce({ data: { message: 'Email updated' } });
             render(<Settings />);
             await waitForLoad();
             fireEvent.click(screen.getByRole('button', { name: emailButtonName }));
             const input = await screen.findByLabelText(newEmailLabel);
             const submitButton = screen.getByRole('button', { name: /update email/i });
             fireEvent.change(input, { target: { value: newEmail } });
             fireEvent.click(submitButton);
             await waitFor(() => { expect(mockedAxios.post).toHaveBeenCalledTimes(1); });
             expect(mockedAxios.post).toHaveBeenCalledWith(
                 updateEmailUrl,
                 { new_email: newEmail },
                 expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Token ${mockAuthToken}` }) })
             );
             expect(await screen.findByText(/email updated successfully/i)).toBeInTheDocument();
             expect(mockLocalStorageStore['user']).toBe(JSON.stringify({ ...mockInitialUserLocalStorage, email: newEmail }));
         });

        // --- Delete Account ---
        it('deletes account successfully', async () => {
            mockedAxios.delete.mockResolvedValueOnce({ data: { message: 'Account deleted' } });
            render(<Settings />);
            await waitForLoad();
            fireEvent.click(screen.getByRole('button', { name: deleteButtonName }));
            const confirmButton = await screen.findByRole('button', { name: confirmDeleteButtonName });
            expect(screen.getByText(/warning: this action cannot be undone/i)).toBeInTheDocument();
            fireEvent.click(confirmButton);
            await waitFor(() => { expect(mockedAxios.delete).toHaveBeenCalledTimes(1); });
            expect(mockedAxios.delete).toHaveBeenCalledWith(
                 deleteAccountUrl,
                 expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Token ${mockAuthToken}` }) })
             );
            expect(mockLocalStorageStore['user']).toBeUndefined();
            expect(mockLocalStorageStore['authToken']).toBeUndefined();
            expect(mockNavigate).toHaveBeenCalledWith('/', { state: { message: 'Your account has been successfully deleted' } });
        });

         it('shows error if account deletion fails', async () => {
             const errorMsg = 'Deletion forbidden';
             mockedAxios.delete.mockRejectedValueOnce({ response: { data: { error: errorMsg } } });
             render(<Settings />);
             await waitForLoad();
             fireEvent.click(screen.getByRole('button', { name: deleteButtonName }));
             const confirmButton = await screen.findByRole('button', { name: confirmDeleteButtonName });
             fireEvent.click(confirmButton);
             await waitFor(() => { expect(mockedAxios.delete).toHaveBeenCalledTimes(1); });
             expect(await screen.findByText(errorMsg)).toBeInTheDocument();
             expect(mockNavigate).not.toHaveBeenCalledWith('/');
         });
    });


     // --- Genre Preferences ---
     describe('Genre Preferences', () => {
          const blockGenreButtonName = /block additional genres/i;
          const blockGenreSubmitButtonName = /block genre/i;
          const genreSelectLabel = /select genre to block/i;
          const removeGenreTitle = /remove genre/i;

         beforeEach(() => { setupMocks(); });

         it('adds a blocked genre', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: { message: 'Prefs updated' } });
            const genreToBlock = 'Fiction';
            render(<Settings />);
            await waitForLoad();
            fireEvent.click(screen.getByRole('button', { name: blockGenreButtonName }));
            const select = await screen.findByLabelText(genreSelectLabel);
            const submitButton = screen.getByRole('button', { name: blockGenreSubmitButtonName });
            fireEvent.change(select, { target: { value: genreToBlock } });
            expect(submitButton).not.toBeDisabled();
            fireEvent.click(submitButton);
            expect(await screen.findByText(genreToBlock)).toBeInTheDocument();
            expect(within(screen.getByText(genreToBlock)).getByTitle(removeGenreTitle)).toBeInTheDocument();
            const expectedBlocked = [...mockInitialProfileData.blocked_genres!, genreToBlock];
            expect(mockLocalStorageStore['blockedGenres']).toBe(JSON.stringify(expectedBlocked));
            await waitFor(() => { expect(mockedAxios.post).toHaveBeenCalledWith(
                updatePreferencesUrl,
                { blocked_genres: expectedBlocked },
                expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Token ${mockAuthToken}` }) })
            ); });
            expect(await screen.findByText(/genre preferences updated/i)).toBeInTheDocument();
         });

          it('removes a blocked genre', async () => {
             mockedAxios.post.mockResolvedValueOnce({ data: { message: 'Prefs updated' } });
             const initialBlocked = mockInitialProfileData.blocked_genres ?? [];
             if (initialBlocked.length === 0) throw new Error("Test setup error");
             const genreToRemove = initialBlocked[0];
             render(<Settings />);
             await waitForLoad();
             const genreTag = screen.getByText(genreToRemove);
             const removeButton = within(genreTag).getByTitle(removeGenreTitle);
             fireEvent.click(removeButton);
             expect(screen.queryByText(genreToRemove)).not.toBeInTheDocument();
             const expectedBlocked = (mockInitialProfileData.blocked_genres ?? []).filter(g => g !== genreToRemove);
             expect(mockLocalStorageStore['blockedGenres']).toBe(JSON.stringify(expectedBlocked));
             await waitFor(() => { expect(mockedAxios.post).toHaveBeenCalledWith(
                 updatePreferencesUrl,
                 { blocked_genres: expectedBlocked },
                 expect.objectContaining({ headers: expect.objectContaining({ Authorization: `Token ${mockAuthToken}` }) })
             ); });
             expect(await screen.findByText(/genre preferences updated/i)).toBeInTheDocument();
          });
     });

     // --- General Actions ---
     describe('General Actions', () => {
         it('logs out when logout button is clicked', async () => {
             render(<Settings />);
             await waitForLoad();
             fireEvent.click(screen.getAllByRole('button', { name: /log out/i })[0]);
             expect(logout).toHaveBeenCalledTimes(1);
             expect(mockNavigate).toHaveBeenCalledWith('/');
          });

         it('navigates home when "Return to Home" is clicked', async () => {
              render(<Settings />);
              await waitForLoad();
              fireEvent.click(screen.getByRole('button', { name: /return to home/i }));
              expect(mockNavigate).toHaveBeenCalledWith('/');
         });
     });

}); // End of main describe