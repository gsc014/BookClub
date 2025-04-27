/// <reference types="vitest" />

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { act } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Searchbar from '../assets/searchbar.jsx';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Proper axios mock
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

// Component mocks
vi.mock('../assets/searchresults.jsx', () => ({
  default: ({ results }: { results: any[] }) => (
    <div data-testid="searchresults">{results.length} results</div>
  ),
}));

vi.mock('../assets/subjectheader.jsx', () => ({
  default: ({ onSelect }: { onSelect: any }) => (
    <button onClick={() => onSelect('fiction')} data-testid="subject-header">
      Filter: Fiction
    </button>
  ),
}));

vi.mock('../assets/welcome.jsx', () => ({
  default: () => <div data-testid="welcome">Welcome</div>,
}));

describe('Searchbar', () => {
  let navigateSpy: any;

  beforeEach(() => {
    navigateSpy = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigateSpy);
    vi.clearAllMocks();
  });

  it('renders input and search button', () => {
    render(<Searchbar />);

    expect(screen.getByPlaceholderText(/Search for books/i)).toBeInTheDocument();
    expect(screen.getByText(/Search/i)).toBeInTheDocument();
    expect(screen.getByTestId('welcome')).toBeInTheDocument();
  });

  it('does not fetch suggestions for queries shorter than 5 characters', () => {
    render(<Searchbar />);
    const input = screen.getByPlaceholderText(/Search for books/i);

    fireEvent.change(input, { target: { value: 'abc' } });
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('fetches suggestions for queries 5 characters or longer', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [{ id: 1, title: 'Book 1' }] });

    render(<Searchbar />);
    const input = screen.getByPlaceholderText(/Search for books/i);

    fireEvent.change(input, { target: { value: 'abcdef' } });

    await waitFor(() => expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/autocomplete',
      { params: { query: 'abcdef' } }
    ));
  });

  it('navigates to book page when clicking object suggestion', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [{ id: 1, title: 'Test Book' }] });

    render(<Searchbar />);
    const input = screen.getByPlaceholderText(/Search for books/i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'abcdef' } });
    });

    await waitFor(() => screen.getByText(/Test Book/i));

    fireEvent.click(screen.getByText(/Test Book/i));

    expect(navigateSpy).toHaveBeenCalledWith('/books/1', {
      state: { book: { id: 1, title: 'Test Book', book: undefined } },
    });
  });

  
  it('searches and navigates to results page', async () => {
    // Proper mock response structure
    mockedAxios.get.mockResolvedValue({
      data: [{ id: 1, title: 'Test Book' }]
    });

    render(<Searchbar />);
    const input = screen.getByPlaceholderText(/Search for books/i);
    const searchButton = screen.getByText(/Search/i);

    await act(async () => {
      fireEvent.change(input, { target: { value: 'abcdef' } });
      fireEvent.click(searchButton);
    });

    // Verify API call
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/search/?q=abcdef'
    );

    // Verify navigation
    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalledWith('/searchresults', {
        state: { results: [{ id: 1, title: 'Test Book' }] },
      });
    });
  });


  it('applies filter and navigates to results page', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [{ id: 2, title: 'Filtered Book' }] });

    render(<Searchbar />);
    const filterButton = screen.getByTestId('subject-header');

    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('http://127.0.0.1:8000/api/filter/?filter=fiction');
      expect(navigateSpy).toHaveBeenCalledWith('/searchresults', {
        state: { results: [{ id: 2, title: 'Filtered Book' }] },
      });
    });
  });
});
