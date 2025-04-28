import './assets/style/stylesheet.css';
import './assets/style/App.css';

import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { checkInitialAuthState, getAuthHeaders, isLoggedIn } from './utils';

import { Header, Searchbar, Booklist, Login, Signin, Welcome, Profile, Settings, Bookpage} from './assets';
import ProfilePage from './assets/ProfilePage';
import SearchResults from './assets/searchresults';
import SubjectsHeader from './assets/subjectheader';
import GamePage from './assets/gamepage';

// Updated ProtectedRoute component with verbose logging
const ProtectedRoute = ({ children }) => {
    console.log("ProtectedRoute component render");
    console.log("isLoggedIn() returns:", isLoggedIn());
    console.log("Auth token in localStorage:", Boolean(localStorage.getItem('authToken')));
    
    if (!isLoggedIn()) {
        console.log("Not authenticated, redirecting to home");
        return <Navigate to="/" replace />;
    }
    
    console.log("Authentication check passed, rendering protected route");
    return children;
};

const App = () => {
    const location = useLocation();

    useEffect(() => {
        // Check if user is already authenticated (has valid token in localStorage)
        const isAuthenticated = checkInitialAuthState();
        if (isAuthenticated) {
            // Update UI accordingly - no need to do anything here as components will respond to auth state
        }
    }, []);

    return (
        <div>
            <Header />  {/* Keep header always visible */}
            <Login />
            <Signin />
            <Routes>
                {/* Home Page */}
                <Route path="/" element={
                    <>
                        <Searchbar />
                        <Booklist />
                        <Profile /> {/* The mini-profile component that is shown as a modal */}
                    </>
                } />

                {/* Profile Page - New dedicated route protected by authentication */}
                <Route path="/profile/:username" element={
                    <ProtectedRoute>
                        <ProfilePage />
                    </ProtectedRoute>
                } />

                {/* Settings Page */}
                <Route path="/settings" element={
                    <ProtectedRoute>
                        <Settings />
                    </ProtectedRoute>
                } />

                {/* Search results */}
                <Route path="/searchresults" element={
                    <SearchResults results={location.state?.results || []} />} />

                <Route path="/books/:id" element={
                    <Bookpage book={location.state?.book || []} />
                } />
                <Route path="/add-book/:id" element={
                    <Bookpage book={location.state?.book || []} />
                } />
                
                <Route path="/game" element={
                    <ProtectedRoute>
                        <GamePage />
                    </ProtectedRoute>
                } />
            </Routes>
        </div>
    );
}

const AppWrapper = () => (
    <Router>
        <App />
    </Router>
);

export default AppWrapper;
