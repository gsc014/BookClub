import './stylesheet.css';
import './App.css';

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import { Header, Searchbar, Booklist, Login, Signin, Welcome, Profile, Settings, Bookpage } from './assets';
import SearchResults from './assets/searchresults';
import SubjectsHeader from './assets/subjectheader';
import ProtectedRoute from './ProtectedRoute';


const App = () => {

    const location = useLocation();
    return (
        <div>
            <Login />
            <Signin />
            <Header />  {/* Keep header always visible */}
            <Routes>
                {/* Home Page */}
                <Route path="/" element={
                    <>
                        <Searchbar />
                        <Booklist />
                        <Profile /> {/* The mini-profile component that is shown as a modal */}
                    </>
                } />

                {/* Settings Page */}
                <Route path="/settings" element={
                    <Settings />} />
                {/*search results*/}

                <Route path="/searchresults" element={
                    <SearchResults results={location.state?.results || []} />} />

                <Route path="/books/:id" element={
                    <Bookpage book={location.state?.book || []} />
                    
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
