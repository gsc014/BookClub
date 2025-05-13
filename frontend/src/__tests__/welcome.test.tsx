
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';

import Welcome from '../assets/welcome';

describe('Welcome Component', () => {

    it('renders the main container', () => {
        render(<Welcome username="TestUser" />);
        const headingElement = screen.getByRole('heading', { level: 1 });
        expect(headingElement).toBeInTheDocument();
    });

    it('renders the paragraph element with the correct ID', () => {
        const { container } = render(<Welcome username="TestUser" />);
        const paragraphElement = container.querySelector('#welcomeSuccsessLogIn');
        expect(paragraphElement).toBeInTheDocument();
        expect(paragraphElement?.tagName).toBe('P');
    });

    it('renders the heading element with the correct ID and role', () => {
        const { container } = render(<Welcome username="TestUser" />);
        const headingElementById = container.querySelector('#welcomeText');
        const headingElementByRole = screen.getByRole('heading', { level: 1 });
        expect(headingElementById).toBeInTheDocument();
        expect(headingElementById?.tagName).toBe('H1');
        expect(headingElementByRole).toBeInTheDocument();
        expect(headingElementById).toBe(headingElementByRole);
    });

    it('renders correctly even if the username prop value is not used in output', () => {
        const { container } = render(<Welcome username="AnyUser" />);
        expect(container.querySelector('#welcomeSuccsessLogIn')).toBeInTheDocument();
        expect(container.querySelector('#welcomeText')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

});