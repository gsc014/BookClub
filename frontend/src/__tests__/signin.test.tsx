// src/__tests__/signin.test.tsx (or .jsx)

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mocked, MockInstance } from 'vitest';
import axios, { AxiosStatic } from 'axios';

// Component to test
import Signin from '../assets/signin'; // Adjust path if necessary

// Mock utility functions
import { closeTabs, showLogInTab, successfulSignin } from '../utils';

// --- Mocks ---

// Mock axios
vi.mock('axios');
const mockedAxios = axios as Mocked<AxiosStatic>;

// Mock the utils module
vi.mock('../utils.jsx', () => ({
    closeTabs: vi.fn(),
    showLogInTab: vi.fn(),
    successfulSignin: vi.fn(),
    // Add other exports if needed by other mocks/components
    // showSignInTab: vi.fn(),
    // successfulLogin: vi.fn(),
}));

// Mock image import
vi.mock('../assets/pictures/close.png', () => ({ default: 'close.png' }));

// --- Test Suite ---

describe('Signin Component', () => {
    const usernameInputLabel = /username/i;
    const passwordInputLabel = /^password$/i; // Use regex boundaries for exact match
    const confirmPasswordInputLabel = /confirm password/i;
    const signupButtonName = /sign up/i; // Matches the main button
    const loginButtonName = /log in/i; // Matches the switch button
    const closeButtonAltText = /close sign up form/i; // Matches alt text added to component
    const signupUrl = 'http://127.0.0.1:8000/api/signup/';
    const loginUrl = 'http://127.0.0.1:8000/api/login/';

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
    });

    it('renders the signup form correctly', () => {
        render(<Signin />);

        expect(screen.getByRole('heading', { name: signupButtonName })).toBeInTheDocument();
        // Find by label text
        expect(screen.getByLabelText(usernameInputLabel)).toBeInTheDocument();
        expect(screen.getByLabelText(passwordInputLabel)).toBeInTheDocument();
        expect(screen.getByLabelText(confirmPasswordInputLabel)).toBeInTheDocument();
        // Find buttons
        expect(screen.getByRole('button', { name: signupButtonName })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: loginButtonName })).toBeInTheDocument();
        // Find close icon by alt text
        expect(screen.getByAltText(closeButtonAltText)).toBeInTheDocument();

        // Error/Success messages should not be present initially
        expect(screen.queryByRole('alert')).not.toBeInTheDocument(); // Check common roles first
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
    });

    it('updates input fields on change', () => {
        render(<Signin />);
        const usernameInput = screen.getByLabelText(usernameInputLabel);
        const passwordInput = screen.getByLabelText(passwordInputLabel);
        const confirmPasswordInput = screen.getByLabelText(confirmPasswordInputLabel);

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

        // Mock successful responses for both calls
        mockedAxios.post
            .mockResolvedValueOnce({ data: mockSignupResponse }) // First call (signup)
            .mockResolvedValueOnce({ data: mockLoginResponse }); // Second call (login)

        render(<Signin />);

        // Fill form
        fireEvent.change(screen.getByLabelText(usernameInputLabel), { target: { value: testUsername } });
        fireEvent.change(screen.getByLabelText(passwordInputLabel), { target: { value: testPassword } });
        fireEvent.change(screen.getByLabelText(confirmPasswordInputLabel), { target: { value: testPassword } });

        // Submit
        fireEvent.click(screen.getByRole('button', { name: signupButtonName }));

        // Wait for async operations and check calls
        await waitFor(() => {
            // Check signup call
            expect(mockedAxios.post).toHaveBeenCalledWith(
                signupUrl,
                { username: testUsername, password1: testPassword, password2: testPassword },
                { headers: { "Content-Type": "application/json" } }
            );
        });

        // Check success message appears
        expect(await screen.findByText('Signup successful! You can now log in.')).toBeInTheDocument();

        await waitFor(() => {
             // Check login call
             expect(mockedAxios.post).toHaveBeenCalledWith(
                 loginUrl,
                 { username: testUsername, password: testPassword },
                 { headers: { "Content-Type": "application/json" }, withCredentials: true }
             );
        });

         // Check total calls
         expect(mockedAxios.post).toHaveBeenCalledTimes(2);

        // Check utility function calls
        await waitFor(() => {
            expect(successfulSignin).toHaveBeenCalledTimes(1);
            expect(successfulSignin).toHaveBeenCalledWith(mockLoginResponse); // Check payload
        });
        await waitFor(() => {
             expect(closeTabs).toHaveBeenCalledTimes(1);
        });


        // Ensure no error message
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('displays API error message on failed signup submission', async () => {
        const signupErrorMessage = 'Username already taken.';
        const mockErrorResponse = {
            response: { data: { error: signupErrorMessage } }
        };
        // Mock only the first call to fail
        mockedAxios.post.mockRejectedValueOnce(mockErrorResponse);
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<Signin />);

        // Fill form
        fireEvent.change(screen.getByLabelText(usernameInputLabel), { target: { value: 'existinguser' } });
        fireEvent.change(screen.getByLabelText(passwordInputLabel), { target: { value: 'password' } });
        fireEvent.change(screen.getByLabelText(confirmPasswordInputLabel), { target: { value: 'password' } });

        // Submit
        fireEvent.click(screen.getByRole('button', { name: signupButtonName }));

        // Wait for error message
        expect(await screen.findByText(signupErrorMessage)).toBeInTheDocument();

        // Check API call (only signup should be attempted)
        expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        expect(mockedAxios.post).toHaveBeenCalledWith(signupUrl, expect.anything(), expect.anything());

        // Ensure success path was not taken
        expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
        expect(successfulSignin).not.toHaveBeenCalled();
        expect(closeTabs).not.toHaveBeenCalled();

        // Check console log
        expect(consoleErrorSpy).toHaveBeenCalledWith('Signup error:', mockErrorResponse.response.data);
        consoleErrorSpy.mockRestore();
    });

     it('displays error message on successful signup but failed login submission', async () => {
         const mockSignupResponse = { message: 'Signup OK' };
         const loginErrorMessage = 'Login failed unexpectedly.';
         const mockLoginErrorResponse = {
             response: { data: { error: loginErrorMessage } }
         };

         // Mock signup success, login failure
         mockedAxios.post
             .mockResolvedValueOnce({ data: mockSignupResponse }) // Signup OK
             .mockRejectedValueOnce(mockLoginErrorResponse); // Login fails

         const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

         render(<Signin />);

         // Fill form
         fireEvent.change(screen.getByLabelText(usernameInputLabel), { target: { value: 'gooduser' } });
         fireEvent.change(screen.getByLabelText(passwordInputLabel), { target: { value: 'goodpass' } });
         fireEvent.change(screen.getByLabelText(confirmPasswordInputLabel), { target: { value: 'goodpass' } });

         // Submit
         fireEvent.click(screen.getByRole('button', { name: signupButtonName }));

         // Wait for error message (from the login failure)
         expect(await screen.findByText(loginErrorMessage)).toBeInTheDocument();

         // Check API calls (both should have been made)
         expect(mockedAxios.post).toHaveBeenCalledTimes(2);
         expect(mockedAxios.post).toHaveBeenCalledWith(signupUrl, expect.anything(), expect.anything());
         expect(mockedAxios.post).toHaveBeenCalledWith(loginUrl, expect.anything(), expect.anything());

         // Ensure success message might appear briefly but error overrides
         // Don't assert absence of success message as timing is tricky

         // Ensure final success path was not taken
         expect(successfulSignin).not.toHaveBeenCalled();
         expect(closeTabs).not.toHaveBeenCalled();

         // Check console log for the login error
         expect(consoleErrorSpy).toHaveBeenCalledWith('Signup error:', mockLoginErrorResponse.response.data); // Component logs login error under 'Signup error' context
         consoleErrorSpy.mockRestore();
     });

    it('displays generic error message on network or unexpected signup error', async () => {
        const networkError = new Error('Network failed');
        mockedAxios.post.mockRejectedValueOnce(networkError); // Fails on first call
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<Signin />);

        // Fill form
        fireEvent.change(screen.getByLabelText(usernameInputLabel), { target: { value: 'user' } });
        fireEvent.change(screen.getByLabelText(passwordInputLabel), { target: { value: 'pass' } });
        fireEvent.change(screen.getByLabelText(confirmPasswordInputLabel), { target: { value: 'pass' } });

        // Submit
        fireEvent.click(screen.getByRole('button', { name: signupButtonName }));

        // Wait for the generic error message
        expect(await screen.findByText(/An unexpected error occurred/i)).toBeInTheDocument();

        // Check API call (only signup attempt)
        expect(mockedAxios.post).toHaveBeenCalledTimes(1);

        // Ensure success path not taken
        expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
        expect(successfulSignin).not.toHaveBeenCalled();
        expect(closeTabs).not.toHaveBeenCalled();

        // Check console log
        expect(consoleErrorSpy).toHaveBeenCalledWith('Unexpected error:', networkError);
        consoleErrorSpy.mockRestore();
    });
});