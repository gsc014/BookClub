import React from 'react';
import "./subjectheader.css";

const subjects = [
    "Drama", "Romance", "History", "Fiction", "Comedy", 
    "Horror", "Young Adult", "Biography", "Economy"
];

const SubjectsHeader = ({ onSelect }) => {
    return (
        <div className="subjects-header">
            {subjects.map((subject, index) => (
                <button 
                    key={index} 
                    className="subject-box"
                    onClick={() => onSelect(subject)}
                >
                    {subject}
                </button>
            ))}
        </div>
    );
};

export default SubjectsHeader;
