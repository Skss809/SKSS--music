import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { LogIn, LogOut, User } from 'lucide-react';
import { AuthDialog } from './AuthDialog';

export function AuthButton() {
  const [user, setUser] = useState(auth.currentUser);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-2 md:gap-3">
        {user.photoURL ? (
          <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-zinc-700 object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-bold text-xs">
            {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
          </div>
        )}
        <div className="hidden sm:block text-sm">
          <p className="font-medium text-zinc-200 truncate max-w-[100px]">{user.displayName || user.email}</p>
        </div>
        <button onClick={handleLogout} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white group">
          <LogOut size={16} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <>
      <button 
        onClick={() => setIsAuthDialogOpen(true)}
        className="flex items-center gap-2 bg-white text-black px-4 py-1.5 md:py-2 rounded-full font-bold hover:bg-zinc-200 transition-all active:scale-95 shadow-lg text-sm md:text-base mr-2"
      >
        <LogIn size={16} />
        <span>Join Now</span>
      </button>

      <AuthDialog 
        isOpen={isAuthDialogOpen} 
        onOpenChange={setIsAuthDialogOpen} 
      />
    </>
  );
}
