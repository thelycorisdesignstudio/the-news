import { useApp } from '../context/AppContext';

export default function FilterBar() {
  const { categories, activeCategory, changeCategory } = useApp();

  return (
    <div className="filter-bar">
      {categories.map(cat => (
        <button
          key={cat}
          className={`filter-pill${cat === activeCategory ? ' active' : ''}`}
          onClick={() => changeCategory(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
