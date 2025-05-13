import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import * as utils from '../utils';
import { App } from '../App'; 

const createMockResponse = (data: any, status = 200): Response => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: vi.fn(() => ({ ...createMockResponse(data, status) })),
    body: null,
    bodyUsed: false,
    arrayBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(0))),
    blob: vi.fn(() => Promise.resolve(new Blob())),
    formData: vi.fn(() => Promise.resolve(new FormData())),
    text: vi.fn(() => Promise.resolve(JSON.stringify(data))),
    bytes: vi.fn(() => Promise.resolve(new Uint8Array())),
  });
globalThis.fetch = vi.fn() as Mock<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>;

describe('App Routing and Authentication', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        (globalThis.fetch as Mock).mockResolvedValue(createMockResponse({}));
    });

    describe('Public Routes', () => {
        it('renders the home page with expected elements', async () => {
            render(
                <MemoryRouter initialEntries={['/']}>
                    <App />
                </MemoryRouter>
            );
            await waitFor(() => {
                expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
            });
        });

        it('renders search results page', async () => {
            (globalThis.fetch as Mock).mockResolvedValue(createMockResponse({ items: [] }));
            render(
                <MemoryRouter initialEntries={[{ pathname: '/searchresults', state: { results: [] } }]}>
                    <App />
                </MemoryRouter>
            );
            await waitFor(() => {
                expect(screen.getByText(/search results/i)).toBeInTheDocument();
            });
        });
    });

    it('calls checkInitialAuthState on mount', () => {
        const checkAuthMock = vi.spyOn(utils, 'checkInitialAuthState').mockReturnValue(false);
        render(
            <MemoryRouter initialEntries={['/']}>
                <App />
            </MemoryRouter>
        );
        expect(checkAuthMock).toHaveBeenCalledTimes(1);
    });
});