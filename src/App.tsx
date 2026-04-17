import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout, Dashboard, Portfolio, Screener, Alerts, Settings } from './components';

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/screener" element={<Screener />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;