// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import IndexPage from './IndexPage';
import ProfilePage from './ProfilePage';
import SettingsPage from './SettingsPage';


ReactDOM.createRoot(document.getElementById('root')).render(
    // <React.StrictMode>
      <App />
    // </React.StrictMode>
  );


