import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import axios, { AxiosStatic } from 'axios';
import Login from '../assets/login';
import { closeTabs, showSignInTab, successfulLogin } from '../utils';

vi.mock('axios');
const mockedAxios = axios as Mocked<AxiosStatic>;

vi.mock('../utils.jsx', () => ({
    closeTabs: vi.fn(),
    showSignInTab: vi.fn(),
    successfulLogin: vi.fn(),
}));

vi.mock('../assets/pictures/close.png', () => ({ default: 'close.png' }));

describe('Login Component', () => {
    const usernameInputLabel = /username/i;
    const passwordInputLabel = /password/i;
    const loginButtonName = /log in/i;
    const signupButtonName = /sign up/i;
    const closeButtonAltText = /close login form/i;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the login form correctly', () => {
        render(<Login />);
        expect(screen.getByRole('heading', { name: loginButtonName })).toBeInTheDocument();
        expect(screen.getByLabelText(usernameInputLabel)).toBeInTheDocument();
        expect(screen.getByLabelText(passwordInputLabel)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: loginButtonName })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: signupButtonName })).toBeInTheDocument();
        expect(screen.getByAltText(closeButtonAltText)).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('updates input fields on change', () => {
        render(<Login />);
        const usernameInput = screen.getByLabelText(usernameInputLabel);
        const passwordInput = screen.getByLabelText(passwordInputLabel);
        fireEvent.change(usernameInput, { target: { value: 'testuser' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        expect(usernameInput).toHaveValue('testuser');
        expect(passwordInput).toHaveValue('password123');
    });

    it('calls closeTabs when close button is clicked', () => {
        render(<Login />);
        const closeButton = screen.getByAltText(closeButtonAltText);
        fireEvent.click(closeButton);
        expect(closeTabs).toHaveBeenCalledTimes(1);
    });

    it('calls showSignInTab when "Sign Up" button is clicked', () => {
        render(<Login />);
        const signupButton = screen.getByRole('button', { name: signupButtonName });
        fireEvent.click(signupButton);
        expect(showSignInTab).toHaveBeenCalledTimes(1);
    });

    it('calls axios.post and successfulLogin on successful form submission', async () => {
        const mockUserData = { user: 'testuser', token: 'fake-token' };
        const testUsername = 'testuser';
        const testPassword = 'password123';
        mockedAxios.post.mockResolvedValue({ data: mockUserData });
        render(<Login />);
        fireEvent.change(screen.getByLabelText(usernameInputLabel), { target: { value: testUsername } });
        fireEvent.change(screen.getByLabelText(passwordInputLabel), { target: { value: testPassword } });
        const loginButton = screen.getByRole('button', { name: loginButtonName });
        fireEvent.click(loginButton);
        await waitFor(() => {
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'http://127.0.0.1:8000/api/login/',
                { username: testUsername, password: testPassword },
                { headers: { "Content-Type": "application/json" }, withCredentials: true }
            );
        });
        await waitFor(() => {
             expect(successfulLogin).toHaveBeenCalledTimes(1);
             expect(successfulLogin).toHaveBeenCalledWith(mockUserData);
        });
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('displays API error message on failed form submission (e.g., wrong credentials)', async () => {
        const errorMessage = 'Invalid credentials provided.';
        const mockErrorResponse = {
            response: {
                data: { error: errorMessage },
                status: 401
            }
        };
        mockedAxios.post.mockRejectedValue(mockErrorResponse);
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Login />);
        fireEvent.change(screen.getByLabelText(usernameInputLabel), { target: { value: 'wronguser' } });
        fireEvent.change(screen.getByLabelText(passwordInputLabel), { target: { value: 'wrongpass' } });
        fireEvent.click(screen.getByRole('button', { name: loginButtonName }));
        const errorElement = await screen.findByText(errorMessage);
        expect(errorElement).toBeInTheDocument();
        expect(successfulLogin).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Login error:', mockErrorResponse.response.data);
        consoleErrorSpy.mockRestore();
    });

    it('displays generic error message on network or unexpected error', async () => {
        const networkError = new Error('Network failed');
        mockedAxios.post.mockRejectedValue(networkError);
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Login />);
        fireEvent.change(screen.getByLabelText(usernameInputLabel), { target: { value: 'user' } });
        fireEvent.change(screen.getByLabelText(passwordInputLabel), { target: { value: 'pass' } });
        fireEvent.click(screen.getByRole('button', { name: loginButtonName }));
        const errorElement = await screen.findByText(/An unexpected error occurred/i);
        expect(errorElement).toBeInTheDocument();
        expect(successfulLogin).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Unexpected error:', networkError);
        consoleErrorSpy.mockRestore();
    });
});