import { useState, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import {
  onAuthChange,
  signInWithGoogle,
  signOut,
  isOwner,
  bootstrapOwner,
  addOwner,
  removeOwner,
  getOwners,
} from '../../services/firebase';
import { User } from 'firebase/auth';

export function MainMenu() {
  const { setScreen } = useGameStore();
  const [owner, setOwner] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOwnerManager, setShowOwnerManager] = useState(false);
  const [ownerList, setOwnerList] = useState<string[]>([]);
  const [newOwnerEmail, setNewOwnerEmail] = useState('');

  useEffect(() => {
    bootstrapOwner();

    const unsub = onAuthChange(async (u) => {
      setUser(u);
      if (u) {
        setOwner(await isOwner(u));
      } else {
        setOwner(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSignIn = async () => {
    const u = await signInWithGoogle();
    if (u) {
      setUser(u);
      setOwner(await isOwner(u));
    }
  };

  const handleSignOut = () => {
    signOut();
    setUser(null);
    setOwner(false);
    setShowOwnerManager(false);
  };

  const loadOwners = async () => {
    const list = await getOwners();
    setOwnerList(list);
  };

  const handleAddOwner = async () => {
    if (!newOwnerEmail.trim()) return;
    if (await addOwner(newOwnerEmail.trim())) {
      setNewOwnerEmail('');
      loadOwners();
    }
  };

  const handleRemoveOwner = async (email: string) => {
    if (await removeOwner(email)) {
      loadOwners();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">Four Colors</h1>
        <p className="text-xl text-purple-100 mb-12">
          Color the regions with only 4 colors
        </p>

        <div className="space-y-4">
          <button
            onClick={() => setScreen('levelSelect')}
            className="w-64 px-8 py-4 bg-white text-purple-600 text-xl font-bold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          >
            Play Game
          </button>

          {owner && (
            <>
              <button
                onClick={() => setScreen('editor')}
                className="w-64 px-8 py-4 bg-purple-700 text-white text-xl font-bold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
              >
                Create Level
              </button>

              <button
                onClick={() => setScreen('manageLevels')}
                className="w-64 px-8 py-4 bg-blue-600 text-white text-xl font-bold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
              >
                Manage Levels
              </button>

              <button
                onClick={() => setScreen('stats')}
                className="w-64 px-8 py-4 bg-amber-500 text-white text-xl font-bold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
              >
                Stats
              </button>

              <button
                onClick={() => { setShowOwnerManager(!showOwnerManager); loadOwners(); }}
                className="w-64 px-4 py-2 bg-white/10 text-white text-sm rounded-lg hover:bg-white/20"
              >
                Manage Owners
              </button>
            </>
          )}
        </div>

        {/* Owner Manager Modal */}
        {showOwnerManager && (
          <div className="mt-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm text-left max-w-sm mx-auto">
            <h3 className="text-white font-semibold mb-3">Owners</h3>
            <div className="space-y-2 mb-3">
              {ownerList.map((email) => (
                <div key={email} className="flex items-center justify-between bg-white/10 rounded px-3 py-1">
                  <span className="text-white text-sm truncate">{email}</span>
                  <button
                    onClick={() => handleRemoveOwner(email)}
                    className="text-red-300 hover:text-red-100 text-sm ml-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="email"
                value={newOwnerEmail}
                onChange={(e) => setNewOwnerEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddOwner()}
                placeholder="email@gmail.com"
                className="flex-1 px-3 py-1 rounded text-sm text-gray-800"
              />
              <button
                onClick={handleAddOwner}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Add
              </button>
            </div>
            <button
              onClick={() => setShowOwnerManager(false)}
              className="mt-2 text-purple-200 text-sm hover:text-white"
            >
              Close
            </button>
          </div>
        )}

        <div className="mt-8">
          {user ? (
            <div className="flex items-center justify-center gap-2 text-purple-200 text-sm">
              <span>{user.email}</span>
              <button onClick={handleSignOut} className="text-purple-300 hover:text-white underline">
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 text-sm"
            >
              Sign in with Google
            </button>
          )}
        </div>

        {owner && (
          <p className="mt-4 text-green-300 text-sm">✓ Owner access</p>
        )}

        <p className="mt-8 text-purple-200 text-sm">
          A Progressive Web App • Works on all devices
        </p>
      </div>
    </div>
  );
}
