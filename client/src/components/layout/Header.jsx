import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Search, Palette, Bell, Terminal, ChevronRight, X, FolderGit2, FileCode2, BookmarkCheck, GitPullRequest } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme, themes } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const searchRef = useRef(null);

  // Parse path breadcrumbs
  const pathParts = location.pathname.split('/').filter(Boolean);

  // Global search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.search(searchQuery);
        setSearchResults(res.results);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener for search dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectResult = (path) => {
    setShowSearchDropdown(false);
    setSearchQuery('');
    navigate(path);
  };

  return (
    <header className="h-16 bg-archival-surface border-b border-archival-border px-6 flex items-center justify-between gap-4 z-20">
      {/* Breadcrumbs & Title */}
      <div className="flex items-center gap-2 text-xs font-mono text-archival-muted">
        <Link to="/" className="hover:text-archival-accent transition-colors font-medium">
          Console
        </Link>
        {pathParts.map((part, index) => {
          const path = `/${pathParts.slice(0, index + 1).join('/')}`;
          const isLast = index === pathParts.length - 1;
          const label = part.charAt(0).toUpperCase() + part.slice(1);

          return (
            <React.Fragment key={path}>
              <ChevronRight className="w-3.5 h-3.5 text-archival-border" />
              {isLast ? (
                <span className="text-archival-text font-semibold capitalize">{label}</span>
              ) : (
                <Link to={path} className="hover:text-archival-accent transition-colors capitalize">
                  {label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Center Search Bar */}
      <div className="relative flex-1 max-w-md" ref={searchRef}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-archival-muted absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            placeholder="Search projects, items, baselines, revisions..."
            className="w-full bg-archival-elevated/70 border border-archival-border rounded-lg pl-9 pr-8 py-1.5 text-xs text-archival-text placeholder-archival-muted focus:outline-none focus:border-archival-accent transition-all font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
              }}
              className="absolute right-2.5 text-archival-muted hover:text-archival-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchDropdown && (searchResults || isSearching) && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-archival-elevated border border-archival-border rounded-lg shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
            {isSearching ? (
              <div className="p-4 text-xs text-archival-muted text-center font-mono">
                Scanning SCM database...
              </div>
            ) : searchResults ? (
              <div className="p-2 space-y-3">
                {/* Projects */}
                {searchResults.projects?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono text-archival-accent uppercase px-2 py-1 flex items-center gap-1.5">
                      <FolderGit2 className="w-3 h-3" /> Projects
                    </div>
                    {searchResults.projects.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectResult(`/projects/${p.id}`)}
                        className="px-2.5 py-1.5 rounded hover:bg-archival-surface cursor-pointer text-xs flex items-center justify-between transition-colors"
                      >
                        <span className="font-medium text-archival-text">{p.name}</span>
                        <span className="text-[10px] font-mono text-archival-muted">rev: {p.current_revision?.substring(0, 8)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Configuration Items */}
                {searchResults.items?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono text-archival-teal uppercase px-2 py-1 flex items-center gap-1.5">
                      <FileCode2 className="w-3 h-3" /> Configuration Items
                    </div>
                    {searchResults.items.map((i) => (
                      <div
                        key={i.id}
                        onClick={() => handleSelectResult(`/projects/${i.project_id}?tab=configurations`)}
                        className="px-2.5 py-1.5 rounded hover:bg-archival-surface cursor-pointer text-xs flex items-center justify-between transition-colors"
                      >
                        <span className="font-mono text-archival-text">{i.path}</span>
                        <span className="text-[10px] text-archival-muted">{i.project_name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Baselines */}
                {searchResults.baselines?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono text-archival-warning uppercase px-2 py-1 flex items-center gap-1.5">
                      <BookmarkCheck className="w-3 h-3" /> Baselines
                    </div>
                    {searchResults.baselines.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => handleSelectResult(`/projects/${b.project_id}?tab=baselines`)}
                        className="px-2.5 py-1.5 rounded hover:bg-archival-surface cursor-pointer text-xs flex items-center justify-between transition-colors"
                      >
                        <span className="font-medium text-archival-text">{b.baseline_code}: {b.name}</span>
                        <span className="text-[10px] font-mono text-archival-muted">{b.project_name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Change Requests */}
                {searchResults.changes?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono text-archival-success uppercase px-2 py-1 flex items-center gap-1.5">
                      <GitPullRequest className="w-3 h-3" /> Changes
                    </div>
                    {searchResults.changes.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectResult(`/projects/${c.project_id}?tab=changes`)}
                        className="px-2.5 py-1.5 rounded hover:bg-archival-surface cursor-pointer text-xs flex items-center justify-between transition-colors"
                      >
                        <span className="text-archival-text">{c.change_code}: {c.title}</span>
                        <span className="text-[10px] font-mono text-archival-muted">{c.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {(!searchResults.projects?.length &&
                  !searchResults.items?.length &&
                  !searchResults.baselines?.length &&
                  !searchResults.changes?.length) && (
                  <div className="p-4 text-xs text-archival-muted text-center">
                    No matching SCM records found for "{searchQuery}".
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Right Actions: SCM Badge & Theme Switcher */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-archival-elevated border border-archival-border text-[11px] font-mono text-archival-teal">
          <Terminal className="w-3.5 h-3.5" />
          <span>Fossil Engine</span>
        </div>

        {/* Theme Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowThemeDropdown(!showThemeDropdown)}
            className="flex items-center gap-2 p-2 rounded-lg bg-archival-elevated hover:bg-archival-border/60 border border-archival-border text-archival-text transition-colors"
            title="Switch Theme"
          >
            <Palette className="w-4 h-4 text-archival-accent" />
          </button>

          {showThemeDropdown && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg bg-archival-elevated border border-archival-border shadow-2xl p-1.5 z-50 animate-in fade-in-50">
              <div className="text-[10px] font-mono text-archival-muted uppercase tracking-wider px-2 py-1 border-b border-archival-border mb-1">
                Visual Theme
              </div>
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setShowThemeDropdown(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded text-xs transition-colors flex flex-col gap-0.5 ${
                    theme === t.id
                      ? 'bg-archival-accent/15 text-archival-accent border border-archival-accent/30 font-semibold'
                      : 'text-archival-text hover:bg-archival-surface'
                  }`}
                >
                  <span className="font-medium">{t.name}</span>
                  <span className="text-[10px] text-archival-muted font-normal">{t.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
