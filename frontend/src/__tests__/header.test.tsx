import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Header from '../assets/header';
import { handleLogin } from '../utils';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});
vi.mock('../utils.jsx', () => ({
    handleLogin: vi.fn(),
}));
vi.mock('../assets/pictures/user.png', () => ({ default: 'user.png' }));
vi.mock('../assets/pictures/settings_icon.png', () => ({ default: 'settings_icon.png' }));
vi.mock('../assets/pictures/game_icon.png', () => ({ default: 'game_icon.png' }));

describe('Header Component', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the header with logo and icons', () => {
        render(<Header />);
        expect(screen.getByRole('link', { name: /book club/i })).toBeInTheDocument();
        expect(screen.getByAltText(/game page/i)).toBeInTheDocument();
        expect(screen.getByAltText(/user login\/profile/i)).toBeInTheDocument();
        expect(screen.getByAltText(/settings page/i)).toBeInTheDocument();
    });

    it('navigates to home "/" when logo is clicked', () => {
        render(<Header />);
        const logoLink = screen.getByRole('link', { name: /book club/i });
        fireEvent.click(logoLink);
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('navigates to "/game" when game icon is clicked', () => {
        render(<Header />);
        const gameIcon = screen.getByAltText(/game page/i);
        fireEvent.click(gameIcon);
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/game');
    });

    it('navigates to "/settings" when settings icon is clicked', () => {
        render(<Header />);
        const settingsIcon = screen.getByAltText(/settings page/i);
        fireEvent.click(settingsIcon);
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });

    it('calls handleLogin when user icon is clicked', () => {
        render(<Header />);
        const userIcon = screen.getByAltText(/user login\/profile/i);
        fireEvent.click(userIcon);
        expect(handleLogin).toHaveBeenCalledTimes(1);
        expect(mockNavigate).not.toHaveBeenCalled();
    });

});