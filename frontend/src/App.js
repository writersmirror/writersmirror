import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PlottoProvider } from "./contexts/PlottoContext";
import { BuilderProvider } from "./contexts/BuilderContext";

import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Browse from "./pages/Browse";
import ConflictDetail from "./pages/ConflictDetail";
import Dice from "./pages/Dice";
import StoryBuilder from "./pages/StoryBuilder";
import Login from "./pages/Login";
import MyLibrary from "./pages/MyLibrary";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-ink-muted text-sm">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-paper text-ink-muted text-sm">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Login />} />
      <Route
        path="*"
        element={
          <Layout>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/conflict/:id" element={<ConflictDetail />} />
              <Route path="/dice" element={<Dice />} />
              <Route path="/builder" element={<StoryBuilder />} />
              <Route
                path="/library"
                element={
                  <ProtectedRoute>
                    <MyLibrary />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlottoProvider>
          <BuilderProvider>
            <AppRoutes />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "#FFFFFF",
                  border: "1px solid #D1CFC7",
                  color: "#2F2E2C",
                  fontFamily: "Saira, sans-serif",
                  fontSize: "14px",
                },
              }}
            />
          </BuilderProvider>
        </PlottoProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
