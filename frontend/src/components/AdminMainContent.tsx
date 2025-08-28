'use client';

import { FaBars } from 'react-icons/fa';

export function AdminMainContentHeader() {
  return (
    <div className="flex-1 overflow-x-hidden md:ml-64">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="flex justify-between items-center p-4">
          {/* Título e descrição */}
          <div></div>

          {/* Botão Mobile */}
          <div className="md:hidden">
            <button
              id="mobile-menu"
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Abrir menu lateral"
            >
              <FaBars />
            </button>
          </div>
        </div>
      </header>
    </div>
  );
}
