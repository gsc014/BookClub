// src/__tests__/header.test.tsx (or .jsx)

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useNavigate } from 'react-router-dom';

// Component to test
import Header from '../assets/header'; // Adjust path if necessary

// Mock imported functions/modules
import { handleLogin } from '../utils'; // Import the function to mock

// --- Mocks ---

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate, // Override useNavigate with our mock
    };
});

// Mock the utils module to mock handleLogin
vi.mock('../utils.jsx', () => ({
    // Add other exports from utils if Header uses them, otherwise just mock what's needed
    handleLogin: vi.fn(),
    // Keep other potential exports if needed by other components mocked elsewhere
    // closeTabs: vi.fn(),
    // showSignInTab: vi.fn(),
    // showLogInTab: vi.fn(),
}));

// Mock image imports (Vitest often handles this with Vite config,
// but explicit mocks prevent issues and ensure tests don't rely on build process)
vi.mock('../assets/pictures/user.png', () => ({ default: 'user.png' }));
vi.mock('../assets/pictures/settings_icon.png', () => ({ default: 'settings_icon.png' }));
vi.mock('../assets/pictures/game_icon.png', () => ({ default: 'game_icon.png' }));


// --- Test Suite ---

describe('Header Component', () => {

    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
    });

    // Clean up after tests if needed (clearAllMocks in beforeEach is usually enough)
    // afterEach(() => {});

    it('renders the header with logo and icons', () => {
        render(<Header />);

        // Check for the logo link text
        expect(screen.getByRole('link', { name: /book club/i })).toBeInTheDocument();

        // Check for icons using alt text (RECOMMENDED: Add alt text to Header.jsx)
        expect(screen.getByAltText(/game page/i)).toBeInTheDocument();
        expect(screen.getByAltText(/user login\/profile/i)).toBeInTheDocument();
        expect(screen.getByAltText(/settings page/i)).toBeInTheDocument();

        // Alternative check if alt text is NOT added (less recommended)
        // You might need to make IDs more specific if these are too generic
        // expect(screen.getByRole('img', {name: ''})).toBeInTheDocument(); // This won't work well
        // expect(document.getElementById('Game')).toBeInTheDocument(); // Uses document directly, less ideal
        // expect(document.getElementById('User')).toBeInTheDocument();
        // expect(document.getElementById('Settings')).toBeInTheDocument();
    });

    it('navigates to home "/" when logo is clicked', () => {
        render(<Header />);
        const logoLink = screen.getByRole('link', { name: /book club/i });

        fireEvent.click(logoLink);

        // Check if navigate was called correctly
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('navigates to "/game" when game icon is clicked', () => {
        render(<Header />);
        const gameIcon = screen.getByAltText(/game page/i); // Use Alt Text

        fireEvent.click(gameIcon);

        // Check if navigate was called correctly
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/game');
    });

    it('navigates to "/settings" when settings icon is clicked', () => {
        render(<Header />);
        const settingsIcon = screen.getByAltText(/settings page/i); // Use Alt Text

        fireEvent.click(settingsIcon);

        // Check if navigate was called correctly
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });

    it('calls handleLogin when user icon is clicked', () => {
        render(<Header />);
        const userIcon = screen.getByAltText(/user login\/profile/i); // Use Alt Text

        fireEvent.click(userIcon);

        // Check if the mocked handleLogin function was called
        expect(handleLogin).toHaveBeenCalledTimes(1);

        // Ensure navigation didn't happen for this click
        expect(mockNavigate).not.toHaveBeenCalled();
    });

});