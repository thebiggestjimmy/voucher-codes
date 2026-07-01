import { NavLink } from 'react-router-dom';
import type { Category } from '../types';

interface Props {
  categories: Category[];
  totalCategoryCount: number;
}

export function Sidebar({ categories, totalCategoryCount }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <p className="sidebar__title">Categories</p>
      </div>
      <ul className="sidebar__list">
        <li>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `sidebar__item ${isActive ? 'sidebar__item--active' : ''}`
            }
          >
            <span>
              <span className="sidebar__dot" style={{ background: '#94a3b8' }} />
              All categories
            </span>
            <span className="sidebar__count">{totalCategoryCount}</span>
          </NavLink>
        </li>
        {categories.map((c) => (
          <li key={c.id}>
            <NavLink
              to={`/category/${c.slug}`}
              className={({ isActive }) =>
                `sidebar__item ${isActive ? 'sidebar__item--active' : ''}`
              }
            >
              <span>
                <span className="sidebar__dot" style={{ background: c.color }} />
                {c.name}
              </span>
              <span className="sidebar__count">{c.siteCount}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}
