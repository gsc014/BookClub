import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';

import MostActiveUsers from '../assets/mostActiveUsers';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

vi.mock('../assets/pictures/user.png', () => ({ default: 'defaultAvatar.png' }));

const mockUsers = [
    {
        id: 1,
        username: 'userOne',
        review_count: 25,
        latest_activity: {
            book_id: 'b1',
            book_title: 'Book A',
            rating: 5,
            date: '2024-01-15T10:00:00Z',
        },
    },
    {
        id: 2,
        username: 'userTwo',
        review_count: 18,
        latest_activity: {
            book_id: 'b2',
            book_title: 'Book B',
            rating: 4,
            date: '2024-01-10T12:30:00Z',
        },
    },
    {
        id: 3,
        username: 'userThree',
        review_count: 10,
        latest_activity: null,
    },
];
const apiUrl = 'http://127.0.0.1:8000/api/most-active-users/';

const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(ui, { wrapper: BrowserRouter });
};

describe('MostActiveUsers Component', () => {
    let consoleErrorSpy: MockInstance;
    let consoleLogSpy: MockInstance;

    beforeEach(() => {
        vi.resetAllMocks();
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        mockedAxios.get.mockResolvedValue({ data: [...mockUsers] });
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        consoleLogSpy.mockRestore();
        vi.restoreAllMocks();
    });

    it('renders loading state initially', () => {
        mockedAxios.get.mockImplementation(() => new Promise(() => {}));
        renderWithRouter(<MostActiveUsers />);
        expect(screen.getByText(/Loading top reviewers.../i)).toBeInTheDocument();
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            apiUrl,
            expect.objectContaining({ params: { num: 5 } })
        );
    });

    it('renders the list of active users successfully after fetch', async () => {
        renderWithRouter(<MostActiveUsers />);
        await waitFor(() => {
            expect(screen.queryByText(/Loading top reviewers.../i)).not.toBeInTheDocument();
        });
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            apiUrl,
            expect.objectContaining({ params: { num: 5 } })
        );

        for (const user of mockUsers) {
            const userCardElement = screen.getByText(user.username).closest('.active-user-card');
            expect(userCardElement).toBeInTheDocument();
            const utils = within(userCardElement as HTMLElement);

            const userLink = utils.getByRole('link', { name: new RegExp(user.username, 'i') });
            expect(userLink).toHaveAttribute('href', `/profile/${user.username}`);

            const avatarImg = utils.getByAltText(user.username);
            expect(avatarImg).toHaveAttribute('src');

            expect(utils.getByText(user.username)).toBeInTheDocument();
            expect(utils.getByText(`${user.review_count} reviews`)).toBeInTheDocument();

            if (user.latest_activity) {
                 expect(utils.getByText(/Recently reviewed:/i)).toBeInTheDocument();
                 const activityLink = utils.getByRole('link', { name: new RegExp(user.latest_activity.book_title, 'i') });
                 expect(activityLink).toHaveAttribute('href', `/books/${user.latest_activity.book_id}`);
                 expect(utils.getByText(user.latest_activity.book_title)).toBeInTheDocument();
                 expect(utils.getByText(`★ ${user.latest_activity.rating}`)).toBeInTheDocument();
                 expect(utils.getByText(new Date(user.latest_activity.date).toLocaleDateString())).toBeInTheDocument();
            } else {
                 expect(utils.queryByText(/Recently reviewed:/i)).not.toBeInTheDocument();
            }
        }
    });

    it('uses the custom limit prop when provided', async () => {
        const customLimit = 2;
        mockedAxios.get.mockResolvedValueOnce({ data: mockUsers.slice(0, customLimit) });
        renderWithRouter(<MostActiveUsers limit={customLimit} />);
        await waitFor(() => {
            expect(screen.queryByText(/Loading top reviewers.../i)).not.toBeInTheDocument();
        });

        const profileLinks = screen.getAllByRole('link', { name: /user/i });
        expect(profileLinks.length).toBe(customLimit);

        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(
            apiUrl,
            expect.objectContaining({ params: { num: customLimit } })
        );

        expect(screen.getByText(mockUsers[0].username)).toBeInTheDocument();
        expect(screen.getByText(mockUsers[1].username)).toBeInTheDocument();
        expect(screen.queryByText(mockUsers[2].username)).not.toBeInTheDocument();
    });

    it('renders "No active users found" message when API returns empty array', async () => {
        mockedAxios.get.mockResolvedValueOnce({ data: [] });
        renderWithRouter(<MostActiveUsers />);
        expect(await screen.findByText(/No active users found/i)).toBeInTheDocument();
        expect(screen.queryByText(/Loading top reviewers.../i)).not.toBeInTheDocument();
    });

    it('renders error message and logs error when fetch fails', async () => {
        const mockError = new Error('Server unavailable');
        mockedAxios.get.mockRejectedValueOnce(mockError);
        renderWithRouter(<MostActiveUsers />);
        expect(await screen.findByText(/Failed to load active users/i)).toBeInTheDocument();
        expect(screen.queryByText(/Loading top reviewers.../i)).not.toBeInTheDocument();
        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching active users:", mockError);
    });
});