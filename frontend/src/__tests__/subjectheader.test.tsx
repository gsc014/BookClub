import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SubjectsHeader from '../assets/subjectheader.jsx';  // Adjust the path accordingly

describe('SubjectsHeader Component', () => {
  
  it('renders all subject buttons', () => {
    render(<SubjectsHeader onSelect={vi.fn()} />);  // Render component with a mock function
    
    // Check that all subject buttons are rendered
    const subjectButtons = screen.getAllByRole('button'); // Get all buttons by role
    expect(subjectButtons).toHaveLength(9); // There should be 9 buttons (one for each subject)
    
    const subjectNames = ["Drama", "Romance", "History", "Fiction", "Comedy", 
                          "Horror", "Young Adult", "Biography", "Economy"];
    
    subjectNames.forEach((subject, index) => {
      expect(subjectButtons[index]).toHaveTextContent(subject);  // Check button text
    });
  });

  it('calls onSelect with the correct subject when a button is clicked', () => {
    const mockOnSelect = vi.fn();  // Create a mock function
    render(<SubjectsHeader onSelect={mockOnSelect} />);  // Render component with the mock function
    
    // Find a button by its text content (e.g., 'Drama')
    const dramaButton = screen.getByText('Drama');
    
    // Simulate a click on the 'Drama' button
    fireEvent.click(dramaButton);
    
    // Assert that the mock function was called with the correct argument
    expect(mockOnSelect).toHaveBeenCalledWith('Drama');
  });

});
