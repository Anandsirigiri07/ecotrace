import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  PlusCircle, 
  Lightbulb, 
  User, 
  Leaf,
  LogOut
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface NavbarProps {
  userPhoto?: string;
  displayName?: string;
}

export function Navbar({ userPhoto, displayName }: NavbarProps) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { path: '/dashboard', label: 'Home', icon: Home, ariaLabel: 'Go to Dashboard' },
    { path: '/log', label: 'Log', icon: PlusCircle, ariaLabel: 'Log New Carbon Activity' },
    { path: '/insights', label: 'Insights', icon: Lightbulb, ariaLabel: 'View AI Carbon Insights' },
    { path: '/profile', label: 'Profile', icon: User, ariaLabel: 'View Profile and Settings' },
  ];

  return (
    <>
      {/* Desktop Top Navbar */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-primary text-white border-b border-primary/20 items-center justify-between px-8 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent rounded-full flex items-center justify-center shadow-inner text-primary" aria-hidden="true">
            <Leaf size={18} className="fill-current" />
          </div>
          <span className="text-xl font-bold font-sans tracking-tight">EcoTrace</span>
        </div>

        <nav className="flex items-center gap-8" role="navigation" aria-label="Desktop main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              aria-label={item.ariaLabel}
              className={({ isActive }) => 
                `flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all hover:bg-white/10 ${
                  isActive 
                    ? 'text-accent border-b-2 border-accent rounded-none bg-transparent hover:bg-transparent' 
                    : 'text-white/80 hover:text-white'
                }`
              }
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {userPhoto ? (
              <img 
                src={userPhoto} 
                alt={displayName || 'User profile'} 
                className="w-8 h-8 rounded-full border border-accent object-cover" 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent text-primary font-bold flex items-center justify-center text-xs">
                {displayName ? displayName[0].toUpperCase() : 'E'}
              </div>
            )}
            <span className="text-xs font-medium max-w-[100px] truncate">{displayName || 'User'}</span>
          </div>

          <button
            onClick={handleSignOut}
            aria-label="Sign out of your account"
            className="p-2 text-white/85 hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navbar */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-150 flex items-center justify-around px-2 z-40 pb-safe shadow-lg"
        role="navigation"
        aria-label="Mobile bottom navigation"
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            aria-label={item.ariaLabel}
            className={({ isActive }) => 
              `flex flex-col items-center justify-center w-20 h-full transition-all ${
                isActive 
                  ? 'text-secondary font-bold scale-105' 
                  : 'text-gray-400 hover:text-gray-600'
              }`
            }
          >
            <item.icon size={22} className="mb-0.5" />
            <span className="text-[10px] uppercase tracking-wide">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
export default Navbar;
