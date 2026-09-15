import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Book, Dice5, Home, Library, LogOut, Menu, PenLine, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useBuilder } from "../contexts/BuilderContext";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/browse", label: "Browse", icon: Book },
  { to: "/dice", label: "Roll the Dice", icon: Dice5 },
  { to: "/builder", label: "Story Studio", icon: PenLine },
  { to: "/library", label: "My Library", icon: Library, protected: true },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { draft } = useBuilder();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const conflictCount = draft.conflicts.length;

  return (
    <div className="min-h-screen bg-paper text-ink font-body flex flex-col">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-line-strong bg-surface">
        <Link to="/" className="text-lg font-heading uppercase tracking-tight text-terra">
          Plotto
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-ink hover:text-terra"
          data-testid="mobile-menu-button"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-b border-line-strong bg-surface px-4 py-3 flex flex-col gap-1">
          {navItems.map((item) => {
            if (item.protected && !user) return null;
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors",
                  active ? "text-terra bg-terra/10 font-medium" : "text-ink-muted hover:text-ink"
                )}
              >
                <Icon size={16} />
                {item.label}
                {item.to === "/builder" && conflictCount > 0 && (
                  <span className="ml-auto text-xs bg-terra text-white px-1.5 py-0.5 rounded-full">
                    {conflictCount}
                  </span>
                )}
              </Link>
            );
          })}
          {user ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-ink-muted hover:text-terra"
            >
              <LogOut size={16} /> Logout ({user.name})
            </button>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-sm text-sm text-terra font-medium"
            >
              Sign In
            </Link>
          )}
        </div>
      )}

      {/* Desktop layout */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-line-strong bg-surface h-screen sticky top-0 overflow-y-auto thin-scroll">
          <div className="p-6 border-b border-line">
            <Link to="/" className="block">
              <h1 className="text-2xl font-heading uppercase tracking-tight text-terra">
                Plotto
              </h1>
              <p className="text-xs text-ink-muted mt-1">Navigator</p>
            </Link>
          </div>

          <nav className="flex-1 p-4 flex flex-col gap-1">
            {navItems.map((item) => {
              if (item.protected && !user) return null;
              const Icon = item.icon;
              const active = location.pathname === item.to ||
                (item.to !== "/" && location.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-colors",
                    active
                      ? "text-terra bg-terra/10 font-medium border-l-2 border-terra"
                      : "text-ink-muted hover:text-ink hover:bg-line/50"
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                  {item.to === "/builder" && conflictCount > 0 && (
                    <span
                      data-testid="sidebar-builder-badge"
                      className="ml-auto text-xs bg-terra text-white px-1.5 py-0.5 rounded-full"
                    >
                      {conflictCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-line">
            {user ? (
              <div className="flex flex-col gap-2">
                <div className="text-xs text-ink-muted">
                  Signed in as<br />
                  <span className="text-ink font-medium">{user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  data-testid="sidebar-logout-button"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-ink-muted hover:text-terra transition-colors"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                data-testid="sidebar-login-button"
                className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-terra text-white rounded-sm hover:bg-terra/90 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
