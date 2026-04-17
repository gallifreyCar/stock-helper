import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout, Dashboard, Portfolio, Screener, Alerts, Settings } from './components';

function App() {
  return (
    <BrowserRouter basename="/stock-helper">
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/screener" element={<Screener />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;