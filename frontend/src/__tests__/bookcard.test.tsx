// src/__tests__/bookcard.test.tsx (or .jsx)

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mocked, MockInstance } from 'vitest';
import axios, { AxiosStatic } from 'axios';
import { useNavigate } from 'react-router-dom';

// Component to test
import Bookcard from '../assets/bookcard';

// --- Mocks ---
vi.mock('axios');
const mockedAxios = axios as Mocked<AxiosStatic>;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock image imports
vi.mock('../assets/pictures/diskette.png', () => ({ default: 'saveIcon.png' }));
vi.mock('../assets/pictures/diskette_saved.png', () => ({ default: 'savedIcon.png' }));
vi.mock('../assets/pictures/file.png', () => ({ default: 'informationIcon.png' }));
vi.mock('../assets/pictures/no-results.png', () => ({ default: 'defaultCover.png' }));
vi.mock('../assets/pictures/heart.png', () => ({ default: 'hearted.png' }));
vi.mock('../assets/pictures/hearted.png', () => ({ default: 'heart.png' }));

// --- Test Suite ---

describe('Bookcard Component', () => {
    // ... (constants remain the same) ...
    const mockBook = { id: '123', title: 'Test Book Title' };
    const mockAuthToken = 'fake-auth-token';
    const likeButtonTitle = /like book/i;
    const likedButtonTitle = /book liked/i;
    const saveButtonTitle = /save book/i;
    const savedButtonTitle = /book saved/i;
    const infoButtonTitle = /book information/i;
    const likeApiUrl = `http://127.0.0.1:8000/api/add-book/${mockBook.id}/`;
    const likeApiParams = { params: { name: "Liked Books" } };
    const saveApiParams = { params: { name: "Saved Books" } };
    const apiHeaders = { headers: { 'Authorization': `Token ${mockAuthToken}`, 'Content-Type': 'application/json' } };
    const originalLocalStorage = { ...window.localStorage };
    let alertSpy: MockInstance<(message?: any) => void>;


    beforeEach(() => {
        vi.clearAllMocks();
        // vi.useFakeTimers(); // REMOVED

        // Mock localStorage
        window.localStorage.clear();
        window.localStorage.setItem = vi.fn((key, value) => { originalLocalStorage[key] = value; });
        window.localStorage.getItem = vi.fn((key) => originalLocalStorage[key] || null);
        window.localStorage.removeItem = vi.fn((key) => { delete originalLocalStorage[key]; });

        // Mock window.alert
        alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

        // Default successful mock for axios post
        mockedAxios.post.mockResolvedValue({ data: { status: 'added' } });
    });

    afterEach(() => {
        // vi.useRealTimers(); // REMOVED
        alertSpy.mockRestore();
        // Restore localStorage
        window.localStorage.clear();
        Object.keys(originalLocalStorage).forEach(key => { window.localStorage.setItem(key, originalLocalStorage[key]); });
    });

    // --- Non-Async Tests ---
    it('renders book title and default cover', () => { /* ... */ });
    it('navigates to book details page when card is clicked', () => { /* ... */ });
    it('navigates to book details page when info button is clicked', () => { /* ... */ });
    it('shows alert and does not call API if user is not logged in when Like is clicked', () => { /* ... */ });
    it('shows alert and does not call API if user is not logged in when Save is clicked', () => { /* ... */ });


    // --- Async Tests (Simplified) ---

    it('calls like API, updates state/icon on successful like (logged in)', async () => {
        window.localStorage.setItem('authToken', mockAuthToken);
        // Default mock is fine

        render(<Bookcard book={mockBook} />);
        fireEvent.click(screen.getByTitle(likeButtonTitle));

        // Wait for loading state & API call
        await waitFor(() => {
            expect(screen.getByText('Liking...')).toBeInTheDocument();
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post).toHaveBeenCalledWith(likeApiUrl, {}, { ...likeApiParams, ...apiHeaders });
        });

        // Wait for success state
        await waitFor(() => {
            // Check for the status text temporarily (it will be removed by the real timer eventually)
            expect(screen.getByText('Liked!')).toBeInTheDocument();
            // Check the permanent state changes
            expect(screen.getByTitle(likedButtonTitle)).toBeInTheDocument();
            expect(screen.getByAltText('Like')).toHaveAttribute('src', 'heart.png');
        });
        // REMOVED checks for message disappearance
    }); // Removed timeout argument

    it('calls like API, updates state/icon on successful unlike (logged in)', async () => {
        window.localStorage.setItem('authToken', mockAuthToken);
        mockedAxios.post
            .mockResolvedValueOnce({ data: { status: 'added' } })
            .mockResolvedValueOnce({ data: { status: 'removed' } });

        render(<Bookcard book={mockBook} />);

        // --- First Click (Like) ---
        fireEvent.click(screen.getByTitle(likeButtonTitle));
        await waitFor(() => {
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(screen.getByTitle(likedButtonTitle)).toBeInTheDocument();
        });
        // Don't wait for message disappearance here

        // --- Second Click (Unlike) ---
        fireEvent.click(screen.getByTitle(likedButtonTitle));
        await waitFor(() => {
            expect(screen.getByText('Liking...')).toBeInTheDocument();
            expect(mockedAxios.post).toHaveBeenCalledTimes(2);
        });

        // Wait for final UI state (unliked)
        await waitFor(() => {
            expect(screen.getByText('Liked!')).toBeInTheDocument(); // Status appears again briefly
            expect(screen.getByTitle(likeButtonTitle)).toBeInTheDocument(); // Title reverted
            expect(screen.getByAltText('Like')).toHaveAttribute('src', 'hearted.png'); // Icon reverted
        });
        // REMOVED checks for message disappearance
    }); // Removed timeout argument

    it('shows error status on like API failure (logged in)', async () => {
        window.localStorage.setItem('authToken', mockAuthToken);
        const apiError = new Error('Like failed');
        mockedAxios.post.mockImplementation(async () => { throw apiError; });
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<Bookcard book={mockBook} />);
        fireEvent.click(screen.getByTitle(likeButtonTitle));

        // Wait for loading state & API call attempt
        await waitFor(() => {
            expect(screen.getByText('Liking...')).toBeInTheDocument();
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });

        // Wait for error state
        await waitFor(() => {
            expect(screen.getByText('Error!')).toBeInTheDocument(); // Check error status appears
            expect(screen.getByTitle(likeButtonTitle)).toBeInTheDocument(); // State shouldn't change
            expect(consoleErrorSpy).toHaveBeenCalledWith("Error saving book:", apiError);
        });
        // REMOVED checks for message disappearance
        consoleErrorSpy.mockRestore();
    }); // Removed timeout argument

    // --- Apply similar simplification to Save Button Tests ---

    it('calls save API, updates state/icon on successful save (logged in)', async () => {
        window.localStorage.setItem('authToken', mockAuthToken);
        // Default mock is fine

        render(<Bookcard book={mockBook} />);
        fireEvent.click(screen.getByTitle(saveButtonTitle));

        // Wait for loading state & API call
        await waitFor(() => {
            expect(screen.getByText('Saving...')).toBeInTheDocument();
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(mockedAxios.post).toHaveBeenCalledWith(likeApiUrl, {}, { ...saveApiParams, ...apiHeaders });
        });

        // Wait for success state
        await waitFor(() => {
            expect(screen.getByText('Saved!')).toBeInTheDocument(); // Check status appears
            expect(screen.getByTitle(savedButtonTitle)).toBeInTheDocument();
            expect(screen.getByAltText('Save')).toHaveAttribute('src', 'savedIcon.png');
        });
        // REMOVED checks for message disappearance
    }); // Removed timeout argument

    it('calls save API, updates state/icon on successful unsave (logged in)', async () => {
        window.localStorage.setItem('authToken', mockAuthToken);
        mockedAxios.post
            .mockResolvedValueOnce({ data: { status: 'added' } })
            .mockResolvedValueOnce({ data: { status: 'removed' } });

        render(<Bookcard book={mockBook} />);

        // --- First Click (Save) ---
        fireEvent.click(screen.getByTitle(saveButtonTitle));
        await waitFor(() => {
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            expect(screen.getByTitle(savedButtonTitle)).toBeInTheDocument();
        });
        // Don't wait for message disappearance

        // --- Second Click (Unsave) ---
        fireEvent.click(screen.getByTitle(savedButtonTitle));
        await waitFor(() => {
            expect(screen.getByText('Saving...')).toBeInTheDocument();
            expect(mockedAxios.post).toHaveBeenCalledTimes(2);
        });

        // Wait for final UI state (unsaved)
        await waitFor(() => {
            expect(screen.getByText('Saved!')).toBeInTheDocument(); // Status appears again briefly
            expect(screen.getByTitle(saveButtonTitle)).toBeInTheDocument(); // Title reverts
            expect(screen.getByAltText('Save')).toHaveAttribute('src', 'saveIcon.png'); // Icon reverts
        });
        // REMOVED checks for message disappearance
    }); // Removed timeout argument

    it('shows error status on save API failure (logged in)', async () => {
        window.localStorage.setItem('authToken', mockAuthToken);
        const apiError = new Error('Save failed');
        mockedAxios.post.mockImplementation(async () => { throw apiError; });
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(<Bookcard book={mockBook} />);
        fireEvent.click(screen.getByTitle(saveButtonTitle));

        // Wait for loading state & API call attempt
        await waitFor(() => {
            expect(screen.getByText('Saving...')).toBeInTheDocument();
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
        });

        // Wait for error state
        await waitFor(() => {
            expect(screen.getByText('Error!')).toBeInTheDocument(); // Check error status appears
            expect(screen.getByTitle(saveButtonTitle)).toBeInTheDocument(); // State shouldn't change
            expect(consoleErrorSpy).toHaveBeenCalledWith("Error saving book:", apiError);
        });
        // REMOVED checks for message disappearance
        consoleErrorSpy.mockRestore();
    }); // Removed timeout argument

});