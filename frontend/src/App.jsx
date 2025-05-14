import React from 'react';
import './assets/style/stylesheet.css';
import './assets/style/App.css';

import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { checkInitialAuthState, getAuthHeaders, isLoggedIn } from './utils';

import { Header, Searchbar, Booklist, Login, Signin, Welcome, Profile, Settings, Bookpage, GameListPage } from './assets';
import TopRatedBooks from './assets/toprated';
import MostLikedBooks from './assets/mostLikedBooks';
import MostActiveUsers from './assets/mostActiveUsers';
import ProfilePage from './assets/ProfilePage';
import SearchResults from './assets/searchresults';
import GameRouter from './assets/gamerouter';

const ProtectedRoute = ({ children }) => {
    if (!isLoggedIn()) {
        return <Navigate to="/" replace />;
    }
    return children;
};

const App = () => {
    const location = useLocation();

    useEffect(() => {
        checkInitialAuthState();
    }, []);

    return (
        <div>
            <Header />
            <Login />
            <Signin />
            <Routes>
                <Route path="/" element={
                    <>
                        <Searchbar />
                        <div className="home-layout">
                            <div className='right-side-content'>
                                <TopRatedBooks limit={3} />
                            </div>
                            <div className="main-content">
                                <Booklist />
                            </div>
                            <div className="side-content">
                                <MostLikedBooks limit={3} />
                                <MostActiveUsers limit={5} />
                            </div>
                        </div>
                        <Profile />
                    </>
                } />
                <Route path="/profile/:username" element={
                    <ProtectedRoute>
                        <ProfilePage />
                    </ProtectedRoute>
                } />
                <Route path="/settings" element={
                    <ProtectedRoute>
                        <Settings />
                    </ProtectedRoute>
                } />
                <Route path="/searchresults" element={<SearchResults />} />
                <Route path="/books/:id" element={<Bookpage book={location.state?.book || []} />} />
                <Route path="/add-book/:id" element={
                    <Bookpage book={location.state?.book || []} />
                } />
                <Route path="/game" element={
                    <ProtectedRoute>
                        <GameListPage />
                    </ProtectedRoute>
                } />
                <Route path="/games/:gameId" element={
                    <ProtectedRoute>
                        <GameRouter />
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
export { App };
export default AppWrapper;
