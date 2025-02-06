import React from 'react';
    import { BrowserRouter, Routes, Route } from 'react-router-dom';
    import Navbar from './components/Navbar';
    import Home from './pages/Home';
    import Login from './pages/Login';
    import Register from './pages/Register';
    import CreateTournament from './pages/CreateTournament';
    import TournamentDetails from './pages/TournamentDetails';
    import ManageParticipants from './pages/ManageParticipants';
    import ManageDecks from './pages/ManageDecks';
    import EditTournament from './pages/EditTournament';
    import Profile from './pages/Profile';

    function App() {
      return (
        <BrowserRouter>
          <div className="min-h-screen relative overflow-hidden">
            <div
              className="absolute inset-0 z-[-1] bg-cover bg-no-repeat bg-center"
              style={{
                backgroundImage: `url('https://epicscifiart.wordpress.com/wp-content/uploads/2015/10/all-151-original-pokemon-battling-in-poster-art.jpg')`,
                filter: 'blur(5px)'
              }}
            />
            <Navbar />
            <main className="container mx-auto px-4 py-8 relative">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/tournaments/create" element={<CreateTournament />} />
                <Route path="/tournaments/:id" element={<TournamentDetails />} />
                <Route path="/tournaments/:id/participants" element={<ManageParticipants />} />
                <Route path="/managedecks" element={<ManageDecks />} />
                <Route path="/tournaments/edit/:id" element={<EditTournament />} />
                <Route path="/profile" element={<Profile />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      );
    }

    export default App;
