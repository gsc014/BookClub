import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SubjectsHeader from '../assets/subjectheader.jsx';

describe('SubjectsHeader Component', () => {
  
  it('renders all subject buttons', () => {
    render(<SubjectsHeader onSelect={vi.fn()} />);
    const subjectButtons = screen.getAllByRole('button');
    expect(subjectButtons).toHaveLength(9);
    const subjectNames = ["Drama", "Romance", "History", "Fiction", "Comedy", 
                          "Horror", "Young Adult", "Biography", "Economy"];
    subjectNames.forEach((subject, index) => {
      expect(subjectButtons[index]).toHaveTextContent(subject);
    });
  });

  it('calls onSelect with the correct subject when a button is clicked', () => {
    const mockOnSelect = vi.fn();
    render(<SubjectsHeader onSelect={mockOnSelect} />);
    const dramaButton = screen.getByText('Drama');
    fireEvent.click(dramaButton);
    expect(mockOnSelect).toHaveBeenCalledWith('Drama');
  });

});
