import React from 'react';
import ReactDOM from 'react-dom/client';
import '../shared/styles/globals.css';
import App from './App';
import { initializeTheme } from '../shared/store/theme';

initializeTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
