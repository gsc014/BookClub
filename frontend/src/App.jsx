import './stylesheet.css';
import './App.css';

import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import { Header, Searchbar, Booklist, Login, Signin, Welcome, Profile, Settings, Bookpage } from './assets';
import SearchResults from './assets/searchresults';

const App = () => {

    const location = useLocation();
    return (
        <div>
            <Header />  {/* Keep header always visible */}
            <Routes>
                {/* Home Page */}
                <Route path="/" element={
                    <>
                        <Welcome />
                        <Searchbar />
                        <Booklist />
                        <Login />
                        <Signin />
                        <Profile />
                    </>
                } />

                {/* Settings Page */}
                <Route path="/settings" element={<Settings />} />
                {/*search results*/}

                <Route path="/searchresults" element={<SearchResults results={location.state?.results || []} />} />
                <Route path="/books/:id" element={<Bookpage book={location.state?.book || []} />} />
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

// const App = () => {

//     return (

//         <div>
//             <Header />
//             <Welcome />
//             <Searchbar />
//             <Booklist />
//             <Login />
//             <Signin />
//             <Profile />

//         </div>
//     );
// }
