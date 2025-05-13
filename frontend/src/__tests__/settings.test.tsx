import { render, screen, fireEvent, waitFor, act, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../utils', async (importActual) => {
    const actual = await importActual<typeof import('../utils')>();
    return {
        ...actual,
        isLoggedIn: vi.fn(),
        getCurrentUsername: vi.fn(),
        logout: vi.fn(() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
        }),
    };
});
import { isLoggedIn, getCurrentUsername, logout } from '../utils';

const mockNavigateFn = vi.fn();

vi.mock('react-router-dom', async (importActual) => {
    const actual = await importActual<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: vi.fn(() => mockNavigateFn),
    };
});

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

import Settings from '../assets/settings';
import updateBlockedGenresOnServer from "../assets/settings";

interface ProfileData {
    username: string;
    email: string | null;
    date_joined: string;
    last_login?: string | null;
    bio?: string | null;
    location?: string | null;
    birth_date?: string | null;
}

const mockUsername = 'settingsUser';
const mockAuthToken = 'settings-test-token';
const mockInitialProfileData: ProfileData = {
    username: mockUsername,
    email: 'settings@example.com',
    date_joined: '2023-01-15T10:00:00Z',
    last_login: '2023-10-25T11:00:00Z',
    bio: 'Initial Bio',
    location: 'Initial Location',
    birth_date: '1995-05-15',
};
const mockInitialBlockedGenres = ['Horror', 'Biography'];
const mockAvailableGenres = [
    'Drama', 'Romance', 'History', 'Fiction', 'Comedy',
    'Horror', 'Young Adult', 'Biography', 'Economy', 'Custom'
];

const profileApiUrl = `http://127.0.0.1:8000/api/profile/${mockUsername}/`;
const blockedGenresApiUrl = 'http://127.0.0.1:8000/api/blocked-genres/';
const updateUsernameUrl = 'http://127.0.0.1:8000/api/update-username/';
const updatePasswordUrl = 'http://127.0.0.1:8000/api/update-password/';
const updateEmailUrl = 'http://127.0.0.1:8000/api/update-email/';
const deleteAccountUrl = 'http://127.0.0.1:8000/api/delete-account/';
const blockGenresUrl = `http://127.0.0.1:8000/api/block-genres/`;
const unblockGenreUrl = `http://127.0.0.1:8000/api/unblock-genre/`;

const renderSettingsComponent = () => render(<Settings />, { wrapper: BrowserRouter });

describe('Settings Component', () => {
    let consoleErrorSpy: MockInstance;
    let alertSpy: MockInstance;

    beforeEach(() => {
        vi.resetAllMocks();

        vi.mocked(isLoggedIn).mockReturnValue(true);
        vi.mocked(getCurrentUsername).mockReturnValue(mockUsername);

        localStorage.clear();
        vi.spyOn(window.localStorage.__proto__, 'getItem');
        vi.spyOn(window.localStorage.__proto__, 'setItem');
        vi.spyOn(window.localStorage.__proto__, 'removeItem');
        localStorage.setItem('authToken', mockAuthToken);
        localStorage.setItem('user', JSON.stringify({ username: mockUsername }));

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
        mockedAxios.post.mockResolvedValue({ data: { message: 'Default POST Success' } });
        mockedAxios.delete.mockResolvedValue({ data: { message: 'Default DELETE Success' } });

        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
        cleanup();
    });

    const waitForLoad = async () => {
        await waitFor(() => {
            expect(mockedAxios.get).toHaveBeenCalledWith(profileApiUrl, expect.any(Object));
            expect(mockedAxios.get).toHaveBeenCalledWith(blockedGenresApiUrl, expect.any(Object));
        });
        await waitFor(() => expect(screen.queryByText(/loading your settings/i)).not.toBeInTheDocument());
        await screen.findByText(mockInitialProfileData.username);
    };

    describe('Initial Load & Display', () => {
        it('redirects to home if not logged in', () => {
            vi.mocked(isLoggedIn).mockReturnValue(false);
            localStorage.removeItem('authToken');
            render(<Settings />);
            expect(mockNavigateFn).toHaveBeenCalledWith('/');
            expect(mockedAxios.get).not.toHaveBeenCalled();
        });

        it('shows loading state initially then displays fetched data', async () => {
            let profilePromise = new Promise<void>(r => setTimeout(r, 10));
            let genrePromise = new Promise<void>(r => setTimeout(r, 15));
            mockedAxios.get.mockImplementation(async (url) => {
                if (url === profileApiUrl) { await profilePromise; return { data: mockInitialProfileData }; }
                if (url === blockedGenresApiUrl) { await genrePromise; return { data: { blocked_genres: mockInitialBlockedGenres } }; }
                throw new Error("Unhandled GET");
            });

            render(<Settings />);
            expect(screen.getByText(/loading your settings/i)).toBeInTheDocument();

            await waitForLoad();

            expect(mockedAxios.get).toHaveBeenCalledWith(profileApiUrl, expect.any(Object));
            expect(mockedAxios.get).toHaveBeenCalledWith(blockedGenresApiUrl, expect.any(Object));

            expect(screen.getByText(mockInitialProfileData.username)).toBeInTheDocument();
            expect(screen.getByText(mockInitialProfileData.email!)).toBeInTheDocument();
            expect(screen.getByText(mockInitialBlockedGenres[0])).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /change username/i })).toBeInTheDocument();
        });

        it('displays error message if profile fetch fails', async () => {
            const profileError = new Error("Simulated profile fetch failure");
            mockedAxios.get.mockImplementation(async (url) => {
                if (url === profileApiUrl) throw profileError;
                if (url === blockedGenresApiUrl) return { data: { blocked_genres: [] } };
                throw new Error(`Unhandled GET: ${url}`);
            });

            render(<Settings />);

            expect(await screen.findByText(/failed to load your profile data/i)).toBeInTheDocument();
            expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching user data:", profileError);
            expect(screen.queryByText(/loading your settings/i)).not.toBeInTheDocument();
        });

        it('logs an error if blocked genres fetch fails but still renders profile', async () => {
            const genreError = new Error("Simulated genre fetch failure");
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
    });

    describe('Account Management Forms', () => {
        const toggleUsernameBtn = /change username/i;
        const togglePasswordBtn = /change password/i;
        const toggleEmailBtn = /change email/i;
        const toggleDeleteBtn = /delete account/i;
        const logoutButtonName = /log out/i;
        const cancelButtonName = /cancel/i;
        const confirmDeleteBtn = /yes, delete my account/i;
        const submitUsernameBtn = /update username/i;
        const submitPasswordBtn = /update password/i;
        const submitEmailBtn = /update email/i;
        const newUsernameLabel = /new username/i;
        const currentPasswordLabel = /current password/i;
        const newPasswordLabel = /^new password/i;
        const confirmPasswordLabel = /confirm new password/i;
        const newEmailLabel = /new email/i;

        const openForm = async (toggleButtonName: RegExp, expectedLabel?: RegExp) => {
            const user = userEvent.setup();
            await screen.findByText(mockInitialProfileData.username);
            const toggleButton = await screen.findByRole('button', { name: toggleButtonName });
            await user.click(toggleButton);
            if (expectedLabel) {
                await screen.findByLabelText(expectedLabel);
            } else {
                await screen.findByRole('button', { name: cancelButtonName });
            }
            return user;
        };

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
        });
    });

    test('shows error if new username is empty when submitting', async () => {
        const { container } = render(<Settings />);

        const changeUsernameButton = await screen.findByRole('button', { name: /change username/i });
        fireEvent.click(changeUsernameButton);

        const formElement = container.querySelector('form');

        if (formElement) {
            const usernameInput = screen.getByLabelText(/new username/i);
            expect(usernameInput).toBeInTheDocument();

            fireEvent.submit(formElement);

            const errorMessages = screen.getAllByText(/username cannot be empty/i);
            expect(errorMessages.length).toBeGreaterThan(0);
        } else {
            throw new Error('Form element not found');
        }
    });

    test('shows error if new password and confirm password do not match', async () => {
        const { container } = render(<Settings />);

        const changePasswordButton = await screen.findByRole('button', { name: /change password/i });
        fireEvent.click(changePasswordButton);

        const formElement = container.querySelector('form');

        if (formElement) {
            const currentPasswordInput = screen.getByLabelText(/current password/i);
            const newPasswordInput = screen.getByLabelText(/^new password/i);
            const confirmPasswordInput = screen.getByLabelText(/^confirm new password/i);

            expect(currentPasswordInput).toBeInTheDocument();
            expect(newPasswordInput).toBeInTheDocument();
            expect(confirmPasswordInput).toBeInTheDocument();

            fireEvent.change(currentPasswordInput, { target: { value: 'currentPassword123' } });
            fireEvent.change(newPasswordInput, { target: { value: 'newPassword123' } });
            fireEvent.change(confirmPasswordInput, { target: { value: 'differentPassword123' } });
            fireEvent.submit(formElement);

            const errorMessage = await screen.findByText(/new passwords do not match/i);
            expect(errorMessage).toBeInTheDocument();
        } else {
            throw new Error('Form element not found');
        }
    });

    it('successfully updates the username and logs out after showing success message', async () => {
        localStorage.setItem('authToken', mockAuthToken);
        localStorage.setItem('user', JSON.stringify({ username: mockUsername }));
        mockedAxios.post.mockResolvedValueOnce({ data: { message: 'Username updated' } });

        const { container } = render(
            <BrowserRouter>
                <Settings />
            </BrowserRouter>
        );

        const changeUsernameBtn = await screen.findByRole('button', { name: /change username/i });
        fireEvent.click(changeUsernameBtn);

        const formElement = container.querySelector('form');
        if (!formElement) throw new Error('Form element not found');

        const usernameInput = screen.getByLabelText(/new username/i);
        expect(usernameInput).toBeInTheDocument();
        await userEvent.clear(usernameInput);
        await userEvent.type(usernameInput, 'updatedUser123');

        fireEvent.submit(formElement);

        await waitFor(() => {
            expect(screen.getByText(/username updated successfully/i)).toBeInTheDocument();
        });

        const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
        expect(updatedUser.username).toBe('updatedUser123');

        await waitFor(() => {
            expect(logout).toHaveBeenCalled();
            expect(mockNavigateFn).toHaveBeenCalledWith('/');
        }, { timeout: 4000 });
    });

    it('displays error message if API fails during username update', async () => {
        localStorage.setItem('authToken', mockAuthToken);
        localStorage.setItem('user', JSON.stringify({ username: mockUsername }));

        mockedAxios.post.mockRejectedValueOnce({
            response: {
                data: { error: 'Username already taken' },
            },
        });

        const { container } = render(
            <BrowserRouter>
                <Settings />
            </BrowserRouter>
        );

        const changeUsernameBtn = await screen.findByRole('button', { name: /change username/i });
        fireEvent.click(changeUsernameBtn);

        const formElement = container.querySelector('form');
        if (!formElement) throw new Error('Form element not found');

        const usernameInput = screen.getByLabelText(/new username/i);
        await userEvent.clear(usernameInput);
        await userEvent.type(usernameInput, 'takenUsername');

        fireEvent.submit(formElement);

        await waitFor(() => {
            expect(screen.getByText(/username already taken/i)).toBeInTheDocument();
        });
    });

    it('successfully updates password and logs out after showing success message', async () => {
        localStorage.setItem('authToken', mockAuthToken);
        localStorage.setItem('user', JSON.stringify({ username: mockUsername }));

        mockedAxios.post.mockResolvedValueOnce({ data: { message: 'Password updated' } });

        render(
            <BrowserRouter>
                <Settings />
            </BrowserRouter>
        );

        const changePasswordBtn = await screen.findByRole('button', { name: /change password/i });
        await userEvent.click(changePasswordBtn);

        const currentPasswordInput = screen.getByLabelText(/^current password/i);
        const newPasswordInput = screen.getByLabelText(/^new password/i);
        const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

        await userEvent.type(currentPasswordInput, 'oldPass123!');
        await userEvent.type(newPasswordInput, 'newPass456!');
        await userEvent.type(confirmPasswordInput, 'newPass456!');

        const saveButton = screen.getByRole('button', { name: /Update Password/i });
        await userEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText(/password updated successfully/i)).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(logout).toHaveBeenCalled();
            expect(mockNavigateFn).toHaveBeenCalledWith('/');
        }, { timeout: 4000 });
    }, 10000);

    it('displays error if current password is missing when submitting password form', async () => {
        const { container } = render(
            <BrowserRouter>
                <Settings />
            </BrowserRouter>
        );

        const changePasswordBtn = await screen.findByRole('button', { name: /change password/i });
        fireEvent.click(changePasswordBtn);

        const formElement = container.querySelector('form');
        if (!formElement) throw new Error('Form element not found');

        const newPasswordInput = screen.getByLabelText(/^new password/i);
        const confirmPasswordInput = screen.getByLabelText(/confirm new password/i);

        await userEvent.type(newPasswordInput, 'newPass123!');
        await userEvent.type(confirmPasswordInput, 'newPass123!');

        fireEvent.submit(formElement);

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

        const changePasswordBtn = await screen.findByRole('button', { name: /change password/i });
        fireEvent.click(changePasswordBtn);

        const formElement = container.querySelector('form');
        if (!formElement) throw new Error('Form element not found');

        const currentPasswordInput = screen.getByLabelText(/^current password/i);
        await userEvent.type(currentPasswordInput, 'oldPass123!');

        fireEvent.submit(formElement);

        await waitFor(() => {
            expect(screen.getByText(/new password and confirmation are required/i)).toBeInTheDocument();
        });
    });

    it('shows error if new email is empty and handles successful email update with logout', async () => {
        const { container } = render(
            <BrowserRouter>
                <Settings />
            </BrowserRouter>
        );

        localStorage.setItem('authToken', mockAuthToken);
        localStorage.setItem('user', JSON.stringify({ ...mockInitialProfileData }));

        const changeEmailButton = await screen.findByRole('button', { name: /change email/i });
        fireEvent.click(changeEmailButton);

        const formElement = container.querySelector('form');
        if (!formElement) throw new Error('Form element not found');

        const emailInput = screen.getByLabelText(/new email/i);
        expect(emailInput).toBeInTheDocument();

        await userEvent.clear(emailInput);
        fireEvent.submit(formElement);

        const errorMessages = await screen.findAllByText(/email cannot be empty/i);
        expect(errorMessages.length).toBeGreaterThan(0);

        const updatedEmail = 'newemail@example.com';
        mockedAxios.post.mockResolvedValueOnce({ data: { message: 'Email updated' } });

        await userEvent.type(emailInput, updatedEmail);
        fireEvent.submit(formElement);

        await waitFor(() => {
            expect(screen.getByText(/email updated successfully/i)).toBeInTheDocument();
        });

        const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
        expect(updatedUser.email).toBe(updatedEmail);

        await waitFor(() => {
            expect(logout).toHaveBeenCalled();
            expect(mockNavigateFn).toHaveBeenCalledWith('/');
        }, { timeout: 4000 });
    });

    it('successfully deletes the account and redirects to home with message', async () => {
        localStorage.setItem('authToken', mockAuthToken);
        localStorage.setItem('user', JSON.stringify(mockInitialProfileData));

        mockedAxios.delete.mockResolvedValueOnce({ data: { message: 'Account deleted' } });

        render(
            <BrowserRouter>
                <Settings />
            </BrowserRouter>
        );

        const deleteBtn = await screen.findByRole('button', { name: /delete account/i });
        userEvent.click(deleteBtn);

        const confirmDeleteBtn = await screen.findByRole('button', { name: /yes, delete my account/i });

        userEvent.click(confirmDeleteBtn);

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

        expect(localStorage.getItem('user')).toBeNull();
        expect(localStorage.getItem('authToken')).toBeNull();
        expect(mockNavigateFn).toHaveBeenCalledWith('/', {
            state: { message: 'Your account has been successfully deleted' }
        });
    });

    test('disables submit button if no genre is selected', async () => {
        const { container } = render(<Settings />);

        const toggleGenreFormButton = await screen.findByRole('button', { name: /block additional genres/i });
        fireEvent.click(toggleGenreFormButton);

        const formElement = container.querySelector('form');
        expect(formElement).toBeInTheDocument();

        const genreSelect = screen.getByLabelText(/select genre to block/i);
        expect(genreSelect).toBeInTheDocument();

        expect((genreSelect as HTMLSelectElement).value).toBe('');

        const submitButton = screen.getByRole('button', { name: /block genre/i });

        expect(submitButton).toBeDisabled();
    });

    test('adds a selected genre and shows success message', async () => {
        const { container } = render(<Settings />);

        const toggleFormButton = await screen.findByRole('button', { name: /block additional genres/i });
        fireEvent.click(toggleFormButton);

        const formElement = container.querySelector('form');
        expect(formElement).toBeInTheDocument();

        const genreSelect = screen.getByLabelText(/select genre to block/i);
        expect(genreSelect).toBeInTheDocument();

        fireEvent.change(genreSelect, { target: { value: 'Romance' } });
        expect((genreSelect as HTMLSelectElement).value).toBe('Romance');

        fireEvent.submit(formElement!);

        const successMessage = await screen.findByText(/successfully blocked "Romance" genre/i);
        expect(successMessage).toBeInTheDocument();
    });
    test('removes a blocked genre and shows success message', async () => {
        localStorage.setItem('authToken', 'fake-token');

        render(<Settings />);

        const horrorTag = await screen.findByText('Horror');
        const genreTagItem = horrorTag.closest('li');
        expect(genreTagItem).toBeInTheDocument();

        const removeBtn = within(genreTagItem!).getByTitle('Remove genre');
        fireEvent.click(removeBtn);

        await waitFor(() => {
            expect(screen.queryByText('Horror')).not.toBeInTheDocument();
        });

        const successMessage = await screen.findByText(/successfully unblocked "horror" genre/i);
        expect(successMessage).toBeInTheDocument();
    });

    test('adds a custom blocked genre and shows success message', async () => {
        render(<Settings />);

        const toggleFormBtn = await screen.findByRole('button', { name: /block additional genres/i });
        fireEvent.click(toggleFormBtn);

        const selectElement = screen.getByLabelText(/select genre to block/i);
        fireEvent.change(selectElement, { target: { value: 'Custom' } });

        const customInput = await screen.findByPlaceholderText(/enter a custom genre name/i);
        fireEvent.change(customInput, { target: { value: 'Dark Fantasy' } });

        const submitBtn = screen.getByRole('button', { name: /block genre/i });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText('Dark Fantasy')).toBeInTheDocument();
        });

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

        const changePasswordButton = await screen.findByRole('button', { name: /change password/i });
        fireEvent.click(changePasswordButton);

        fireEvent.change(screen.getByLabelText(/current password/i), {
            target: { value: 'wrong-current-password' },
        });
        fireEvent.change(screen.getByLabelText(/^new password/i), {
            target: { value: 'newSecurePass123' },
        });
        fireEvent.change(screen.getByLabelText(/confirm new password/i), {
            target: { value: 'newSecurePass123' },
        });

        mockedAxios.post.mockRejectedValueOnce({
            response: {
                data: {
                    error: 'Current password is incorrect',
                },
            },
        });

        fireEvent.click(screen.getByRole('button', { name: /update password/i }));

        await waitFor(() => {
            expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument();
        });
    });

    test('shows custom error message when email update fails with error response from API', async () => {
        render(<Settings />);
      
        const changeEmailButton = await screen.findByRole('button', { name: /change email/i });
        fireEvent.click(changeEmailButton);
      
        fireEvent.change(screen.getByLabelText(/new email/i), {
          target: { value: 'invalid-email@example.com' },
        });
      
        mockedAxios.post.mockRejectedValueOnce({
          response: {
            data: {
              error: 'Custom error: Invalid email format',
            },
          },
        });
      
        fireEvent.click(screen.getByRole('button', { name: /update email/i }));
      
        await waitFor(() => {
          expect(screen.getByText(/custom error: invalid email format/i)).toBeInTheDocument();
        });
      });
      
      test('shows error message when account deletion fails', async () => {
        render(<Settings />);
      
        await screen.findByText(/account settings/i);
      
        const initialDeleteBtn = screen.getByRole('button', { name: /delete account/i });
        fireEvent.click(initialDeleteBtn);
      
        mockedAxios.delete.mockRejectedValueOnce({
          response: { data: { error: 'Account deletion failed due to server error' } },
        });
      
        const confirmDeleteBtn = screen.getByRole('button', { name: /yes, delete my account/i });
        fireEvent.click(confirmDeleteBtn);
      
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
});