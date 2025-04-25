// import React from 'react';
// import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
// import '@testing-library/jest-dom';
// import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// import axios from 'axios';
// import GamePage from '../assets/gamepage.jsx';

// vi.mock('axios');
// const mockedAxios = axios as unknown as {
//   get: ReturnType<typeof vi.fn>;
//   post: ReturnType<typeof vi.fn>;
// };

// describe('GamePage', () => {
//   beforeEach(() => {
//     mockedAxios.get.mockClear();
//     mockedAxios.post.mockClear();

//     mockedAxios.get
//       .mockResolvedValueOnce({
//         data: [
//           { title: 'Book 1', description: 'Description 1', is_correct: true },
//           { title: 'Book 2', description: 'Description 2', is_correct: false },
//           { title: 'Book 3', description: 'Description 3', is_correct: false },
//           { title: 'Book 4', description: 'Description 4', is_correct: false },
//           { title: 'Book 5', description: 'Description 5', is_correct: false },
//         ],
//       }) // Mock response for fetching books
//       .mockResolvedValueOnce({
//         data: { high_score: 5 },
//       }); // Mock response for fetching high score

//     mockedAxios.post.mockResolvedValue({ data: { message: 'High score updated' } });
//   });

//   afterEach(() => {
//     vi.clearAllMocks();
//     cleanup();
//   });

//   it('renders loading initially', () => {
//     render(<GamePage />);
//     expect(screen.getByText(/Loading new books.../i)).toBeInTheDocument();
//   });

//   it('renders game page with books after fetching data', async () => {
//     render(<GamePage />);

//     expect(await screen.findByText(/Guess the Book/i)).toBeInTheDocument();
//     expect(await screen.findByText('Description 1')).toBeInTheDocument();

//     const buttons = await screen.findAllByRole('button', { name: /Book/i });
//     expect(buttons).toHaveLength(5);
//   });

//   it('handles correct book selection', async () => {
//     render(<GamePage />);

//     const correctButton = await screen.findByRole('button', { name: /Book 1/i });
//     fireEvent.click(correctButton);

//     await waitFor(() => {
//       expect(screen.getByText(/Correct!/i)).toBeInTheDocument();
//     });

//     expect(mockedAxios.post).toHaveBeenCalledWith(
//       'http://127.0.0.1:8000/api/high-score/',
//       { high_score: 1 },
//       expect.any(Object)
//     );
//   });

//   it('handles incorrect book selection', async () => {
//     render(<GamePage />);

//     const incorrectButton = await screen.findByRole('button', { name: /Book 2/i });
//     fireEvent.click(incorrectButton);

//     await waitFor(() => {
//       expect(screen.getByText(/Game Over! Your streak was: 0/i)).toBeInTheDocument();
//     });
//   });

//   it('restarts the game after game over', async () => {
//     render(<GamePage />);

//     const incorrectButton = await screen.findByRole('button', { name: /Book 2/i });
//     fireEvent.click(incorrectButton);

//     await waitFor(() => {
//       expect(screen.getByText(/Game Over! Your streak was: 0/i)).toBeInTheDocument();
//     });

//     const restartButton = screen.getByRole('button', { name: /Try Again/i });
//     fireEvent.click(restartButton);

//     await waitFor(() => {
//       expect(screen.getByText(/Guess the Book/i)).toBeInTheDocument();
//     });
//   });

//   it('displays error message on API failure', async () => {
//     mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

//     render(<GamePage />);

//     expect(await screen.findByText(/Failed to fetch books. Please try again later./i)).toBeInTheDocument();
//   });
// });