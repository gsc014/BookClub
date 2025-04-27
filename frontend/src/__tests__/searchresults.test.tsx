import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SearchResults from '../assets/searchresults.jsx'; // adjust path if needed

// Mock the Bookcard component because you just want to test SearchResults
vi.mock('../assets/bookcard.jsx', () => ({
    default: ({ book }: { book: { title: string } }) => <div data-testid="bookcard">{book.title}</div>,
  }));
  

describe('SearchResults', () => {
  const mockBooks = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    title: `Book ${i + 1}`,
  }));

  it('renders search results title', () => {
    render(<SearchResults results={mockBooks} />);
    expect(screen.getByText(/Search Results/i)).toBeInTheDocument();
  });

  it('renders initial 10 results per page', () => {
    render(<SearchResults results={mockBooks} />);
    const bookcards = screen.getAllByTestId('bookcard');
    expect(bookcards.length).toBe(10);
  });

  it('changes results per page', () => {
    render(<SearchResults results={mockBooks} />);

    const select = screen.getByLabelText(/Results per page/i);
    fireEvent.change(select, { target: { value: '5' } });

    const bookcards = screen.getAllByTestId('bookcard');
    expect(bookcards.length).toBe(5);
  });

  it('navigates to next and previous pages', () => {
    render(<SearchResults results={mockBooks} />);

    const nextButton = screen.getByText(/Next/i);
    fireEvent.click(nextButton);

    expect(screen.getByText(/Page 2 of 2/i)).toBeInTheDocument();

    const prevButton = screen.getByText(/Previous/i);
    fireEvent.click(prevButton);

    expect(screen.getByText(/Page 1 of 2/i)).toBeInTheDocument();
  });

  it('disables Previous button on first page', () => {
    render(<SearchResults results={mockBooks} />);
    const prevButton = screen.getByText(/Previous/i);
    expect(prevButton).toBeDisabled();
  });

  it('disables Next button on last page', () => {
    render(<SearchResults results={mockBooks} />);
    const nextButton = screen.getByText(/Next/i);

    // Click Next to go to the last page
    fireEvent.click(nextButton);

    expect(nextButton).toBeDisabled();
  });
});
