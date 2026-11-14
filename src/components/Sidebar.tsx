'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const sections = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'plan', label: 'Plan media maratón' },
  { id: 'calendario', label: 'Calendario' },
  { id: 'analisis', label: 'Análisis' },
  { id: 'historial', label: 'Historial' },
  { id: 'ejercicios', label: 'Ejercicios' },
] as const;
type Section = (typeof sections)[number]['id'];
const isSection = (value: string | null): value is Section => sections.some((section) => section.id === value);
const SECTION_EVENT = 'runninghub:section-change';

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>('resumen');

  useEffect(() => {
    const syncFromUrl = () => {
      const section = new URLSearchParams(window.location.search).get('section');
      if (isSection(section)) setActiveSection(section);
      else setActiveSection('resumen');
    };
    const onSectionChange = (event: Event) => {
      const section = (event as CustomEvent<string>).detail;
      if (isSection(section)) setActiveSection(section);
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    window.addEventListener(SECTION_EVENT, onSectionChange);
    return () => {
      window.removeEventListener('popstate', syncFromUrl);
      window.removeEventListener(SECTION_EVENT, onSectionChange);
    };
  }, []);

  const selectSection = (section: Section, event: React.MouseEvent<HTMLAnchorElement>) => {
    setIsOpen(false);
    setActiveSection(section);
    if (pathname !== '/historial') return;
    event.preventDefault();
    window.history.replaceState(null, '', `/historial?section=${section}`);
    window.dispatchEvent(new CustomEvent(SECTION_EVENT, { detail: section }));
  };

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menú"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2.5 bg-zinc-900 rounded-lg border border-zinc-800"
      >
        <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`w-56 bg-zinc-950 border-r border-zinc-800/50 h-screen fixed left-0 top-0 flex flex-col z-50 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 12h3l2.25-6 4.5 12 2.25-6h3" />
              </svg>
            </div>
            <span className="font-semibold text-zinc-100 text-sm">Mis entrenamientos</span>
          </div>
        </div>

        <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">Entrenamiento</p>
          <div className="space-y-1">
            {sections.map((section) => {
              const active = pathname === '/historial' && activeSection === section.id;
              return (
                <Link
                  key={section.id}
                  href={`/historial?section=${section.id}`}
                  onClick={(event) => selectSection(section.id, event)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    active ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-white'
                  }`}
                >
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-zinc-700'}`} />
                  <span>{section.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="px-4 py-3 border-t border-zinc-800/50">
          <p className="text-[11px] text-zinc-600">Fuerza · cardio · evolución</p>
        </div>
      </aside>
    </>
  );
}
