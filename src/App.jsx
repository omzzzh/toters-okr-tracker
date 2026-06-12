import React, { useEffect, createContext, useContext } from 'react';
import useStore from './store/index';
import { useToast } from './hooks/useToast';
import Topbar from './components/layout/Topbar';
import Sidebar from './components/layout/Sidebar';
import SubNav from './components/layout/SubNav';
import WeekModal from './components/layout/WeekModal';
import ProjectModal from './components/layout/ProjectModal';
import AuthGate, { AuthContext } from './components/AuthGate';
import OKRPage from './pages/OKRPage';
import ExecPage from './pages/ExecPage';
import GridPage from './pages/GridPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ScoringPage from './pages/ScoringPage';
import KanbanPage from './pages/KanbanPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import SettingsPage from './pages/SettingsPage';
import TeamPage from './pages/TeamPage';

export const ToastCtx = createContext(null);
export const useToastCtx = () => useContext(ToastCtx);

function AppInner() {
  const { toast, showToast } = useToast();
  const activeView  = useStore(s => s.activeView);
  const settings    = useStore(s => s.settings);
  const setUserName = useStore(s => s.setUserName);
  const userName    = useStore(s => s.userName);
  const loadFromSheets = useStore(s => s.loadFromSheets);
  const { user } = useContext(AuthContext);

  // Auto-fill userName from Google account on first login
  useEffect(() => {
    if (user?.displayName && !userName) setUserName(user.displayName);
  }, [user]);

  useEffect(() => {
    if (settings.ejsPK && window.emailjs) {
      try { window.emailjs.init({ publicKey: settings.ejsPK }); } catch(e) {}
    }
  }, [settings.ejsPK]);

  useEffect(() => { loadFromSheets(); }, []);

  const pages = {
    okr: OKRPage, exec: ExecPage, grid: GridPage,
    analytics: AnalyticsPage, scoring: ScoringPage,
    kanban: KanbanPage, project: ProjectDetailPage,
    team: TeamPage, settings: SettingsPage,
  };
  const Page = pages[activeView] || OKRPage;

  return (
    <ToastCtx.Provider value={showToast}>
      <Topbar />
      <div className="app-body">
        <Sidebar />
        <div className="content-area">
          {activeView === 'okr' && <SubNav />}
          <Page />
        </div>
      </div>
      <WeekModal />
      <ProjectModal />
      <div className={'toast' + (toast.show ? ' show' : '')}>{toast.msg}</div>
    </ToastCtx.Provider>
  );
}

export default function App() {
  return (
    <AuthGate>
      <AppInner />
    </AuthGate>
  );
}
