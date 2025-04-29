import { render, screen, waitFor } from '@testing-library/react';
// Import Mock from vitest
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as utils from '../utils';
import { App } from '../App'; 

// Create a proper mock Response object
const createMockResponse = (data: any, status = 200): Response => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: vi.fn(() => ({ ...createMockResponse(data, status) })), // Keep simple clone mock
    body: null, // ReadableStream<Uint8Array> | null; - can often be null in mocks
    bodyUsed: false,
    arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(0))),
    blob: vi.fn(() => Promise.resolve(new Blob())),
    formData: vi.fn(() => Promise.resolve(new FormData())),
    text: vi.fn(() => Promise.resolve(JSON.stringify(data))),
    // Add the missing bytes method
    bytes: vi.fn(() => Promise.resolve(new Uint8Array())), // Mock returns a promise resolving to an empty Uint8Array
  });
// Define the fetch mock with Vitest types
// Arguments: input (RequestInfo | URL), init? (RequestInit)
// Return: Promise<Response>
// Note: globalThis is often preferred over global for better environment compatibility
globalThis.fetch = vi.fn() as Mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>;


describe('App Routing and Authentication', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        // Reset the default fetch mock implementation before each test
        (globalThis.fetch as Mock).mockResolvedValue(createMockResponse({}));
    });

    // --- Remove mocks for components if you want to test their actual rendering ---
    // If you keep component mocks, ensure they match imports like before.
    // If testing App more integratedly, remove these mocks. Example:
    // vi.mock('../assets', () => ({ ... })); // Remove or adjust if needed

    describe('Public Routes', () => {
        it('renders the home page with expected elements', async () => { // Changed to async
            render(
                <MemoryRouter initialEntries={['/']}>
                    <App />
                </MemoryRouter>
            );

            // Use await findBy... for potentially async elements or waitFor
            // Assuming Searchbar, Login, Signin render these elements:
            await waitFor(() => {
                // Adjust queries based on actual rendered elements by your REAL components
                // If you removed component mocks, these queries need to match real component output
                expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument(); // Example, adjust as needed
                // expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
                // expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
                // expect(screen.getByTestId('mock-header')).toBeInTheDocument(); // If header mock remains
            });
        });

        it('renders search results page', async () => {
            // Mock potential fetch calls if SearchResults makes them
            (globalThis.fetch as Mock).mockResolvedValue(createMockResponse({ items: [] })); // Example

            render(
                <MemoryRouter initialEntries={[{ pathname: '/searchresults', state: { results: [] } }]}>
                    <App />
                </MemoryRouter>
            );

            // Assuming SearchResults component renders this text:
            await waitFor(() => {
                // Query based on what SearchResults actually renders
                expect(screen.getByText(/search results/i)).toBeInTheDocument(); // Example, adjust
            });
        });

        
    });


    // Test initial auth check
    it('calls checkInitialAuthState on mount', () => {
        const checkAuthMock = vi.spyOn(utils, 'checkInitialAuthState').mockReturnValue(false); // Spy and mock return value

        render(
            <MemoryRouter initialEntries={['/']}>
                <App />
            </MemoryRouter>
        );

        expect(checkAuthMock).toHaveBeenCalledTimes(1);
    });
});