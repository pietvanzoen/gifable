import { Link, NavLink } from "@remix-run/react";
import { useState } from "react";
import { useHydrated } from "remix-utils";

export default function Header({ showNav }: { showNav: boolean }) {
  const isHydrated = useHydrated();
  const [navOpen, setNavOpen] = useState(false);
  return (
    <header id="top">
      <a href="#main" className="skip-to-content">
        Skip to content
      </a>

      <div className="title-row">
        <div>{/* ensure css grid works */}</div>

        <h1>
          <Link
            className="title-link"
            tabIndex={-1}
            onClick={() => setNavOpen(false)}
            to="/"
          >
            Gifable
          </Link>
        </h1>

        {showNav ? (
          <button
            onClick={() => setNavOpen(!navOpen)}
            className="mobile-nav"
            aria-label="Toggle navigation"
            aria-expanded={navOpen}
            aria-controls="site-menu"
            hidden={!isHydrated}
          >
            {navOpen ? "✕" : "☰"}
          </button>
        ) : (
          <div></div>
        )}
      </div>

      {showNav ? (
        <nav
          id="site-menu"
          className={navOpen || !isHydrated ? "open" : "closed"}
        >
          <ul>
            <li>
              <NavLink
                prefetch="intent"
                onClick={() => setNavOpen(false)}
                aria-label="Search media"
                to="/"
              >
                Search
              </NavLink>
            </li>
            <li>
              <NavLink
                prefetch="intent"
                onClick={() => setNavOpen(false)}
                aria-label="Add media"
                to="/media/new"
              >
                Add
              </NavLink>
            </li>
            <li>
              <NavLink
                prefetch="intent"
                onClick={() => setNavOpen(false)}
                to="/settings"
              >
                Settings
              </NavLink>
            </li>
            <li>
              <Link onClick={() => setNavOpen(false)} to="/logout">
                Logout
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
