import { useRef, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getInitials, getAvatarUrl } from '@/lib/utils';
import { Settings } from 'lucide-react';


export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  const handleAvatarClick = () => {
    setLocation('/core/user-profile');
  };

  // Close the dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      setIsOpen(false);
      await logout();
      // No need to call setLocation since logout() handles navigation
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback navigation if logout fails
      setLocation('/login');
    }
  };

  return (
    <div ref={dropdownRef} className="flex items-center gap-2">
      {/* User Avatar - Clickable to Profile */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 rounded-full"
        onClick={handleAvatarClick}
        aria-label="Go to Profile"
      >
        <Avatar className="h-8 w-8">
          <AvatarImage src={getAvatarUrl(currentUser?.avatarUrl)} />
          <AvatarFallback className="bg-primary-600 text-white">
            {getInitials(currentUser?.fullName || currentUser?.email || 'U')}
          </AvatarFallback>
        </Avatar>
      </Button>

      {/* Settings Icon - Opens Dropdown Menu */}
      <Button 
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0" 
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="User settings menu"
      >
        <Settings className="h-4 w-4 text-neutral-600" />
      </Button>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
          <Link href="/core/user-profile">
            <div className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer touch-manipulation" onClick={() => setIsOpen(false)}>
              Your Profile
            </div>
          </Link>
          <Link href="/core/account-settings">
            <div className="block px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 cursor-pointer touch-manipulation" onClick={() => setIsOpen(false)}>
              Account Settings
            </div>
          </Link>
          <div className="border-t border-neutral-200 my-1"></div>
          <button 
            className="block w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 touch-manipulation"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
