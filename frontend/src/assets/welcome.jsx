import React from 'react';
// import './welcome.css';

const Welcome = ({ username }) => {
    return (
        <div className="welcome-container">
            <p id = "welcomeSuccsessLogIn"></p>
            <h1 id = "welcomeText"></h1>
        </div>
    );
};

export default Welcome;
