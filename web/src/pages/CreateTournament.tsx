import React, { useState } from 'react';
    import { useNavigate } from 'react-router-dom';
    import { supabase } from '../lib/supabase';
    import { useAuth } from '../hooks/useAuth';
    
    export default function CreateTournament() {
      const { user } = useAuth();
      const navigate = useNavigate();
      const [name, setName] = useState('');
      const [description, setDescription] = useState('');
      const [startDate, setStartDate] = useState('');
      const [maxPlayers, setMaxPlayers] = useState('illimitato');
      const [maxRounds, setMaxRounds] = useState('illimitato');
      const [error, setError] = useState('');
    
      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
          const maxPlayersValue = maxPlayers === 'illimitato' ? null : parseInt(maxPlayers, 10);
          if (maxPlayersValue !== null && isNaN(maxPlayersValue)) {
            throw new Error("Numero massimo di giocatori non valido.");
          }
          const maxRoundsValue = maxRounds === 'illimitato' ? null : parseInt(maxRounds, 10);
          if (maxRoundsValue !== null && isNaN(maxRoundsValue)) {
            throw new Error("Numero massimo di turni non valido.");
          }
          const { data: tournament, error: tournamentError } = await supabase
            .from('tournaments')
            .insert([{ name, description, created_by: user?.id, start_date: startDate, max_players: maxPlayersValue, max_rounds: maxRoundsValue }])
            .select()
            .single();
          if (tournamentError) throw tournamentError;
          navigate(`/tournaments/${tournament.id}`);
        } catch (error: any) {
          setError(error.message);
        }
      };
    
      return (
        <div className="max-w-md mx-auto p-4 bg-gray-200 bg-opacity-50 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Tournament</h1>
    
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
    
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tournament Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
    
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>
    
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </div>
    
            <div>
              <label className="block text-sm font-medium text-gray-700">Max Players</label>
              <select
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="illimitato">Unlimited</option>
                {Array.from({ length: 50 }, (_, i) => i + 2).map((num) => (
                  <option key={num} value={num.toString()}>
                    {num}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Max Rounds</label>
              <select
                value={maxRounds}
                onChange={(e) => setMaxRounds(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="illimitato">Unlimited</option>
                {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num.toString()}>
                    {num}
                  </option>
                ))}
              </select>
            </div>
    
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-md text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-indigo-700 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Tournament
            </button>
          </form>
        </div>
      );
    }
