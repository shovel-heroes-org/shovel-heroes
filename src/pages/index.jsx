import Layout from "./Layout.jsx";

import Map from "./Map";

import Volunteers from "./Volunteers";

import Supplies from "./Supplies";

import Admin from "./Admin";

import About from "./About";

import GridMonitor from "./GridMonitor";

import RequestHelp from "./RequestHelp";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Map: Map,
    
    Volunteers: Volunteers,
    
    Supplies: Supplies,
    
    Admin: Admin,
    
    About: About,
    
    GridMonitor: GridMonitor,
    
    RequestHelp: RequestHelp,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                <Route path="/" element={<Map />} />
                
                
                <Route path="/Map" element={<Map />} />
                
                <Route path="/Volunteers" element={<Volunteers />} />
                
                <Route path="/Supplies" element={<Supplies />} />
                
                <Route path="/Admin" element={<Admin />} />
                
                <Route path="/About" element={<About />} />
                
                <Route path="/GridMonitor" element={<GridMonitor />} />
                
                <Route path="/RequestHelp" element={<RequestHelp />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}