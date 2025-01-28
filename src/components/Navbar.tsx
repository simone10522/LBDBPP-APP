import React, { useEffect, useState } from 'react';
    import { Link, useNavigate } from 'react-router-dom';
    import { supabase } from '../lib/supabase';
    import { useAuth } from '../hooks/useAuth';

    export default function Navbar() {
      const { user } = useAuth();
      const navigate = useNavigate();
      const [username, setUsername] = useState('');
      const [profileImage, setProfileImage] = useState('');
      const [loading, setLoading] = useState(true);

      useEffect(() => {
        const fetchUserData = async () => {
          if (user) {
            try {
              const { data, error } = await supabase
                .from('profiles')
                .select('username, profile_image')
                .eq('id', user.id)
                .single();
              if (error) {
                console.error("Error fetching user data:", error);
                setUsername('Guest');
                setProfileImage('');
              } else {
                setUsername(data?.username || 'Guest');
                setProfileImage(data?.profile_image || '');
              }
            } catch (error) {
              console.error("Error fetching user data:", error);
              setUsername('Guest');
              setProfileImage('');
            }
          } else {
            setUsername('Guest');
            setProfileImage('');
          }
          setLoading(false);
        };
        fetchUserData();
      }, [user]);

      const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
      };

      if (loading) return <nav>Loading...</nav>;

      return (
        <nav className="bg-red-600 shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <Link to="/" className="flex items-center space-x-2">
                <img
                  src="https://github.com/simone10522/LBDBPP/blob/main/icons/pokeball.png?raw=true"
                  alt="Pokeball Icon"
                  className="h-12 w-12 animate-spin-slow"
                />
                <img
                  src="https://github.com/simone10522/LBDBPP/blob/main/icons/LBDBPP.png?raw=true.png"
                  alt="Pokemon Logo"
                  className="h-10"
                />
              </Link>

              <div className="flex items-center space-x-4">
                {user ? (
                  <div className="flex items-center space-x-2">
                    {profileImage && (
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    )}
                    <Link to="/profile" className="text-white hover:underline">Ciao! {username}</Link>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 text-white hover:text-gray-200 transition"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="px-4 py-2 text-white hover:text-gray-200 transition"
                    >
                      Accedi
                    </Link>
                    <Link
                      to="/register"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                    >
                      Registrati
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>
      );
    }
