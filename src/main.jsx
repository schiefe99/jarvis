import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ActiveTimerProvider } from './contexts/ActiveTimerContext.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { DailyTasksProvider } from './contexts/DailyTasksContext.jsx';
import { GroupNameProvider } from './contexts/GroupNameContext.jsx';
import { ProfileProvider } from './contexts/ProfileContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ProfileProvider>
            <ActiveTimerProvider>
              <DailyTasksProvider>
                <GroupNameProvider>
                  <App />
                </GroupNameProvider>
              </DailyTasksProvider>
            </ActiveTimerProvider>
          </ProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
