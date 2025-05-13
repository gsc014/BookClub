import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Profile from '../assets/profile.jsx';
import { logout } from '../utils.jsx';

vi.mock('../utils.jsx', () => ({
  closeTabs: vi.fn(),
  logout: vi.fn(),
}));

describe('Profile Component', () => {
  
  beforeEach(() => {
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
    expect(logout).toHaveBeenCalled();
  });

});
