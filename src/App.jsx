import React, { useEffect, createContext, useContext } from 'react';
import useStore from './store/index';
import { useToast } from './hooks/useToast';
import Topbar from './components/layout/Topbar';
import Sidebar from './components/layout/Sidebar';
import SubNav from './components/layout/SubNav';
import WeekModal from './components/layout/WeekModal';
import ProjectModal from './components/layout/ProjectModal';
import WeekDropdown from './components/layout/WeekDropdown';
import OKRPage from './pages/OKRPage';
import ExecPage from './pages/ExecPage';
import GridPage from './pages/GridPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ScoringPage from './pages/ScoringPage';
import SettingsPage from './pages/SettingsPage';

export const ToastCtx = createContext(null);
export const useToastCtx = () => useContext(ToastCtx);

export default function App() {
  const { toast, showToast } = useToast();
  const activeView = useStore(s => s.activeView);
  const settings = useStore(s => s.settings);

  useEffect(() => {
    if (settings.ejsPK && window.emailjs) {
      try { window.emailjs.init({ publicKey: settings.ejsPK }); } catch(e) {}
    }
  }, [settings.ejsPK]);

  const pages = {
    okr: OKRPage, exec: ExecPage, grid: GridPage,
    analytics: AnalyticsPage, scoring: ScoringPage, settings: SettingsPage,
  };
  const Page = pages[activeView] || OKRPage;

  return (
    <ToastCtx.Provider value={showToast}>
      <div style={{ minHeight: '100vh' }}>
        <Topbar />
        <div className="app-body">
          <Sidebar />
          <div className="content-area">
            {activeView === 'okr' && <SubNav />}
            <main><Page /></main>
          </div>
        </div>
        <WeekModal />
        <ProjectModal />
        <WeekDropdown />
        <div className={'toast' + (toast.show ? ' show' : '')}>{toast.msg}</div>
      </div>
    </ToastCtx.Provider>
  );
}
