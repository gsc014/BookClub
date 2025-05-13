import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock, Mocked } from 'vitest';
import axios, { AxiosStatic } from 'axios';
import Tabs from '../assets/Tabs.jsx';

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

vi.mock('../assets/subjectheader', () => {
    const MockSubjectsHeaderComponent = vi.fn(({ onSelect }) => (
        <div data-testid="mock-subjects-header" onClick={() => onSelect('history')}>
            Mock Subjects Header Content
        </div>
    ));
    return {
        default: MockSubjectsHeaderComponent
    };
});

describe('Tabs Component', () => {
    const mockApiData = { results: [{ id: 1, title: 'Filtered Book' }] };
    const filterValue = 'history';
    const expectedUrl = `http://127.0.0.1:8000/api/filter/?filter=${filterValue}`;
    let MockSubjectsHeaderInstance: Mock;

    beforeEach(async () => {
        const SubjectsHeaderMockedModule = await import('../assets/subjectheader');
        MockSubjectsHeaderInstance = SubjectsHeaderMockedModule.default as Mock;
        vi.clearAllMocks();
        MockSubjectsHeaderInstance.mockClear();
        mockedAxios.get.mockResolvedValue({ data: mockApiData });
        MockSubjectsHeaderInstance.mockImplementation(({ onSelect }) => (
             <div data-testid="mock-subjects-header" onClick={() => onSelect(filterValue)}>
                 Mock Subjects Header Content
             </div>
         ));
    });

    afterEach(() => {
    });

    it('renders the SubjectsHeader component', () => {
        render(<Tabs />);
        expect(MockSubjectsHeaderInstance).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('mock-subjects-header')).toBeInTheDocument();
    });

    it('calls axios.get with the correct URL when a filter is selected', async () => {
        render(<Tabs />);
        const passedProps = MockSubjectsHeaderInstance.mock.calls[0][0];
        const handleFilterSelect = passedProps.onSelect;
        await act(async () => {
            handleFilterSelect(filterValue);
        });
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
        expect(mockedAxios.get).toHaveBeenCalledWith(expectedUrl);
    });

    it('navigates to search results with data on successful API call', async () => {
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