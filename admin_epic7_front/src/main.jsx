import React from 'react';
import { StrictMode } from 'react'

import './index.css'
import App from './App.jsx'
import { BrowserRouter } from "react-router-dom";
import { SettingsProvider } from "./context/SettingsContext.jsx";
import { createRoot } from 'react-dom/client'
import { Routes, Route, Outlet } from "react-router-dom";
import ReactDOM from 'react-dom/client';


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
