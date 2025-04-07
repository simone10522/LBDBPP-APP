import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import ResetPassword from './components/ResetPassword';
import ChangePassword from './components/ChangePassword';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-b from-[#f8f8f8] to-[#f0f0f0]">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <Link to="/" className="flex items-center">
                  <KeyRound className="h-8 w-8 text-[#212121]" />
                  <span className="ml-2 text-xl font-bold text-[#212121]">Pocket Tournaments</span>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={
              <div className="text-center">
                <h1 className="text-3xl font-bold text-[#212121] mb-8">Account Management</h1>
                <div className="space-y-4">
                  <Link
                    to="/reset-password"
                    className="block w-full max-w-xs mx-auto px-4 py-2 bg-[#212121] text-white rounded-md hover:bg-[#2c2c2c] transition-colors"
                  >
                    Reset Password
                  </Link>
                  <Link
                    to="/change-password"
                    className="block w-full max-w-xs mx-auto px-4 py-2 bg-white text-[#212121] border border-[#212121] rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Change Password
                  </Link>
                </div>
              </div>
            } />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/change-password" element={<ChangePassword />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;