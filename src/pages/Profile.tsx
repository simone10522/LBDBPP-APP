import React, { useState, useEffect } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { supabase } from '../lib/supabase';
    import { useAuth } from '../hooks/useAuth';

    export default function Profile() {
      const { user } = useAuth();
      const navigate = useNavigate();
      const [username, setUsername] = useState('');
      const [profileImage, setProfileImage] = useState('');
      const [error, setError] = useState('');
      const [loading, setLoading] = useState(true);

      useEffect(() => {
        const fetchProfile = async () => {
          if (!user) return;
          try {
            setLoading(true);
            const { data, error } = await supabase
              .from('profiles')
              .select('username, profile_image')
              .eq('id', user.id)
              .single();
            if (error) throw error;
            setUsername(data?.username || '');
            setProfileImage(data?.profile_image || '');
          } catch (error: any) {
            setError(error.message);
          } finally {
            setLoading(false);
          }
        };
        fetchProfile();
      }, [user]);

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ username, profile_image: profileImage })
            .eq('id', user?.id);
          if (error) throw error;
          navigate('/');
        } catch (error: any) {
          setError(error.message);
        }
      };

      const handleImageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setProfileImage(e.target.value);
      };

      if (loading) {
        return <div>Loading...</div>;
      }

      return (
        <div className="max-w-md mx-auto p-4 bg-gray-200 bg-opacity-50 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Profile</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Profile Image</label>
              <select
                value={profileImage}
                onChange={handleImageChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Select an image</option>
                <option value="https://github.com/simone10522/LBDBPP/blob/main/icons/profile1.png?raw=true">Profile 1</option>
                <option value="https://github.com/simone10522/LBDBPP/blob/main/icons/profile2.png?raw=true">Profile 2</option>
                <option value="https://github.com/simone10522/LBDBPP/blob/main/icons/profile3.png?raw=true">Profile 3</option>
                <option value="https://github.com/simone10522/LBDBPP/blob/main/icons/profile4.png?raw=true">Profile 4</option>
              </select>
              <input
                type="text"
                placeholder="Or enter image URL"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {profileImage && (
                <div className="mt-2">
                  <img
                    src={profileImage}
                    alt="Profile Preview"
                    className="h-20 w-20 rounded-full object-cover"
                  />
                </div>
              )}
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-md text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-indigo-700 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Update Profile
            </button>
          </form>
        </div>
      );
    }
