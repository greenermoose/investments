// src/App.jsx revision: 1
import React from 'react';
import PortfolioManager from './components/PortfolioManager';
import { PortfolioProvider } from './context/PortfolioContext';

function App() {
  return (
    <PortfolioProvider>
      <PortfolioManager />
    </PortfolioProvider>
  );
}

export default App;