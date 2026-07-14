import { createContext, useContext, useState } from 'react';

export const PROFILES = {
  jarvis: { key: 'jarvis', name: 'Jarvis', subtitle: 'Profissional', category: 'trabalho' },
  sivraj: { key: 'sivraj', name: 'Sivraj', subtitle: 'Rotina', category: 'pessoal' },
};

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [profile, setProfileState] = useState(() => {
    const s = localStorage.getItem('profile');
    return s && PROFILES[s] ? s : null;
  });

  function setProfile(key) {
    if (!PROFILES[key]) return;
    localStorage.setItem('profile', key);
    setProfileState(key);
  }

  function clearProfile() {
    localStorage.removeItem('profile');
    setProfileState(null);
  }

  return (
    <ProfileContext.Provider value={{
      profile,
      profileData: profile ? PROFILES[profile] : null,
      setProfile,
      clearProfile,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}
