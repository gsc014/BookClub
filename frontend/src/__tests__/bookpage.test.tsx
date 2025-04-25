import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import Bookpage from '../assets/bookpage';

vi.mock('axios');
const mockedAxios = axios as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe('Bookpage', () => {
  const mockBook = { id: 1, title: 'Test Book', author: 'Test Author' };
  const mockRetrievedBook = {
    title: 'Test Book',
    author: 'Test Author',
    description: 'This is a test description.',
    cover: '12345',
    key: 'test-key',
  };
  const mockReviews = [
    { text: 'Great book!', rating: 5, created_at: '2023-01-01T00:00:00Z' },
    { text: 'Not bad.', rating: 3, created_at: '2023-01-02T00:00:00Z' },
  ];

  beforeEach(() => {
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/api/book/')) {
        return Promise.resolve({ data: mockRetrievedBook });
      }
      if (url.includes('/api/reviews/')) {
        return Promise.resolve({ data: mockReviews });
      }
      if (url.includes('/api/isbn/')) {
        return Promise.resolve({ data: '9781234567890' });
      }
      return Promise.reject(new Error('Unknown API endpoint'));
    });

    mockedAxios.post.mockResolvedValue({ data: { message: 'Review submitted' } });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders loading state initially', () => {
    render(<Bookpage book={mockBook} />);
    expect(screen.getByText(/Loading book information.../i)).toBeInTheDocument();
  });

  it('renders book details after fetching data', async () => {
    render(<Bookpage book={mockBook} />);

    expect(await screen.findByText(/Test Book/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Author/i)).toBeInTheDocument();
    expect(screen.getByText(/This is a test description./i)).toBeInTheDocument();
    expect(screen.getByAltText(/Test Book/i)).toHaveAttribute(
      'src',
      'https://covers.openlibrary.org/b/id/12345-L.jpg'
    ); // Updated alt text to match the rendered output
  });

  it('renders reviews after fetching data', async () => {
    render(<Bookpage book={mockBook} />);

    expect(await screen.findByText(/Reviews:/i)).toBeInTheDocument();
    expect(screen.getByText(/Great book!/i)).toBeInTheDocument();
    expect(screen.getByText(/Not bad./i)).toBeInTheDocument();
  });

  it('handles review submission', async () => {
    const authToken = 'test-token';
    localStorage.setItem('authToken', authToken);

    render(<Bookpage book={mockBook} />);

    const reviewInput = await screen.findByPlaceholderText(/Write your review here.../i);
    const submitButton = screen.getByText(/Submit Review/i);

    fireEvent.change(reviewInput, { target: { value: 'Amazing book!' } });

    // Select the 5th star (index 4) to set the rating
    const stars = screen.getAllByText(/★/i);
    fireEvent.click(stars[4]);

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `http://127.0.0.1:8000/api/reviewtest/1/`,
        { text: 'Amazing book!', rating: 5 },
        { headers: { Authorization: `Token ${authToken}` } }
      );
      expect(screen.getByText(/Your review has been submitted!/i)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

    render(<Bookpage book={mockBook} />);

    expect(await screen.findByText(/Loading book information.../i)).toBeInTheDocument();
    expect(await screen.findByText(/Failed to fetch book details/i)).toBeInTheDocument(); // Updated error message to match the component's output
  });
});
