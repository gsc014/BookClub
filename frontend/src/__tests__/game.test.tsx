import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi, MockInstance } from 'vitest';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

import Game from '../assets/game';

describe('Game Component', () => {
    const mockBook = {
        title: 'Test Book',
        cover: 12345
    };

    let alertSpy: MockInstance;

    beforeEach(() => {
        mockedAxios.get.mockResolvedValue({ data: mockBook });
        alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.clearAllMocks();
        cleanup();
    });

    it('renders image, input, and button', async () => {
        render(<Game />);
        expect(await screen.findByAltText('Random')).toBeInTheDocument();
        expect(screen.getByLabelText(/Book Name/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Guess book name/i })).toBeInTheDocument();
    });

    it('removes blur and shows alert on correct guess', async () => {
        render(<Game />);
        const img = await screen.findByAltText('Random');
        const input = screen.getByLabelText(/Book Name/i);
        const button = screen.getByRole('button', { name: /Guess book name/i });

        await userEvent.type(input, mockBook.title);
        await userEvent.click(button);

        expect(alertSpy).toHaveBeenCalled();
        expect(img).toHaveStyle('filter: blur(0px)');
    });

    it('reduces blur on incorrect guess', async () => {
        render(<Game />);
        const img = await screen.findByAltText('Random');
        const input = screen.getByLabelText(/Book Name/i);
        const button = screen.getByRole('button', { name: /Guess book name/i });

        await userEvent.type(input, 'Wrong Title');
        await userEvent.click(button);

        expect(img).toHaveStyle('filter: blur(4px)');
    });
});
