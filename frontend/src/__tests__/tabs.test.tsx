// src/__tests__/tabs.test.tsx

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock, Mocked } from 'vitest'; // Added Mock type
import axios, { AxiosStatic } from 'axios';
import { useNavigate } from 'react-router-dom';

// Import the component to test
import Tabs from '../assets/Tabs.jsx';

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

// Mock the SubjectsHeader component INSIDE the factory
vi.mock('../assets/subjectheader', () => {
    // Define the mock component structure within the factory
    const MockSubjectsHeaderComponent = vi.fn(({ onSelect }) => (
        <div data-testid="mock-subjects-header" onClick={() => onSelect('history')}> {/* Provide a default value or handle appropriately */}
            Mock Subjects Header Content
        </div>
    ));
    // Return the object structure expected by the module system
    return {
        default: MockSubjectsHeaderComponent
    };
});

// --- Test Suite ---

describe('Tabs Component', () => {
    const mockApiData = { results: [{ id: 1, title: 'Filtered Book' }] };
    const filterValue = 'history';
    const expectedUrl = `http://127.0.0.1:8000/api/filter/?filter=${filterValue}`;

    // Declare a variable to hold the reference to the actual mock function instance
    let MockSubjectsHeaderInstance: Mock;

    beforeEach(async () => {
        // Dynamically import the *mocked* module to get the instance
        // This needs to be done AFTER vi.mock has run
        const SubjectsHeaderMockedModule = await import('../assets/subjectheader');
        MockSubjectsHeaderInstance = SubjectsHeaderMockedModule.default as Mock;

        // Reset mocks before each test
        vi.clearAllMocks(); // Clears axios, navigate
        MockSubjectsHeaderInstance.mockClear(); // Clear calls/instances of the header mock specifically

        // Setup default mock behaviors
        mockedAxios.get.mockResolvedValue({ data: mockApiData });

        // Optional: If you need to override the default implementation from the factory for specific tests,
        // you can do it here or within the 'it' block using MockSubjectsHeaderInstance.mockImplementation(...)
        // For now, the factory implementation might be enough. If tests fail related to onClick,
        // you might need to set a specific implementation here.
        MockSubjectsHeaderInstance.mockImplementation(({ onSelect }) => (
             <div data-testid="mock-subjects-header" onClick={() => onSelect(filterValue)}>
                 Mock Subjects Header Content
             </div>
         ));
    });

    afterEach(() => {
        // Optional: vi.clearAllMocks() in beforeEach is usually sufficient
    });

    it('renders the SubjectsHeader component', () => {
        render(<Tabs />);
        // Check if our mocked SubjectsHeader was rendered using the instance
        expect(MockSubjectsHeaderInstance).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('mock-subjects-header')).toBeInTheDocument();
    });

    it('calls axios.get with the correct URL when a filter is selected', async () => {
        render(<Tabs />);

        // Get the onSelect prop passed to the mock instance
        const passedProps = MockSubjectsHeaderInstance.mock.calls[0][0];
        const handleFilterSelect = passedProps.onSelect;

        await act(async () => {
            handleFilterSelect(filterValue);
        });

        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(expectedUrl);
    });

    it('navigates to search results with data on successful API call', async () => {
        // Optional: Reset mock specifically for this test if needed, though beforeEach handles default
        // mockedAxios.get.mockResolvedValue({ data: mockApiData });

        render(<Tabs />);

        const passedProps = MockSubjectsHeaderInstance.mock.calls[0][0];
        const handleFilterSelect = passedProps.onSelect;

        await act(async () => {
             handleFilterSelect(filterValue);
         });

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledTimes(1);
        });

        expect(mockNavigate).toHaveBeenCalledWith('/searchresults', {
            state: { results: mockApiData },
        });
    });

    it('does not call axios.get or navigate if the filter is falsy', async () => {
        render(<Tabs />);

        const passedProps = MockSubjectsHeaderInstance.mock.calls[0][0];
        const handleFilterSelect = passedProps.onSelect;

        await act(async () => {
            handleFilterSelect(null);
        });
        expect(mockedAxios.get).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();

         await act(async () => {
             handleFilterSelect('');
         });
         expect(mockedAxios.get).not.toHaveBeenCalled();
         expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('handles API errors and does not navigate', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const apiError = new Error('Network Failed');
        mockedAxios.get.mockRejectedValue(apiError);

        render(<Tabs />);

        const passedProps = MockSubjectsHeaderInstance.mock.calls[0][0];
        const handleFilterSelect = passedProps.onSelect;

        await act(async () => {
             handleFilterSelect(filterValue);
        });

        await waitFor(() => {
             expect(mockedAxios.get).toHaveBeenCalledWith(expectedUrl);
        });

        expect(mockNavigate).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching filtered results:', apiError);

        consoleErrorSpy.mockRestore();
    });
});