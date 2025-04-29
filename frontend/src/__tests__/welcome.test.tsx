// src/__tests__/welcome.test.jsx (or .tsx)

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'; // For .toBeInTheDocument() matcher
import { describe, it, expect } from 'vitest';

// Component to test
import Welcome from '../assets/welcome'; // Adjust path if necessary

describe('Welcome Component', () => {

    it('renders the main container', () => {
        render(<Welcome username="TestUser" />);
        // Find the container div. Since it only has a class, we might need to query differently
        // or check for its children. Let's check for children.
        const headingElement = screen.getByRole('heading', { level: 1 });
        expect(headingElement).toBeInTheDocument();
        // Check if the container exists by finding a known child and checking its parent/ancestor maybe?
        // Or add a data-testid="welcome-container" to the div in the component for easier querying.
        // For now, checking children implies container exists.
    });

    it('renders the paragraph element with the correct ID', () => {
        const { container } = render(<Welcome username="TestUser" />);
        // Using querySelector for ID as getByRole('paragraph') is too generic and getByText won't work
        const paragraphElement = container.querySelector('#welcomeSuccsessLogIn');
        expect(paragraphElement).toBeInTheDocument();
        expect(paragraphElement?.tagName).toBe('P'); // Verify it's a paragraph tag
    });

    it('renders the heading element with the correct ID and role', () => {
        const { container } = render(<Welcome username="TestUser" />);
        const headingElementById = container.querySelector('#welcomeText');
        const headingElementByRole = screen.getByRole('heading', { level: 1 });

        expect(headingElementById).toBeInTheDocument();
        expect(headingElementById?.tagName).toBe('H1'); // Verify it's an H1 tag
        expect(headingElementByRole).toBeInTheDocument();
        // Check they are the same element
        expect(headingElementById).toBe(headingElementByRole);
    });

    it('renders correctly even if the username prop value is not used in output', () => {
        // Provide a dummy username to satisfy the prop requirement
        const { container } = render(<Welcome username="AnyUser" />); // Pass the required prop
        expect(container.querySelector('#welcomeSuccsessLogIn')).toBeInTheDocument();
        expect(container.querySelector('#welcomeText')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    // Note: Currently no test specifically checks if the username prop value is displayed,
    // because the component code doesn't display it. If the component is updated
    // to show the username (e.g., `<h1 id="welcomeText">Welcome, {username}!</h1>`),
    // you would add a test like:
    // it('displays the username when provided', () => {
    //   const testUsername = "Alice";
    //   render(<Welcome username={testUsername} />);
    //   // Use a regex to find text containing the username within the heading
    //   expect(screen.getByRole('heading', { level: 1, name: /welcome, alice/i })).toBeInTheDocument();
    // });

});