import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Tabs from '../assets/Tabs'; // Adjust the import path accordingly
import axios from 'axios';
import { BrowserRouter, useNavigate } from 'react-router-dom';

// Mock axios.get properly
vi.mock('axios', () => ({
    get: vi.fn(),
  }));
// Mock react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    BrowserRouter: ({ children }: any) => <div>{children}</div>,  // Mock BrowserRouter to just render children
    useNavigate: vi.fn(), // Mock useNavigate hook
  };
});

describe('Tabs Component', () => {
  const mockNavigate = vi.fn(); // Mock navigate function
  const mockData = { results: ['Book 1', 'Book 2'] }; // Sample mock data
  
  beforeEach(() => {
    // Reset mocks before each test
    vi.mocked(axios.get).mockImplementationOnce(() => 
      Promise.resolve({ data: mockData })  // Mock successful API response
    );
    vi.mocked(useNavigate).mockReturnValue(mockNavigate); // Mock useNavigate
  });

  it('renders the SubjectsHeader component', () => {
    render(
      <BrowserRouter>
        <Tabs />
      </BrowserRouter>
    );
    
    // Check if SubjectsHeader component is rendered by verifying the subject buttons
    const subjectButtons = screen.getAllByRole('button');
    expect(subjectButtons).toHaveLength(9);  // Assuming there are 9 subjects
  });

  it('calls handleFilterSelect and navigates on selecting a subject', async () => {
    render(
      <BrowserRouter>
        <Tabs />
      </BrowserRouter>
    );

    const filter = 'Drama';
    
    // Find the "Drama" button in SubjectsHeader and simulate a click
    const dramaButton = screen.getByText(filter);
    fireEvent.click(dramaButton);
    
    // Check if axios.get was called with the correct URL
    expect(axios.get).toHaveBeenCalledWith(`http://127.0.0.1:8000/api/filter/?filter=${filter}`);

    // Wait for navigation to happen after the mock API response
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/searchresults', { state: { results: mockData } });
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock the API request to reject with an error
    (axios.get as vi.Mock).mockRejectedValue(new Error('API Error')); // Casting to vi.Mock

    // Spy on console.error to check if it's being called
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Render the Tabs component wrapped in a BrowserRouter
    render(
      <BrowserRouter>
        <Tabs />
      </BrowserRouter>
    );

    // Simulate selecting a filter to trigger the API call
    const filter = 'Fiction';
    const button = screen.getByText(filter); // Assuming the button text matches the filter
    button.click();

    // Wait for the error handling to be executed
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching filtered results:', expect.any(Error));
    });

    // Clean up the spy
    consoleErrorSpy.mockRestore();
  });

});
