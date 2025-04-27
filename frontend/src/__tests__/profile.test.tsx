import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';  // Import testing utilities
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';  // Import test functions
import Profile from '../assets/profile.jsx';  // Import the Profile component
import { closeTabs, logout } from '../utils.jsx';  // Import mock functions directly

// Mocking the functions used in Profile component
vi.mock('../utils.jsx', () => ({
  closeTabs: vi.fn(),  // Mocking the closeTabs function
  logout: vi.fn(),     // Mocking the logout function
}));

describe('Profile Component', () => {
  
  beforeEach(() => {
    // Mock localStorage.getItem to simulate a logged-in user
    const user = {
      username: 'testuser',
      email: 'test@example.com',
      booksRead: 5,
      booksReviewed: 2,
    };
    window.localStorage.setItem('user', JSON.stringify(user));
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('displays user data correctly when stored in localStorage', () => {
    render(<Profile />);

    expect(screen.getByText('Username: testuser')).toBeInTheDocument();
    expect(screen.getByText('Email: test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Books Read: 5')).toBeInTheDocument();
    expect(screen.getByText('Books Reviewed: 2')).toBeInTheDocument();
  });

  it('calls logout when the logout button is clicked', () => {
    render(<Profile />);
    const logoutButton = screen.getByText(/log out/i);

    fireEvent.click(logoutButton);

    expect(logout).toHaveBeenCalled(); // Check if the mock function was called
  });

});
