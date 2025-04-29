// src/__tests__/login.test.tsx (or .jsx)

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mocked } from 'vitest';
import axios, { AxiosStatic } from 'axios';

// Component to test
import Login from '../assets/login'; // Adjust path if necessary

// Mock utility functions
import { closeTabs, showSignInTab, successfulLogin } from '../utils';

// --- Mocks ---

// Mock axios
vi.mock('axios');
const mockedAxios = axios as Mocked<AxiosStatic>;

// Mock the utils module
vi.mock('../utils.jsx', () => ({
    closeTabs: vi.fn(),
    showSignInTab: vi.fn(),
    successfulLogin: vi.fn(),
}));

// Mock image import
vi.mock('../assets/pictures/close.png', () => ({ default: 'close.png' }));

// --- Test Suite ---

describe('Login Component', () => {
    const usernameInputLabel = /username/i;
    const passwordInputLabel = /password/i;
    const loginButtonName = /log in/i; // Matches the main button
    const signupButtonName = /sign up/i;
    const closeButtonAltText = /close login form/i; // Matches alt text added to component

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
    });

    it('renders the login form correctly', () => {
        render(<Login />);

        expect(screen.getByRole('heading', { name: loginButtonName })).toBeInTheDocument();
        expect(screen.getByLabelText(usernameInputLabel)).toBeInTheDocument();
        expect(screen.getByLabelText(passwordInputLabel)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: loginButtonName })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: signupButtonName })).toBeInTheDocument();
        expect(screen.getByAltText(closeButtonAltText)).toBeInTheDocument(); // Use alt text

        // Error message should not be present initially
        expect(screen.queryByRole('alert')).not.toBeInTheDocument(); // Assuming error uses an alert role implicitly or explicitly
        // Or check for specific class if no role is set:
        // expect(screen.queryByText(/error/i)).not.toBeInTheDocument(); // Less specific
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
        const closeButton = screen.getByAltText(closeButtonAltText); // Use alt text

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

        // Fill in the form
        fireEvent.change(screen.getByLabelText(usernameInputLabel), { target: { value: testUsername } });
        fireEvent.change(screen.getByLabelText(passwordInputLabel), { target: { value: testPassword } });

        // Submit the form
        const loginButton = screen.getByRole('button', { name: loginButtonName });
        fireEvent.click(loginButton);

        // Wait for async operations
        await waitFor(() => {
            // Check if axios was called correctly
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post).toHaveBeenCalledWith(
                'http://127.0.0.1:8000/api/login/',
                { username: testUsername, password: testPassword }, // Check submitted data
                { headers: { "Content-Type": "application/json" }, withCredentials: true } // Check headers/options
            );
        });

        await waitFor(() => {
             // Check if successfulLogin was called with response data
             expect(successfulLogin).toHaveBeenCalledTimes(1);
             expect(successfulLogin).toHaveBeenCalledWith(mockUserData);
        });

         // Ensure no error message is shown
         expect(screen.queryByRole('alert')).not.toBeInTheDocument(); // Or queryByText if no role
    });

    it('displays API error message on failed form submission (e.g., wrong credentials)', async () => {
        const errorMessage = 'Invalid credentials provided.';
        const mockErrorResponse = {
            response: {
                data: { error: errorMessage },
                status: 401 // Example status for invalid credentials
            }
        };
        mockedAxios.post.mockRejectedValue(mockErrorResponse);
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console error

        render(<Login />);

        // Fill in the form
        fireEvent.change(screen.getByLabelText(usernameInputLabel), { target: { value: 'wronguser' } });
        fireEvent.change(screen.getByLabelText(passwordInputLabel), { target: { value: 'wrongpass' } });

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: loginButtonName }));

        // Wait for error message to appear
        const errorElement = await screen.findByText(errorMessage);
        expect(errorElement).toBeInTheDocument();
        // Optionally check its role or class: expect(errorElement).toHaveClass('error-message');

        // Ensure successfulLogin was NOT called
        expect(successfulLogin).not.toHaveBeenCalled();

        // Ensure console.error was called
        expect(consoleErrorSpy).toHaveBeenCalledWith('Login error:', mockErrorResponse.response.data);

        consoleErrorSpy.mockRestore();
    });

     it('displays generic error message on network or unexpected error', async () => {
         const networkError = new Error('Network failed');
         mockedAxios.post.mockRejectedValue(networkError);
         const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console error

         render(<Login />);

         // Fill in the form
         fireEvent.change(screen.getByLabelText(usernameInputLabel), { target: { value: 'user' } });
         fireEvent.change(screen.getByLabelText(passwordInputLabel), { target: { value: 'pass' } });

         // Submit the form
         fireEvent.click(screen.getByRole('button', { name: loginButtonName }));

         // Wait for the generic error message to appear
         const errorElement = await screen.findByText(/An unexpected error occurred/i);
         expect(errorElement).toBeInTheDocument();

         // Ensure successfulLogin was NOT called
         expect(successfulLogin).not.toHaveBeenCalled();

         // Ensure console.error was called
         expect(consoleErrorSpy).toHaveBeenCalledWith('Unexpected error:', networkError);

         consoleErrorSpy.mockRestore();
     });
});