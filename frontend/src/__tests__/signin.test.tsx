import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mocked} from 'vitest';
import axios, { AxiosStatic } from 'axios';

import Signin from '../assets/signin';

import { closeTabs, showLogInTab, successfulSignin } from '../utils';

vi.mock('axios');
const mockedAxios = axios as Mocked<AxiosStatic>;

vi.mock('../utils.jsx', () => ({
    closeTabs: vi.fn(),
    showLogInTab: vi.fn(),
    successfulSignin: vi.fn(),
}));

vi.mock('../assets/pictures/close.png', () => ({ default: 'close.png' }));


describe('Signin Component', () => {
    const usernameInputLabel = /username/i;
    const passwordInputLabel = /^password$/i; 
    const signupButtonName = /sign up/i; 
    const loginButtonName = /log in/i; 
    const closeButtonAltText = /close sign up form/i;
    const signupUrl = 'http://127.0.0.1:8000/api/signup/';
    const loginUrl = 'http://127.0.0.1:8000/api/login/';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the signup form correctly', () => {
        render(<Signin />);

        expect(screen.getByRole('heading', { name: signupButtonName })).toBeInTheDocument();
        expect(screen.getByLabelText(usernameInputLabel)).toBeInTheDocument();
        const passwordInputs = screen.getAllByLabelText(passwordInputLabel);
        expect(passwordInputs).toHaveLength(2);
        expect(screen.getByRole('button', { name: signupButtonName })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: loginButtonName })).toBeInTheDocument();
        expect(screen.getByAltText(closeButtonAltText)).toBeInTheDocument();

        expect(screen.queryByRole('alert')).not.toBeInTheDocument(); 
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
    });

    it('updates input fields on change', () => {
        render(<Signin />);
        const usernameInput = screen.getByLabelText(usernameInputLabel);
        const passwordInputs = screen.getAllByLabelText(passwordInputLabel);
        const passwordInput = passwordInputs[0];
        const confirmPasswordInput = passwordInputs[1];

        fireEvent.change(usernameInput, { target: { value: 'newuser' } });
        fireEvent.change(passwordInput, { target: { value: 'newpass123' } });
        fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } });

        expect(usernameInput).toHaveValue('newuser');
        expect(passwordInput).toHaveValue('newpass123');
        expect(confirmPasswordInput).toHaveValue('newpass123');
    });

    it('calls closeTabs when close button is clicked', () => {
        render(<Signin />);
        const closeButton = screen.getByAltText(closeButtonAltText);

        fireEvent.click(closeButton);

        expect(closeTabs).toHaveBeenCalledTimes(1);
    });

    it('calls showLogInTab when "Log In" button is clicked', () => {
        render(<Signin />);
        const loginSwitchButton = screen.getByRole('button', { name: loginButtonName });

        fireEvent.click(loginSwitchButton);

        expect(showLogInTab).toHaveBeenCalledTimes(1);
    });

    it('calls signup and login APIs, calls successfulSignin and closeTabs on successful submission', async () => {
        const mockSignupResponse = { message: 'Signup OK' };
        const mockLoginResponse = { user: 'newuser', token: 'new-token' };
        const testUsername = 'newuser';
        const testPassword = 'password123';

        mockedAxios.post
            .mockResolvedValueOnce({ data: mockSignupResponse }) 
            .mockResolvedValueOnce({ data: mockLoginResponse });

        render(<Signin />);

        fireEvent.change(screen.getByLabelText(usernameInputLabel), { target: { value: testUsername } });
        const passwordInputs = screen.getAllByLabelText(passwordInputLabel);
        fireEvent.change(passwordInputs[0], { target: { value: testPassword } });
        fireEvent.change(passwordInputs[1], { target: { value: testPassword } });

        fireEvent.click(screen.getByRole('button', { name: signupButtonName }));

        await waitFor(() => {
            expect(mockedAxios.post).toHaveBeenCalledWith(
                signupUrl,
                { username: testUsername, password1: testPassword, password2: testPassword },
                { headers: { "Content-Type": "application/json" } }
            );
        });

        expect(await screen.findByText('Signup successful! You can now log in.')).toBeInTheDocument();

        await waitFor(() => {
             expect(mockedAxios.post).toHaveBeenCalledWith(
                 loginUrl,
                 { username: testUsername, password: testPassword },
                 { headers: { "Content-Type": "application/json" }, withCredentials: true }
             );
        });

         expect(mockedAxios.post).toHaveBeenCalledTimes(2);

        await waitFor(() => {
            expect(successfulSignin).toHaveBeenCalledTimes(1);
            expect(successfulSignin).toHaveBeenCalledWith(mockLoginResponse);
        });
        await waitFor(() => {
             expect(closeTabs).toHaveBeenCalledTimes(1);
        });


        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('displays API error message on failed signup submission', async () => {
        const signupErrorMessage = 'Username already taken.';
        const mockErrorResponse = {
            response: { data: { error: signupErrorMessage } }
        };
        mockedAxios.post.mockRejectedValueOnce(mockErrorResponse);
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<Signin />);

        fireEvent.change(screen.getByLabelText(usernameInputLabel), { target: { value: 'existinguser' } });
        const passwordInputs = screen.getAllByLabelText(passwordInputLabel);
        fireEvent.change(passwordInputs[0], { target: { value: 'password' } });
        fireEvent.change(passwordInputs[1], { target: { value: 'password' } });

        fireEvent.click(screen.getByRole('button', { name: signupButtonName }));

        expect(await screen.findByText(signupErrorMessage)).toBeInTheDocument();

        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        expect(mockedAxios.post).toHaveBeenCalledWith(signupUrl, expect.anything(), expect.anything());

        expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
        expect(successfulSignin).not.toHaveBeenCalled();
        expect(closeTabs).not.toHaveBeenCalled();

        expect(consoleErrorSpy).toHaveBeenCalledWith('Signup error:', mockErrorResponse.response.data);
        consoleErrorSpy.mockRestore();
    });

     it('displays error message on successful signup but failed login submission', async () => {
         const mockSignupResponse = { message: 'Signup OK' };
         const loginErrorMessage = 'Login failed unexpectedly.';
         const mockLoginErrorResponse = {
             response: { data: { error: loginErrorMessage } }
         };

         mockedAxios.post
             .mockResolvedValueOnce({ data: mockSignupResponse }) 
             .mockRejectedValueOnce(mockLoginErrorResponse); 

         const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

         render(<Signin />);

         fireEvent.change(screen.getByLabelText(usernameInputLabel), { target: { value: 'gooduser' } });
         const passwordInputs = screen.getAllByLabelText(passwordInputLabel);
         fireEvent.change(passwordInputs[0], { target: { value: 'goodpass' } });
         fireEvent.change(passwordInputs[1], { target: { value: 'goodpass' } });

         fireEvent.click(screen.getByRole('button', { name: signupButtonName }));

         expect(await screen.findByText(loginErrorMessage)).toBeInTheDocument();

         expect(mockedAxios.post).toHaveBeenCalledTimes(2);
         expect(mockedAxios.post).toHaveBeenCalledWith(signupUrl, expect.anything(), expect.anything());
         expect(mockedAxios.post).toHaveBeenCalledWith(loginUrl, expect.anything(), expect.anything());

         expect(successfulSignin).not.toHaveBeenCalled();
         expect(closeTabs).not.toHaveBeenCalled();

         expect(consoleErrorSpy).toHaveBeenCalledWith('Signup error:', mockLoginErrorResponse.response.data);
         consoleErrorSpy.mockRestore();
     });

    it('displays generic error message on network or unexpected signup error', async () => {
        const networkError = new Error('Network failed');
        mockedAxios.post.mockRejectedValueOnce(networkError);
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<Signin />);

        fireEvent.change(screen.getByLabelText(usernameInputLabel), { target: { value: 'user' } });
        const passwordInputs = screen.getAllByLabelText(passwordInputLabel);
        fireEvent.change(passwordInputs[0], { target: { value: 'pass' } });
        fireEvent.change(passwordInputs[1], { target: { value: 'pass' } });

        fireEvent.click(screen.getByRole('button', { name: signupButtonName }));

        expect(await screen.findByText(/An unexpected error occurred/i)).toBeInTheDocument();

        expect(mockedAxios.post).toHaveBeenCalledTimes(1);

        expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
        expect(successfulSignin).not.toHaveBeenCalled();
        expect(closeTabs).not.toHaveBeenCalled();

        expect(consoleErrorSpy).toHaveBeenCalledWith('Unexpected error:', networkError);
        consoleErrorSpy.mockRestore();
    });
});