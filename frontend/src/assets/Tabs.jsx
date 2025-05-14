import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SubjectsHeader from './subjectheader';

const Tabs = () => {
    const navigate = useNavigate();
    
    const handleFilterSelect = (filter) => {
        if (!filter) return;

        console.log("Selected filter:", filter);
        const url = `http://127.0.0.1:8000/api/filter/?filter=${filter}`;
        
        axios.get(url)
            .then(response => {
                navigate('/searchresults', { state: { results: response.data } });
            })
            .catch(error => console.error('Error fetching filtered results:', error));
    };

    return (
        <div className="tabs-container">
            <SubjectsHeader onSelect={handleFilterSelect} />
        </div>
    );
};

export default Tabs;