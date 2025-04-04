import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// import { vi } from 'vitest';
import axios from 'axios';
import SettingsPage from '../SettingsPage.jsx';

vi.mock('axios');
const mockedAxios = axios as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

describe('SettingsPage', () => {
  const mockSettings = {
    theme: 'dark',
    notifications: true,
  };

  beforeEach(() => {
    mockedAxios.get.mockResolvedValue({ data: mockSettings });
    mockedAxios.post.mockResolvedValue({ data: { message: 'Settings updated' } });
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders loading initially', () => {
    render(<SettingsPage />);
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('renders form after fetching settings', async () => {
    render(<SettingsPage />);

    expect(await screen.findByText(/Settings/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Theme/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notifications/i)).toBeInTheDocument();

    // Verify initial state
    const select = screen.getByLabelText(/Theme/i) as HTMLSelectElement;
    const checkbox = screen.getByLabelText(/Notifications/i) as HTMLInputElement;
    expect(select.value).toBe('dark');
    expect(checkbox.checked).toBe(true);
  });

  it('handles API error', async () => {
    mockedAxios.get.mockRejectedValue(new Error('API Error'));

    render(<SettingsPage />);

    expect(await screen.findByText(/Error fetching settings/i)).toBeInTheDocument();
  });

  it('updates theme selection', async () => {
    render(<SettingsPage />);

    const select = await screen.findByLabelText(/Theme/i);
    fireEvent.change(select, { target: { value: 'light' } });

    expect((select as HTMLSelectElement).value).toBe('light');
  });

  it('toggles notifications checkbox', async () => {
    render(<SettingsPage />);

    const checkbox = await screen.findByLabelText(/Notifications/i);
    fireEvent.click(checkbox);

    expect((checkbox as HTMLInputElement).checked).toBe(false);
  });

  it('submits the form with updated data and shows alert', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<SettingsPage />);

    const select = await screen.findByLabelText(/Theme/i);
    const checkbox = screen.getByLabelText(/Notifications/i);
    const button = screen.getByText(/Save/i);

    // Update form fields
    fireEvent.change(select, { target: { value: 'light' } });
    fireEvent.click(checkbox);

    // Submit the form
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'http://127.0.0.1:8000/api/settings/',
        { theme: 'light', notifications: false }
      );
      expect(alertSpy).toHaveBeenCalledWith('Settings updated');
    });

    alertSpy.mockRestore();
  });
});
