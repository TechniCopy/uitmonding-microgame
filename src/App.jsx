import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { C } from "./shared.jsx";
import UitmondingGame from "./UitmondingGame.jsx";

// Alle schermen voor het Ctrl-D controlemenu (beheerders/testers)
const DEV_SCREENS = [
  { id: "start", label: "Startscherm" },
  { id: "m1intro", label: "Missie 1 — intro" },
  { id: "m1r1", label: "M1-R1 — uitmondingsgebieden" },
  { id: "m1r1mc", label: "M1-R1 — MC-controle" },
  { id: "m1r2", label: "M1-R2 — toestel naar gebied" },
  { id: "m1r2mc", label: "M1-R2 — MC-controle" },
  { id: "m1r3", label: "M1-R3 — belemmering + perceelgrens" },
  { id: "m1r3mc", label: "M1-R3 — MC-controle" },
  { id: "tussen", label: "Tussenscherm" },
  { id: "m2intro", label: "Missie 2 — intro" },
  { id: "m2r1", label: "M2-R1 — modelsituaties" },
  { id: "m2r1mc", label: "M2-R1 — MC-controle" },
  { id: "m2r2", label: "M2-R2 — verdunningsfactor" },
  { id: "m2r2mc", label: "M2-R2 — MC-controle" },
  { id: "m2r3", label: "M2-R3 — combitoestel + RGA/LTV" },
  { id: "m2r3mc", label: "M2-R3 — MC-controle" },
  { id: "end", label: "Eindscherm" },
  { id: "gameover", label: "Game over" },
];

function DevMenu({ onJump, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="rounded-2xl border-2 shadow-2xl p-5 w-full max-w-xl max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: C.bgCard, borderColor: C.brownText }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold italic text-lg" style={{ color: C.brownText }}>
            Controlemenu{" "}
            <span className="text-xs font-normal not-italic" style={{ color: C.brown }}>
              (Ctrl-D · score en levens worden gereset bij een sprong)
            </span>
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/10">
            <X className="w-5 h-5" style={{ color: C.brownText }} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {DEV_SCREENS.map((s) => (
            <button
              key={s.id}
              onClick={() => onJump(s.id)}
              className="text-left px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors hover:shadow"
              style={{ borderColor: C.beigeMid, color: C.brownText, backgroundColor: "white" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.oliveLight)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState({ screen: "start", key: 0 });
  const [devOpen, setDevOpen] = useState(() => new URLSearchParams(window.location.search).get("debug") === "1");

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setDevOpen((prev) => !prev);
      }
      if (e.key === "Escape") setDevOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const devJump = (screen) => {
    setDevOpen(false);
    // key-bump remount de game: score 0, volle 5 levens
    setView((prev) => ({ screen, key: prev.key + 1 }));
  };

  return (
    <>
      <UitmondingGame key={view.key} initialScreen={view.screen} />
      {devOpen && <DevMenu onJump={devJump} onClose={() => setDevOpen(false)} />}
    </>
  );
}
