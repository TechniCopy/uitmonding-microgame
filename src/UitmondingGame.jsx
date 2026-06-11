import { useState, useEffect, useCallback, useRef } from "react";
import { Wind, CheckCircle, ArrowRight, RotateCcw, Star, Heart, Lightbulb } from "lucide-react";
import {
  C,
  useGameJuice,
  DragProvider,
  Draggable,
  DropTarget,
  DragCard,
  ProgressBar,
  GameButton,
  FeedbackPopup,
  IntroScreen,
  MCControle,
  EndScreen,
  StepBanner,
  playSound,
} from "./shared.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// VRAGENPOOLS — per ronde 3 vragen; de game kiest er willekeurig één en
// shuffelt de antwoordopties (Fisher-Yates, in shared.jsx). correct: 0 = de
// eerste optie hieronder; na shuffle staat het juiste antwoord steeds ergens
// anders.
// ─────────────────────────────────────────────────────────────────────────────

const POOL_M1R1 = [
  {
    question: "Welke overdruk geldt in uitmondingsgebied III in het binnenland?",
    options: ["25 Pa", "0 Pa", "37 Pa", "40 Pa"],
    correct: 0,
    feedbackCorrect: "Klopt! Gebied III binnenland = 25 Pa. In kustgebied is dit 40 Pa.",
    feedbackWrong:
      "Gebied III binnenland = 25 Pa. Gebied IV (belemmering < 15 m) heeft 37 Pa, en 40 Pa hoort bij gebied III in kustgebied.",
    bron: "NPR 3378-60:2022, § 5.1.2 (drukwaarden onder figuur 2)",
  },
  {
    question: "Welke uitmondingsgebieden gelden als 'vrije' gebieden (overdruk 0 Pa)?",
    options: ["Gebied I en gebied II", "Alleen gebied I", "Gebied I, II en III", "Gebied I en gebied V"],
    correct: 0,
    feedbackCorrect:
      "Juist! Gebieden I en II zijn vrij van overdruk. In gebied II is wel een stabiliserende kap nodig bij belendende bebouwing op > 15 m.",
    feedbackWrong: "Gebied I (0 Pa) en gebied II (0 Pa) zijn de vrije uitmondingsgebieden. Vanaf gebied III geldt overdruk.",
    bron: "NPR 3378-60:2022, § 5.1.2 en § 5.2.1",
  },
  {
    question:
      "Bij een schuin dak met hellingshoek α ≥ 23° en een uitmonding die zich op meer dan 0,8 m van de nok bevindt: in welk gebied bevindt de uitmonding zich dan automatisch?",
    options: [
      "Niet zonder meer in gebied I — de hoogte moet met formule (1) of figuur 4 worden bepaald",
      "Altijd in gebied I",
      "Altijd in gebied II",
      "Altijd in gebied III",
    ],
    correct: 0,
    feedbackCorrect:
      "Correct! De uitmonding moet voldoende boven het dakvlak uitsteken; gebruik formule h ≥ [hmin + 0,16 × (α − 23)] × a.",
    feedbackWrong:
      "Bij verder van de nok wordt de benodigde hoogte snel groot. Uitmonden nabij de nok (binnen 0,8 m) heeft daarom de voorkeur.",
    bron: "NPR 3378-60:2022, § 5.2.3 (formule 1, figuur 4)",
  },
];

const POOL_M1R2 = [
  {
    question:
      "Een B23-toestel mondt uit in uitmondingsgebied III op het dakvlak. Waar moet de verbrandingsluchttoevoeropening zich bevinden?",
    options: [
      "In hetzelfde dakvlak of een aangrenzend gevelvlak met dezelfde oriëntatie",
      "In de tegenoverliggende gevel",
      "Waar dan ook, zolang het maar boven het maaiveld zit",
      "De luchttoevoer mag alleen via de opstellingsruimte",
    ],
    correct: 0,
    feedbackCorrect:
      "Juist! Bij uitmonding in gebied III-V moet de luchttoevoer in hetzelfde dakvlak of aangrenzend gevelvlak zitten — zo blijven uit- en inlaat in dezelfde drukzone.",
    feedbackWrong:
      "Bij uitmonding buiten gebied I/II moet de luchttoevoer in hetzelfde dakvlak of aangrenzend gevelvlak met dezelfde oriëntatie zitten.",
    bron: "NPR 3378-60:2022, § 5.3.1",
  },
  {
    question: "Wanneer mag een type B11-toestel niet uitmonden in uitmondingsgebied II?",
    options: [
      "Als er een belemmerend gebouw op minder dan 15 m afstand staat",
      "Als er geen stabiliserende kap is geplaatst",
      "Als het dak een hellingshoek heeft van meer dan 45 graden",
      "Een B11-toestel mag nooit in gebied II uitmonden",
    ],
    correct: 0,
    feedbackCorrect:
      "Klopt! Gebied II ontstaat juist door belendende bebouwing op > 15 m. Staat de bebouwing dichterbij, dan ontstaan gebieden III-V en mag B11 daar niet uitmonden.",
    feedbackWrong:
      "Bij belemmerende bebouwing < 15 m verschuift de zone naar III, IV of V — en daar mag B11 niet uitmonden, ook niet met kap.",
    bron: "NPR 3378-60:2022, § 5.1.3 (belendende bebouwing) en § 5.2.1",
  },
  {
    question: "Welk type toestel mag in principe in elk uitmondingsgebied uitmonden, mits de fabrikant dat toestaat?",
    options: ["Type C (gesloten toestel)", "Type B11", "Alle types onder dezelfde voorwaarden", "Type A"],
    correct: 0,
    feedbackCorrect:
      "Correct! Type C mag in elk gebied, omdat de uitmonding en luchttoevoer zijn ontworpen om drukverschillen te kunnen overwinnen. De installatie-instructie van de fabrikant is leidend.",
    feedbackWrong:
      "Type C-toestellen zijn gesloten en kunnen drukverschillen overwinnen — mits de fabrikant dat toestaat. Type B11 mag alleen in gebied I/II.",
    bron: "NPR 3378-60:2022, § 6.1.1",
  },
];

const POOL_M1R3 = [
  {
    question: "Wat is de minimale afstand van een rookgasuitmonding in de gevel tot de perceelgrens, loodrecht gemeten?",
    options: ["2 meter", "1 meter", "3 meter", "Er geldt geen afstandseis bij gesloten toestellen"],
    correct: 0,
    feedbackCorrect: "Correct! Loodrecht ten minste 2 m tot de perceelgrens. Langszij is dat 1 m.",
    feedbackWrong:
      "Loodrecht op de gevel is de minimale afstand tot de perceelgrens 2 m. Langszij is dat 1 m. Alleen uitmondingen in het dak zijn vrijgesteld.",
    bron: "NPR 3378-60:2022, § 8.2 (Bbl-eisen perceelgrens)",
  },
  {
    question: "Welke regels gelden voor een uitmonding van een type C-toestel in een gevel?",
    options: [
      "Minimaal 0,5 m van een dakrand of gevelrand én minimaal 2 m loodrecht van de perceelgrens",
      "De uitmonding moet altijd bovendaks zijn",
      "De uitmonding mag niet in een gevel met ramen zitten",
      "De uitmonding moet minimaal 5 m van elke buitenruimte",
    ],
    correct: 0,
    feedbackCorrect:
      "Juist! Voor type C in de gevel gelden: ten minste 0,5 m van een dakrand/gevelrand/dakoverstek, en loodrecht ten minste 2 m van de perceelgrens.",
    feedbackWrong:
      "Type C in de gevel: 0,5 m van dakrand/gevelrand en 2 m loodrecht van de perceelgrens. Bovendaks is geen vereiste — dat is juist een van de voordelen van type C.",
    bron: "NPR 3378-60:2022, § 6.1.2 (afstanden gevel) en § 8.2 (perceelgrens)",
  },
  {
    question:
      "Een dakdoorvoer is aangesloten op een B11-toestel; het naastgelegen pannendak is van de buren. Mag deze dakdoorvoer hier uitmonden?",
    options: [
      "Nee, de dakdoorvoer moet boven de nok uitkomen, ook al is het naastgelegen dak van de buren",
      "Ja, B11 heeft een trekkende kap",
      "Ja, mits de doorvoer minimaal 0,5 m boven het platte dak uitsteekt",
      "Nee, omdat de rookgassen de buren hinderen",
    ],
    correct: 0,
    feedbackCorrect:
      "Klopt! Bij belendende bebouwing telt de hoogte t.o.v. het hoogste obstakel — ongeacht wiens eigendom. De wind trekt zich niets aan van perceelgrenzen.",
    feedbackWrong:
      "Wind trekt zich niets aan van perceelgrenzen. De uitmonding moet boven de nok van het belendende dak uitkomen om in gebied I/II te blijven.",
    bron: "NPR 3378-60:2022, § 5.1.1 LET OP-kader (wind en belendende bebouwing) en § 5.2.3",
  },
];

const POOL_M2R1 = [
  {
    question: "Welke waarden van C₁ en C₂ horen bij situatie 3 (toevoer in gevel, afvoer hoger in dezelfde gevel)?",
    options: ["C₁ = 500 en C₂ = 0", "C₁ = 163 en C₂ = 325", "C₁ = 80 en C₂ = 80", "C₁ = 500 en C₂ = -325"],
    correct: 0,
    feedbackCorrect:
      "Klopt! Situatie 3: C₁ = 500, C₂ = 0. Door C₂ = 0 telt het hoogteverschil niet mee — alleen de kortste afstand.",
    feedbackWrong: "Bij situatie 3 hoort C₁ = 500 en C₂ = 0. C₂ = 0 betekent dat het hoogteverschil niet meetelt in de formule.",
    bron: "NPR 3378-60:2022, § 9.2 tabel 2 en bijlage A.2 (situatie 3)",
  },
  {
    question: "Welke modelsituatie geldt wanneer zowel de uitmonding als de ventilatieopening in hetzelfde dakvlak liggen?",
    options: ["Situatie 5", "Situatie 1", "Situatie 3", "Situatie 4"],
    correct: 0,
    feedbackCorrect: "Correct! Bij toevoer en afvoer in hetzelfde dakvlak hoort situatie 5, met C₁ = C₂ = 80.",
    feedbackWrong: "Toevoer en afvoer in hetzelfde dakvlak = situatie 5. De waarden 500/0 horen bij situaties met gevel-gevel.",
    bron: "NPR 3378-60:2022, § 9.2 tabel 2 en bijlage A.2 (situatie 5)",
  },
  {
    question: "Bij welke modelsituatie kan de waarde van C₂ negatief zijn?",
    options: [
      "Situatie 4 — toevoer in gevel ten opzichte van een lager gelegen afvoer in dezelfde gevel",
      "Situatie 1",
      "Situatie 2",
      "Situatie 5",
    ],
    correct: 0,
    feedbackCorrect:
      "Juist! Situatie 4 heeft C₂ = -325. De afvoer ligt lager dan de toevoer — het hoogteverschil werkt dan negatief in de formule.",
    feedbackWrong:
      "Bij situatie 4 (afvoer lager dan toevoer in dezelfde gevel) is C₂ = -325. Het hoogteverschil werkt dan negatief: minder verdunning.",
    bron: "NPR 3378-60:2022, § 9.2 tabel 2 en bijlage A.2 (situatie 4)",
  },
];

const POOL_M2R2 = [
  {
    question:
      "Een uitmonding van een rookgasafvoer zit in de gevel op een hoogte van 0,9 m boven een ventilatierooster. De kortste afstand is 1,3 m. Het toestel heeft een belasting van 36 kW. Voldoet deze positie aan de verdunningsfactor?",
    options: [
      "Ja, de verdunningsfactor is kleiner dan 0,01",
      "Nee, de uitmonding zit te dicht bij het ventilatierooster",
      "Nee, een uitmonding mag nooit boven een ventilatierooster in dezelfde gevel zitten",
      "Dat kan niet berekend worden zonder de diameter te weten",
    ],
    correct: 0,
    feedbackCorrect:
      "Correct! Situatie 3: f = 36 / (500 × 1,3² + 0 × 0,9²) = 36 / 845 = 0,0043. Dat is kleiner dan 0,01 — voldoet.",
    feedbackWrong:
      "In situatie 3 telt alleen de afstand l. f = 36 / (500 × 1,3²) = 0,0043. Dat is ruim kleiner dan 0,01: de positie voldoet.",
    bron: "NPR 3378-60:2022, § 9.3 voorbeeld 1 (uitgewerkt rekenvoorbeeld)",
  },
  {
    question: "Wat is de maximale toegestane verdunningsfactor f voor uitmondingen van gasgestookte toestellen?",
    options: ["0,01", "0,1", "0,001", "1,0"],
    correct: 0,
    feedbackCorrect: "Juist! De eis is f ≤ 0,01. Dat komt overeen met ongeveer 1.000 ppm CO₂ in de toevoerlucht.",
    feedbackWrong:
      "De eis is f ≤ 0,01. Dat komt overeen met circa 0,1% CO₂ (1.000 ppm) in de toevoerlucht. Buitenlucht zelf zit op circa 400 ppm.",
    bron: "NPR 3378-60:2022, § 9.1 en § 9.2 (eis verdunningsfactor)",
  },
  {
    question: "Wat gebeurt er met de berekende verdunningsfactor als je de uitmonding verder van het ventilatierooster plaatst?",
    options: [
      "f wordt kleiner — de afstand l zit in de noemer, dus meer afstand = beter verdund",
      "f wordt groter",
      "f blijft gelijk — alleen B beïnvloedt f",
      "f wordt onvoorspelbaar — alleen meten geeft uitsluitsel",
    ],
    correct: 0,
    feedbackCorrect:
      "Klopt! f = B / (C₁·l² + C₂·Δh²). De afstand l zit in de noemer, dus groter wordt de noemer en kleiner wordt f. Meer afstand betekent betere verdunning.",
    feedbackWrong:
      "f = B / (C₁·l² + C₂·Δh²). Een grotere l vergroot de noemer en verkleint f. Meer afstand = lagere verdunningsfactor = beter.",
    bron: "NPR 3378-60:2022, § 9.2 (formule 3 en toelichting)",
  },
];

const POOL_M2R3 = [
  {
    question:
      "Voor het bepalen van de verdunningsfactor f bij combitoestellen tot 40 kW (bovenwaarde) moet worden gerekend met het maximum van:",
    options: [
      "De nominale belasting voor de warmtapwaterfunctie (50%) of de CV-functie",
      "De CV-belasting en 50% van de warmtapwaterbelasting (opgeteld)",
      "50% van de CV-belasting en de volledige warmtapwaterbelasting",
      "50% van beide belastingen",
    ],
    correct: 0,
    feedbackCorrect: "Correct! Bij combi tot 40 kW geldt: rekenen met het maximum van de CV-belasting óf 50% van de tap-belasting.",
    feedbackWrong: "De 50%-regel: rekenen met het maximum van CV-belasting of 50% van de tapbelasting. Niet optellen — het maximum van de twee.",
    bron: "NPR 3378-60:2022, § 9.2 (Berekening met 50% van de tapbelasting)",
  },
  {
    question: "Welke combinatie van rookgasafvoer en luchttoevoer hoort bij een C82 toestel?",
    options: [
      "Gemeenschappelijke rookgasafvoer en individuele luchttoevoer via de gevel",
      "Bovendakse rookgasafvoer met natuurlijke trek en luchttoevoer via opstellingsruimte",
      "Gemeenschappelijke rookgasafvoer én gemeenschappelijke luchttoevoer",
      "Concentrische individuele rookgasafvoer en luchttoevoer",
    ],
    correct: 0,
    feedbackCorrect: "Klopt! C82 = half-CLV: gemeenschappelijk afvoerkanaal, maar elk toestel haalt eigen lucht via de gevel.",
    feedbackWrong:
      "C82 hoort bij half-CLV: rookgasafvoer gemeenschappelijk, luchttoevoer individueel via de gevel. C42 = volledig CLV (beide gemeenschappelijk).",
    bron: "NPR 3378-60:2022, § 7 en NPR 3378-41 (half-CLV-systemen)",
  },
  {
    question: "Wie bepaalt de diameter van de rookgasafvoer en luchttoevoer bij een individueel toestel?",
    options: [
      "De toestelfabrikant — die specificeert dit in de installatie-instructie",
      "De installateur, op basis van de woonkamergrootte",
      "Het is altijd 80 mm bij gasgestookte toestellen",
      "De energieleverancier",
    ],
    correct: 0,
    feedbackCorrect:
      "Juist! De toestelfabrikant geeft in de installatie-instructie de toegestane diameters, lengtes en bochten. Bij CLV is dat de fabrikant van het CLV-systeem.",
    feedbackWrong:
      "De toestelfabrikant bepaalt de diameter — die staat in de installatie-instructie. Bij CLV-systemen is dat de fabrikant van het CLV-systeem.",
    bron: "NPR 3378-60:2022, voorwoord en § 6.1.1 (installatie-instructie fabrikant)",
  },
];

// Overdrukwaarden per uitmondingsgebied (tooltip na juiste plaatsing)
const OVERDRUK = {
  I: "0 Pa",
  II: "0 Pa — met stabiliserende kap",
  III: "25 Pa binnenland / 40 Pa kust",
  IV: "37 Pa binnenland / 60 Pa kust",
  V: "12 Pa binnenland / 20 Pa kust",
};

// ─────────────────────────────────────────────────────────────────────────────
// ALGEMENE HULPCOMPONENTEN
// ─────────────────────────────────────────────────────────────────────────────

// Hint-balkje onder een interactie
function HintBar({ text }) {
  if (!text) return null;
  return (
    <div
      className="flex items-start gap-2 rounded-xl border-2 px-4 py-2.5 max-w-xl w-full text-sm font-medium"
      style={{ backgroundColor: "#FFF7E0", borderColor: "#D9A62E", color: C.brownText }}
    >
      <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#B8860B" }} />
      <span className="italic">{text}</span>
    </div>
  );
}

// Opdrachtkaart boven een interactie
function OpdrachtKaart({ nr, totaal, text }) {
  return (
    <div
      className="rounded-xl border-2 px-4 py-2.5 max-w-xl w-full text-sm font-bold flex items-center gap-3"
      style={{ backgroundColor: C.bgCard, borderColor: C.brownText, color: C.brownText }}
    >
      <span
        className="rounded-lg px-2 py-0.5 text-[11px] text-white flex-shrink-0"
        style={{ backgroundColor: C.olive }}
      >
        Opdracht {nr}/{totaal}
      </span>
      <span className="italic">{text}</span>
    </div>
  );
}

// Vrij verplaatsbaar element binnen een scene (continu slepen, geen dropzones).
// areaRef wijst naar de relative container die exact even groot is als de SVG.
function FreeDrag({ areaRef, pos, setPos, clamp, onRelease, children, disabled = false }) {
  const draggingRef = useRef(false);
  return (
    <div
      onPointerDown={(e) => {
        if (disabled) return;
        e.preventDefault();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* geen actieve pointer */
        }
        draggingRef.current = true;
      }}
      onPointerMove={(e) => {
        if (!draggingRef.current) return;
        const r = areaRef.current?.getBoundingClientRect();
        if (!r) return;
        setPos(clamp({ x: e.clientX - r.left, y: e.clientY - r.top }));
      }}
      onPointerUp={(e) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        onRelease?.({ clientX: e.clientX, clientY: e.clientY });
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
      className="absolute z-10"
      style={{
        left: pos.x,
        top: pos.y,
        transform: "translate(-50%, -50%)",
        touchAction: "none",
        userSelect: "none",
        cursor: disabled ? "default" : "grab",
      }}
    >
      {children}
    </div>
  );
}

// Dropzone als gestippeld vak over een SVG-scene (voor zone-labels en toestellen).
// Vult de DropTarget-wrapper volledig, zodat de hit-test op de juiste rect werkt.
function ZoneBox({ value, hover, flash, label, tooltip }) {
  const filled = !!value;
  return (
    <div
      className="w-full h-full rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all duration-200 px-1"
      style={{
        borderStyle: filled ? "solid" : "dashed",
        borderColor: filled ? C.green : flash === "wrong" ? C.red : hover ? C.olive : C.brown,
        backgroundColor: filled
          ? "rgba(232,245,227,0.92)"
          : flash === "wrong"
          ? "rgba(253,234,234,0.9)"
          : hover
          ? "rgba(237,240,224,0.9)"
          : "rgba(255,252,245,0.55)",
      }}
    >
      {filled ? (
        <>
          <span className="flex items-center gap-1 text-xs font-bold" style={{ color: C.green }}>
            <CheckCircle className="w-3.5 h-3.5" /> {value}
          </span>
          {tooltip && (
            <span className="text-[9px] leading-tight font-bold mt-0.5" style={{ color: C.brownText }}>
              {tooltip}
            </span>
          )}
        </>
      ) : (
        <span className="text-[10px] font-bold" style={{ color: C.brown, opacity: 0.8 }}>
          {label || "?"}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MISSIE 1 — RONDE 1: De vijf uitmondingsgebieden (NPR figuur 1 + figuur 2)
// ─────────────────────────────────────────────────────────────────────────────

// Scene 1a: plat dak (figuur 1a) — gebieden I en III
function ScenePlatDak({ zones }) {
  return (
    <svg width={560} height={320} viewBox="0 0 560 320" className="absolute inset-0">
      {/* maaiveld */}
      <line x1="20" y1="290" x2="540" y2="290" stroke={C.brownText} strokeWidth="2.5" />
      {/* gebouw */}
      <rect x="210" y="150" width="180" height="140" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2.5" />
      <rect x="240" y="190" width="34" height="40" fill="#CFE2EE" stroke={C.brownText} strokeWidth="1.5" />
      <rect x="326" y="190" width="34" height="40" fill="#CFE2EE" stroke={C.brownText} strokeWidth="1.5" />
      <rect x="282" y="238" width="32" height="52" fill={C.beigeMid} stroke={C.brownText} strokeWidth="1.5" />
      {/* uitmonding */}
      <rect x="290" y="120" width="16" height="32" fill={C.beigeMid} stroke={C.brownText} strokeWidth="2" />
      <line x1="288" y1="120" x2="308" y2="120" stroke={C.brownText} strokeWidth="2.5" />
      {/* 0,5 m-vlak (gestippeld) */}
      <line x1="160" y1="130" x2="440" y2="130" stroke={C.brown} strokeWidth="1.5" strokeDasharray="7,5" />
      {/* maatlijn 0,5 m */}
      <line x1="178" y1="130" x2="178" y2="150" stroke={C.brown} strokeWidth="1.2" />
      <line x1="173" y1="130" x2="183" y2="130" stroke={C.brown} strokeWidth="1.2" />
      <line x1="173" y1="150" x2="183" y2="150" stroke={C.brown} strokeWidth="1.2" />
      <text x="120" y="144" fontSize="11" fontWeight="700" fill={C.brown}>0,5 m</text>
      <text x="425" y="168" fontSize="11" fontStyle="italic" fontWeight="600" fill={C.brown}>plat dak</text>
      {/* aanduiding zones uit figuur 1a (worden ingevuld door de student) */}
      {zones.I && <text x="297" y="34" fontSize="14" fontWeight="700" fontStyle="italic" fill={C.green} textAnchor="middle"></text>}
    </svg>
  );
}

// Scene 1b: schuin dak α ≥ 23° (figuur 1c) — gebieden I en III
function SceneSchuinDak() {
  return (
    <svg width={560} height={340} viewBox="0 0 560 340" className="absolute inset-0">
      {/* maaiveld */}
      <line x1="20" y1="300" x2="540" y2="300" stroke={C.brownText} strokeWidth="2.5" />
      {/* gevel */}
      <rect x="170" y="210" width="260" height="90" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2.5" />
      <rect x="200" y="235" width="32" height="36" fill="#CFE2EE" stroke={C.brownText} strokeWidth="1.5" />
      <rect x="368" y="235" width="32" height="36" fill="#CFE2EE" stroke={C.brownText} strokeWidth="1.5" />
      <rect x="284" y="248" width="32" height="52" fill={C.beigeMid} stroke={C.brownText} strokeWidth="1.5" />
      {/* schuin dak */}
      <polygon points="160,210 300,110 440,210" fill={C.beigeMid} stroke={C.brownText} strokeWidth="2.5" />
      {/* hellingshoek α */}
      <path d="M 205 210 A 45 45 0 0 0 197 183" fill="none" stroke={C.brown} strokeWidth="1.5" />
      <text x="212" y="196" fontSize="12" fontWeight="700" fontStyle="italic" fill={C.brown}>α ≥ 23°</text>
      {/* 0,8 m-markering vanaf de nok langs het dakvlak */}
      <line x1="300" y1="110" x2="268" y2="133" stroke={C.red} strokeWidth="2" strokeDasharray="4,3" />
      <text x="232" y="128" fontSize="10" fontWeight="700" fill={C.red}>0,8 m</text>
      {/* uitmonding nabij de nok, ≥ 0,5 m boven nok */}
      <rect x="288" y="78" width="16" height="42" fill={C.beigeMid} stroke={C.brownText} strokeWidth="2" />
      <line x1="286" y1="78" x2="306" y2="78" stroke={C.brownText} strokeWidth="2.5" />
      {/* maat 0,5 m boven nok */}
      <line x1="330" y1="110" x2="330" y2="84" stroke={C.brown} strokeWidth="1.2" />
      <line x1="325" y1="110" x2="335" y2="110" stroke={C.brown} strokeWidth="1.2" />
      <line x1="325" y1="84" x2="335" y2="84" stroke={C.brown} strokeWidth="1.2" />
      <text x="340" y="100" fontSize="11" fontWeight="700" fill={C.brown}>0,5 m</text>
      <text x="447" y="226" fontSize="11" fontStyle="italic" fontWeight="600" fill={C.brown}>schuin dak</text>
    </svg>
  );
}

// Scene 1c / R2: figuur 2-composiet — vijf gebieden met belendende bebouwing
function SceneBelendend({ kapInII }) {
  return (
    <svg width={760} height={380} viewBox="0 0 760 380" className="absolute inset-0">
      {/* maaiveld */}
      <line x1="10" y1="340" x2="750" y2="340" stroke={C.brownText} strokeWidth="2.5" />
      {/* belendend gebouw links (≥ 15 m) */}
      <rect x="40" y="130" width="90" height="210" fill={C.beigeMid} stroke={C.brownText} strokeWidth="2.5" />
      <text x="85" y="245" fontSize="10" fontWeight="700" fill={C.brown} textAnchor="middle">belendende</text>
      <text x="85" y="258" fontSize="10" fontWeight="700" fill={C.brown} textAnchor="middle">bebouwing</text>
      {/* belendend gebouw rechts (< 15 m) */}
      <rect x="560" y="120" width="120" height="220" fill={C.beigeMid} stroke={C.brownText} strokeWidth="2.5" />
      <text x="620" y="240" fontSize="10" fontWeight="700" fill={C.brown} textAnchor="middle">belendende</text>
      <text x="620" y="253" fontSize="10" fontWeight="700" fill={C.brown} textAnchor="middle">bebouwing</text>
      {/* hoofdgebouw met schuin dak ≥ 23° */}
      <rect x="300" y="240" width="160" height="100" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2.5" />
      <polygon points="292,240 380,160 468,240" fill={C.beigeMid} stroke={C.brownText} strokeWidth="2.5" />
      <text x="318" y="232" fontSize="10" fontWeight="700" fontStyle="italic" fill={C.brown}>α ≥ 23°</text>
      {/* uitmonding op de nok */}
      <rect x="373" y="128" width="14" height="34" fill={C.beigeMid} stroke={C.brownText} strokeWidth="2" />
      {/* stabiliserende kap in gebied II (animatie bij B11-plaatsing) */}
      {kapInII && (
        <g style={{ animation: "kapVerschijnt 0.6s ease-out" }}>
          <rect x="296" y="186" width="12" height="22" fill={C.beigeMid} stroke={C.brownText} strokeWidth="2" />
          <path d="M 292 186 L 302 174 L 312 186 Z" fill={C.olive} stroke={C.brownText} strokeWidth="2" />
          <line x1="290" y1="180" x2="296" y2="180" stroke={C.brownText} strokeWidth="1.5" />
          <line x1="308" y1="180" x2="314" y2="180" stroke={C.brownText} strokeWidth="1.5" />
        </g>
      )}
      {/* 10°-lijnen vanaf de belendende gebouwen (figuur 2) */}
      <line x1="130" y1="130" x2="380" y2="174" stroke={C.brown} strokeWidth="1.5" strokeDasharray="7,5" />
      <text x="166" y="128" fontSize="10" fontWeight="700" fill={C.brown}>10°</text>
      <line x1="560" y1="120" x2="430" y2="143" stroke={C.brown} strokeWidth="1.5" strokeDasharray="7,5" />
      <text x="528" y="116" fontSize="10" fontWeight="700" fill={C.brown}>10°</text>
      {/* afstandsmaten */}
      <line x1="130" y1="358" x2="300" y2="358" stroke={C.brown} strokeWidth="1.2" />
      <line x1="130" y1="352" x2="130" y2="364" stroke={C.brown} strokeWidth="1.2" />
      <line x1="300" y1="352" x2="300" y2="364" stroke={C.brown} strokeWidth="1.2" />
      <text x="215" y="375" fontSize="11" fontWeight="700" fill={C.brown} textAnchor="middle">≥ 15 m</text>
      <line x1="460" y1="358" x2="560" y2="358" stroke={C.brown} strokeWidth="1.2" />
      <line x1="460" y1="352" x2="460" y2="364" stroke={C.brown} strokeWidth="1.2" />
      <line x1="560" y1="352" x2="560" y2="364" stroke={C.brown} strokeWidth="1.2" />
      <text x="510" y="375" fontSize="11" fontWeight="700" fill={C.brown} textAnchor="middle">&lt; 15 m</text>
    </svg>
  );
}

// Zone-rects over de figuur 2-composiet
const ZONES2 = [
  { id: "I", x: 330, y: 88, w: 100, h: 58 },
  { id: "II", x: 232, y: 146, w: 92, h: 56 },
  { id: "III", x: 168, y: 252, w: 108, h: 72 },
  { id: "V", x: 466, y: 112, w: 90, h: 60 },
  { id: "IV", x: 466, y: 232, w: 90, h: 76 },
];

function M1R1({ onComplete, addScore, badDrop }) {
  const [stap, setStap] = useState(0); // 0 = plat dak, 1 = schuin dak, 2 = figuur 2
  const [zones, setZones] = useState({});
  const [hint, setHint] = useState(null);
  const [popup, setPopup] = useState(null);

  const stappen = [
    {
      titel: "Plat dak",
      uitleg: "Sleep de zone-labels naar de juiste plek bij dit platte dak (figuur 1 uit de NPR).",
      sceneW: 560,
      sceneH: 320,
      scene: <ScenePlatDak zones={zones} />,
      drops: [
        { id: "plat-I", rect: { x: 215, y: 40, w: 170, h: 82 }, expected: "Gebied I", tooltip: OVERDRUK.I },
        { id: "plat-III", rect: { x: 36, y: 165, w: 132, h: 100 }, expected: "Gebied III", tooltip: OVERDRUK.III },
      ],
      labels: ["Gebied I", "Gebied III"],
      hints: {
        "Gebied I": "Gebied I is het vrije gebied: ten minste 0,5 m bóven het platte dak.",
        "Gebied III": "Gebied III ligt onder het 0,5 m-vlak, naast de gevel.",
      },
    },
    {
      titel: "Schuin dak (α ≥ 23°)",
      uitleg: "Hetzelfde gebouw, maar nu met een schuin dak. Waar liggen de gebieden nu?",
      sceneW: 560,
      sceneH: 340,
      scene: <SceneSchuinDak />,
      drops: [
        { id: "schuin-I", rect: { x: 233, y: 14, w: 134, h: 62 }, expected: "Gebied I", tooltip: OVERDRUK.I },
        { id: "schuin-III", rect: { x: 432, y: 168, w: 112, h: 96 }, expected: "Gebied III", tooltip: OVERDRUK.III },
      ],
      labels: ["Gebied I", "Gebied III"],
      hints: {
        "Gebied I": "Bij een schuin dak ≥ 23° ligt gebied I boven de nok (uitmonding binnen 0,8 m van de nok, 0,5 m erboven).",
        "Gebied III": "Lager op of naast het dakvlak, weg van de nok: daar geldt overdruk — gebied III.",
      },
    },
    {
      titel: "Met belendende bebouwing",
      uitleg:
        "Nu staan er buurgebouwen op verschillende afstanden (figuur 2 uit de NPR). Er zijn vijf gebieden — sleep alle labels naar de juiste plek.",
      sceneW: 760,
      sceneH: 380,
      scene: <SceneBelendend kapInII={false} />,
      drops: ZONES2.map((z) => ({
        id: `f2-${z.id}`,
        rect: { x: z.x, y: z.y, w: z.w, h: z.h },
        expected: `Gebied ${z.id}`,
        tooltip: OVERDRUK[z.id],
      })),
      labels: ["Gebied I", "Gebied II", "Gebied III", "Gebied IV", "Gebied V"],
      hints: {
        "Gebied I": "Gebied I blijft het vrije gebied boven de nok.",
        "Gebied II": "Gebied II ontstaat aan de kant van belendende bebouwing op ≥ 15 m — boven het dakvlak, alleen met stabiliserende kap.",
        "Gebied III": "Gebied III: laag naast de gevel, aan de kant zonder dichtbijstaande belemmering.",
        "Gebied IV": "Gebied IV: laag tussen het gebouw en de belemmering op < 15 m — daar is de overdruk het hoogst (37/60 Pa).",
        "Gebied V": "Gebied V: hoger, boven de 10°-lijn vanaf de belemmering op < 15 m.",
      },
    },
  ];

  const s = stappen[stap];
  const klaar = s.drops.every((d) => zones[d.id]);

  useEffect(() => {
    if (!klaar) return;
    const t = setTimeout(() => {
      if (stap < stappen.length - 1) {
        setPopup({
          type: "correct",
          text:
            stap === 0
              ? "Goed! Boven het 0,5 m-vlak is het vrije gebied I. Daaronder en naast de gevel geldt overdruk: gebied III."
              : "Precies! Bij een schuin dak ≥ 23° telt de nok: binnen 0,8 m van de nok en 0,5 m erboven zit je in gebied I.",
          next: () => {
            setPopup(null);
            setZones({});
            setHint(null);
            setStap(stap + 1);
          },
        });
      } else {
        setPopup({
          type: "correct",
          text:
            "Alle vijf gebieden gevonden! Onthoud de overdrukwaarden: I en II zijn vrij (0 Pa), III = 25/40 Pa, IV = 37/60 Pa en V = 12/20 Pa (binnenland/kust).",
          next: onComplete,
        });
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klaar]);

  const geplaatst = Object.values(zones);

  return (
    <div className="flex-1 flex flex-col items-center p-5">
      <StepBanner step={1} />
      <h2 className="text-xl font-bold italic mb-1" style={{ color: C.brownText }}>
        Ronde 1: De vijf uitmondingsgebieden
      </h2>
      <p className="text-sm mb-3 max-w-xl text-center font-medium" style={{ color: C.brown }}>
        <span className="font-bold">{s.titel}.</span> {s.uitleg}
      </p>

      <div className="overflow-x-auto max-w-full mb-3">
        <div className="relative" style={{ width: s.sceneW, height: s.sceneH }}>
          {s.scene}
          {s.drops.map((d) => (
            <DropTarget
              key={d.id}
              id={d.id}
              onDropItem={(payload, point) => {
                if (zones[d.id]) return undefined;
                if (payload === d.expected) {
                  playSound("drop");
                  setZones((prev) => ({ ...prev, [d.id]: payload }));
                  setHint(null);
                  addScore(5, point);
                  return "correct";
                }
                badDrop(point);
                setHint(s.hints[payload] ?? "Kijk goed naar de figuur uit de NPR.");
                return "wrong";
              }}
              className="absolute"
              style={{ left: d.rect.x, top: d.rect.y, width: d.rect.w, height: d.rect.h }}
              render={({ isHover, flash }) => (
                <ZoneBox value={zones[d.id]} hover={isHover} flash={flash} label="Sleep hier" tooltip={zones[d.id] ? d.tooltip : null} />
              )}
            />
          ))}
        </div>
      </div>

      <HintBar text={hint} />

      <div className="flex gap-3 flex-wrap justify-center mt-3">
        {s.labels
          .filter((l) => !geplaatst.includes(l))
          .map((l) => (
            <Draggable key={l} payload={l}>
              <DragCard label={l} />
            </Draggable>
          ))}
      </div>

      {popup && <FeedbackPopup type={popup.type} text={popup.text} onClose={popup.next} buttonText="Verder" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MISSIE 1 — RONDE 2: Welk toestel mag waar uitmonden?
// ─────────────────────────────────────────────────────────────────────────────

const TOESTELLEN = [
  {
    code: "B11",
    allowed: ["I", "II"],
    uitlegGoed: {
      I: "B11 (open toestel, natuurlijke trek) hoort in het vrije gebied I.",
      II: "In gebied II mag B11 alleen mét stabiliserende kap — kijk, die verschijnt automatisch!",
    },
    hintFout: "B11 werkt op natuurlijke trek en kan geen overdruk overwinnen. Alleen gebied I, of gebied II mét stabiliserende kap.",
  },
  {
    code: "B22",
    allowed: ["I", "II", "III", "IV", "V"],
    uitlegGoed: null, // dynamisch: overdruk benoemen
    hintFout: null,
  },
  {
    code: "B23",
    allowed: ["I", "II", "III", "IV", "V"],
    uitlegGoed: null,
    hintFout: null,
  },
  {
    code: "Type C",
    allowed: ["I", "II", "III", "IV", "V"],
    uitlegGoed: null,
    hintFout: null,
  },
];

function M1R2({ onComplete, addScore, badDrop }) {
  const [toestelIdx, setToestelIdx] = useState(0);
  const [geplaatst, setGeplaatst] = useState({}); // zoneId -> toestelcode
  const [kapInII, setKapInII] = useState(false);
  const [hint, setHint] = useState(null);
  const [info, setInfo] = useState(null);
  const [popup, setPopup] = useState(null);

  const toestel = TOESTELLEN[toestelIdx];

  const handleDrop = (zoneId, point) => {
    if (!toestel) return undefined;
    if (toestel.allowed.includes(zoneId)) {
      playSound("drop");
      setGeplaatst((prev) => ({ ...prev, [zoneId]: toestel.code }));
      if (toestel.code === "B11" && zoneId === "II") setKapInII(true);
      addScore(5, point);
      setHint(null);
      if (toestel.uitlegGoed) {
        setInfo(toestel.uitlegGoed[zoneId]);
      } else if (toestel.code === "Type C") {
        setInfo(`Type C mag in elk gebied uitmonden — volgens de installatie-instructie van de fabrikant. (Gebied ${zoneId}: ${OVERDRUK[zoneId]}.)`);
      } else {
        setInfo(
          `${toestel.code} heeft een ventilator en mag in elk gebied — mits de ventilator de overdruk aankan. (Gebied ${zoneId}: ${OVERDRUK[zoneId]}.)`
        );
      }
      const volgende = toestelIdx + 1;
      if (volgende >= TOESTELLEN.length) {
        setTimeout(
          () =>
            setPopup({
              type: "correct",
              text: "Alle toestellen geplaatst! B11 is de kieskeurige: alleen gebied I, of II met stabiliserende kap. B22/B23 en type C mogen overal — onder voorwaarden van ventilator en fabrikant.",
              next: onComplete,
            }),
          700
        );
      }
      setTimeout(() => setToestelIdx(volgende), 350);
      return "correct";
    }
    badDrop(point);
    setHint(toestel.hintFout ?? "Kijk naar de overdruk in dit gebied — kan dit toestel die aan?");
    return "wrong";
  };

  return (
    <div className="flex-1 flex flex-col items-center p-5">
      <StepBanner step={1} />
      <h2 className="text-xl font-bold italic mb-1" style={{ color: C.brownText }}>
        Ronde 2: Welk toestel mag waar uitmonden?
      </h2>
      <p className="text-sm mb-3 max-w-xl text-center font-medium" style={{ color: C.brown }}>
        Sleep elk toesteltype naar een uitmondingsgebied waar het mág uitmonden. Let op: B11 is kritisch!
      </p>

      <div className="overflow-x-auto max-w-full mb-3">
        <div className="relative" style={{ width: 760, height: 380 }}>
          <SceneBelendend kapInII={kapInII} />
          {ZONES2.map((z) => (
            <DropTarget
              key={z.id}
              id={`t-${z.id}`}
              onDropItem={(payload, point) => handleDrop(z.id, point)}
              className="absolute"
              style={{ left: z.x, top: z.y, width: z.w, height: z.h }}
              render={({ isHover, flash }) => (
                <div
                  className="w-full h-full rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all duration-200 px-1"
                  style={{
                    borderStyle: geplaatst[z.id] ? "solid" : "dashed",
                    borderColor: geplaatst[z.id] ? C.green : flash === "wrong" ? C.red : isHover ? C.olive : C.brown,
                    backgroundColor: geplaatst[z.id]
                      ? "rgba(232,245,227,0.92)"
                      : flash === "wrong"
                      ? "rgba(253,234,234,0.9)"
                      : isHover
                      ? "rgba(237,240,224,0.9)"
                      : "rgba(255,252,245,0.6)",
                  }}
                >
                  <span className="text-sm font-bold italic" style={{ color: C.brownText }}>
                    {z.id}
                  </span>
                  <span className="text-[8px] font-bold" style={{ color: C.brown }}>
                    {OVERDRUK[z.id].split(" — ")[0]}
                  </span>
                  {geplaatst[z.id] && (
                    <span className="flex items-center gap-1 text-[10px] font-bold mt-0.5" style={{ color: C.green }}>
                      <CheckCircle className="w-3 h-3" /> {geplaatst[z.id]}
                      {z.id === "II" && geplaatst[z.id] === "B11" ? " + kap" : ""}
                    </span>
                  )}
                </div>
              )}
            />
          ))}
        </div>
      </div>

      <HintBar text={hint} />
      {info && !hint && (
        <div
          className="rounded-xl border-2 px-4 py-2.5 max-w-xl w-full text-sm font-medium italic"
          style={{ backgroundColor: C.greenLight, borderColor: C.green, color: C.brownText }}
        >
          {info}
        </div>
      )}

      <div className="flex gap-3 flex-wrap justify-center mt-3 items-center">
        {toestel ? (
          <>
            <span className="text-xs font-bold" style={{ color: C.brown }}>
              Sleep dit toestel ({toestelIdx + 1}/{TOESTELLEN.length}):
            </span>
            <Draggable key={toestel.code} payload={toestel.code}>
              <DragCard label={toestel.code} />
            </Draggable>
          </>
        ) : (
          <span className="text-xs font-bold" style={{ color: C.green }}>
            Alle toestellen geplaatst!
          </span>
        )}
      </div>

      {popup && <FeedbackPopup type={popup.type} text={popup.text} onClose={popup.next} buttonText="Naar de controlevraag" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MISSIE 1 — RONDE 3: Belendende bebouwing (figuur 3) + perceelgrens (figuur 10)
// ─────────────────────────────────────────────────────────────────────────────

// Deel A — geometrie: schaal 10 px/m, maaiveld y=320, uitmonding U = (100, 250) op 7 m,
// buurpand 14 m hoog. Belemmerend als de top boven het 15°-vlak vanaf U komt.
const BELEM = {
  U: { x: 100, y: 250 },
  tan15: Math.tan((15 * Math.PI) / 180),
  buurW: 80,
  buurTopY: 180, // 14 m hoog (maaiveld 320)
};

function belemStatus(bx) {
  // bx = linkerrand buurpand (px). Horizontale afstand U → gevel buurpand:
  const aM = (bx - BELEM.U.x) / 10; // in m
  const hoogteVerschil = (BELEM.U.y - BELEM.buurTopY) / 10; // 7 m
  const belemmerend = hoogteVerschil / aM > BELEM.tan15;
  const dM = (bx - 140) / 10; // gevel-tot-gevel afstand in m
  return { belemmerend, dM };
}

const BELEM_OPDRACHTEN = [
  {
    text: "Plaats het buurpand zó dat het níét belemmerend is.",
    check: (s) => !s.belemmerend,
    hint: "Schuif het buurpand verder weg: zodra de top ónder het 15°-vlak vanaf de uitmonding blijft, is het niet meer belemmerend.",
  },
  {
    text: "Plaats het buurpand zó dat het wél belemmerend is, maar op ten minste 15 m afstand staat.",
    check: (s) => s.belemmerend && s.dM >= 15,
    hint: "Het pand moet boven het 15°-vlak uitsteken (belemmerend), maar de gevel moet op ≥ 15 m staan — dan mag een B11 nog uitmonden mét stabiliserende kap.",
  },
  {
    text: "Plaats het buurpand belemmerend én dichterbij dan 15 m.",
    check: (s) => s.belemmerend && s.dM < 15,
    hint: "Schuif het pand binnen de 15 m-markering. Dan is natuurlijke afvoer niet meer toelaatbaar (gebieden IV en V).",
  },
];

function M1R3A({ onDone, addScore, badDrop }) {
  const areaRef = useRef(null);
  const [pos, setPosState] = useState({ x: 480 + BELEM.buurW / 2, y: 0 });
  // ref naast state: de release-evaluatie moet de áctuele positie zien, ook als
  // React de tussenliggende renders nog niet heeft verwerkt (snelle drags)
  const posRef = useRef(pos);
  const setPos = (p) => {
    posRef.current = p;
    setPosState(p);
  };
  const [opdracht, setOpdracht] = useState(0);
  const [hint, setHint] = useState(null);

  const bx = pos.x - BELEM.buurW / 2;
  const status = belemStatus(bx);

  const handleRelease = (point) => {
    const o = BELEM_OPDRACHTEN[opdracht];
    if (!o) return;
    const actueel = belemStatus(posRef.current.x - BELEM.buurW / 2);
    if (o.check(actueel)) {
      addScore(5, point);
      setHint(null);
      playSound("drop");
      if (opdracht + 1 >= BELEM_OPDRACHTEN.length) {
        onDone();
      } else {
        setOpdracht(opdracht + 1);
      }
    } else {
      badDrop(point);
      setHint(o.hint);
    }
  };

  // 15°-lijn vanaf U
  const lijnEindX = 740;
  const lijnEindY = BELEM.U.y - (lijnEindX - BELEM.U.x) * BELEM.tan15;
  const verdict = status.belemmerend
    ? status.dM < 15
      ? { tekst: "Belemmerend én < 15 m — natuurlijke afvoer niet toelaatbaar", kleur: C.red }
      : { tekst: "Belemmerend, maar ≥ 15 m — natuurlijke afvoer alleen mét stabiliserende kap", kleur: "#B8860B" }
    : { tekst: "Niet belemmerend — natuurlijke afvoer zonder maatregelen toelaatbaar", kleur: C.green };

  return (
    <>
      <OpdrachtKaart nr={opdracht + 1} totaal={3} text={BELEM_OPDRACHTEN[opdracht]?.text ?? ""} />
      <div className="overflow-x-auto max-w-full my-3">
        <div ref={areaRef} className="relative" style={{ width: 760, height: 360 }}>
          <svg width={760} height={360} viewBox="0 0 760 360" className="absolute inset-0">
            {/* belemmeringsgebied boven het 15°-vlak (gearceerd zoals figuur 3) */}
            <defs>
              <pattern id="hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke={C.beigeMid} strokeWidth="2" />
              </pattern>
            </defs>
            <polygon
              points={`${BELEM.U.x},${BELEM.U.y} ${lijnEindX},${lijnEindY} ${lijnEindX},10 ${BELEM.U.x},10`}
              fill="url(#hatch)"
              opacity="0.55"
            />
            {/* maaiveld */}
            <line x1="10" y1="320" x2="750" y2="320" stroke={C.brownText} strokeWidth="2.5" />
            {/* hoofdgebouw met uitmonding op 7 m */}
            <rect x="60" y="260" width="80" height="60" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2.5" />
            <rect x="92" y="250" width="14" height="10" fill={C.beigeMid} stroke={C.brownText} strokeWidth="2" />
            <circle cx={BELEM.U.x} cy={BELEM.U.y} r="4" fill={C.red} />
            <text x="36" y="246" fontSize="10" fontWeight="700" fill={C.brownText}>uitmonding</text>
            {/* 15°-vlak */}
            <line x1={BELEM.U.x} y1={BELEM.U.y} x2={lijnEindX} y2={lijnEindY} stroke={C.brown} strokeWidth="2" strokeDasharray="8,5" />
            <text x="190" y={BELEM.U.y - 32} fontSize="11" fontWeight="700" fill={C.brown}>15°</text>
            <text x="600" y="30" fontSize="10" fontWeight="700" fill={C.brown} textAnchor="end">belemmeringsgebied (15° / 10° diagonaal)</text>
            {/* 15 m-markering vanaf de eigen gevel */}
            <line x1="290" y1="320" x2="290" y2="180" stroke={C.red} strokeWidth="1.5" strokeDasharray="5,4" />
            <text x="290" y="172" fontSize="10" fontWeight="700" fill={C.red} textAnchor="middle">15 m</text>
            {/* afstandsmaat live */}
            <line x1="140" y1="338" x2={bx} y2="338" stroke={C.brown} strokeWidth="1.2" />
            <line x1="140" y1="332" x2="140" y2="344" stroke={C.brown} strokeWidth="1.2" />
            <line x1={bx} y1="332" x2={bx} y2="344" stroke={C.brown} strokeWidth="1.2" />
            <text x={(140 + bx) / 2} y="355" fontSize="11" fontWeight="700" fill={C.brown} textAnchor="middle">
              {status.dM.toFixed(1).replace(".", ",")} m
            </text>
            {/* buurpand */}
            <rect
              x={bx}
              y={BELEM.buurTopY}
              width={BELEM.buurW}
              height={320 - BELEM.buurTopY}
              fill={status.belemmerend ? C.redLight : C.beigeMid}
              stroke={status.belemmerend ? C.red : C.brownText}
              strokeWidth="2.5"
            />
            <text x={bx + BELEM.buurW / 2} y={BELEM.buurTopY + 28} fontSize="10" fontWeight="700" textAnchor="middle" fill={status.belemmerend ? C.red : C.brown}>
              {status.belemmerend ? "belemmerend" : "buurpand"}
            </text>
          </svg>
          <FreeDrag
            areaRef={areaRef}
            pos={{ x: pos.x, y: 250 }}
            setPos={(p) => setPos({ x: p.x, y: 0 })}
            clamp={(p) => ({ x: Math.max(200, Math.min(640, p.x)), y: p.y })}
            onRelease={handleRelease}
          >
            <div
              className="rounded-xl border-2 px-3 py-2 text-[11px] font-bold shadow-md select-none"
              style={{ backgroundColor: C.olive, color: "white", borderColor: C.oliveDark, width: 86, textAlign: "center" }}
            >
              ⇔ versleep
            </div>
          </FreeDrag>
        </div>
      </div>
      <div className="rounded-xl border-2 px-4 py-2 mb-2 max-w-xl w-full text-center text-sm font-bold" style={{ backgroundColor: C.bgCard, borderColor: verdict.kleur, color: verdict.kleur }}>
        {verdict.tekst}
      </div>
      <HintBar text={hint} />
    </>
  );
}

// Deel B — perceelgrens, bovenaanzicht volgens figuur 10. Schaal 40 px/m.
const GRENS_X = 330;

const GRENS_OPDRACHTEN = [
  {
    text: "Plaats de geveldoorvoer van woning A (links) op een toegestane plek — buiten het verboden gebied.",
    check: (x) => x < GRENS_X && GRENS_X - x >= 40,
    hint: "Langszij de gevel moet de uitmonding ten minste 1 m van de perceelgrens blijven. Het rode vlak is verboden gebied.",
  },
  {
    text: "Plaats nu een geveldoorvoer voor woning B (rechts) — ook buiten het verboden gebied.",
    check: (x) => x > GRENS_X && x - GRENS_X >= 40,
    hint: "Zelfde regel voor de buren: ten minste 1 m langszij vanaf de perceelgrens.",
  },
];

function M1R3B({ onDone, addScore, badDrop }) {
  const areaRef = useRef(null);
  const [pos, setPosState] = useState({ x: 150, y: 200 });
  const posRef = useRef(pos);
  const setPos = (p) => {
    posRef.current = p;
    setPosState(p);
  };
  const [opdracht, setOpdracht] = useState(0);
  const [hint, setHint] = useState(null);
  const [markers, setMarkers] = useState([]);

  const afstandM = Math.abs(pos.x - GRENS_X) / 40;

  const handleRelease = (point) => {
    const o = GRENS_OPDRACHTEN[opdracht];
    if (!o) return;
    if (o.check(posRef.current.x)) {
      addScore(5, point);
      playSound("drop");
      setHint(null);
      setMarkers((m) => [...m, posRef.current.x]);
      if (opdracht + 1 >= GRENS_OPDRACHTEN.length) {
        onDone();
      } else {
        setOpdracht(opdracht + 1);
        setPos({ x: 480, y: 200 });
      }
    } else {
      badDrop(point);
      setHint(o.hint);
    }
  };

  return (
    <>
      <OpdrachtKaart nr={opdracht + 1} totaal={2} text={GRENS_OPDRACHTEN[opdracht]?.text ?? ""} />
      <div className="overflow-x-auto max-w-full my-3">
        <div ref={areaRef} className="relative" style={{ width: 700, height: 340 }}>
          <svg width={700} height={340} viewBox="0 0 700 340" className="absolute inset-0">
            <text x="350" y="24" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">
              Bovenaanzicht (figuur 10 NPR) — twee woningen met gedeelde perceelgrens
            </text>
            {/* woningen */}
            <rect x="60" y="64" width="270" height="136" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2.5" />
            <rect x="330" y="64" width="270" height="136" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2.5" />
            <text x="195" y="140" fontSize="13" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">woning A</text>
            <text x="465" y="140" fontSize="13" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">woning B</text>
            {/* gevellijn */}
            <line x1="60" y1="200" x2="600" y2="200" stroke={C.brownText} strokeWidth="3" />
            <text x="64" y="218" fontSize="10" fontWeight="600" fill={C.brown}>gevel</text>
            {/* verboden gebied: 1 m langszij × 2 m loodrecht */}
            <rect x={GRENS_X - 40} y="200" width="80" height="80" fill="rgba(192,57,43,0.22)" stroke={C.red} strokeWidth="1.5" strokeDasharray="5,4" />
            <text x={GRENS_X} y="246" fontSize="10" fontWeight="700" fill={C.red} textAnchor="middle">verboden</text>
            <text x={GRENS_X} y="258" fontSize="10" fontWeight="700" fill={C.red} textAnchor="middle">gebied</text>
            {/* perceelgrens */}
            <line x1={GRENS_X} y1="40" x2={GRENS_X} y2="330" stroke={C.brownText} strokeWidth="2" strokeDasharray="10,6" />
            <text x={GRENS_X + 6} y="52" fontSize="10" fontWeight="700" fill={C.brownText}>perceelgrens</text>
            {/* maatlijnen 1 m langszij */}
            <line x1={GRENS_X - 40} y1="292" x2={GRENS_X} y2="292" stroke={C.red} strokeWidth="1.2" />
            <text x={GRENS_X - 20} y="306" fontSize="10" fontWeight="700" fill={C.red} textAnchor="middle">1 m</text>
            <line x1={GRENS_X} y1="292" x2={GRENS_X + 40} y2="292" stroke={C.red} strokeWidth="1.2" />
            <text x={GRENS_X + 20} y="306" fontSize="10" fontWeight="700" fill={C.red} textAnchor="middle">1 m</text>
            {/* maatlijn 2 m loodrecht */}
            <line x1={GRENS_X + 52} y1="200" x2={GRENS_X + 52} y2="280" stroke={C.red} strokeWidth="1.2" />
            <text x={GRENS_X + 60} y="244" fontSize="10" fontWeight="700" fill={C.red}>2 m</text>
            {/* straat */}
            <text x="350" y="330" fontSize="10" fontWeight="600" fontStyle="italic" fill={C.brown} textAnchor="middle">straatzijde</text>
            {/* geplaatste doorvoeren */}
            {markers.map((mx, i) => (
              <g key={i}>
                <rect x={mx - 7} y={193} width="14" height="14" fill={C.green} stroke={C.brownText} strokeWidth="1.5" />
                <line x1={mx} y1={207} x2={mx} y2={224} stroke={C.green} strokeWidth="2.5" markerEnd="" />
                <polygon points={`${mx - 4},222 ${mx + 4},222 ${mx},230`} fill={C.green} />
              </g>
            ))}
            {/* live afstandsmaat */}
            <text x={pos.x} y="178" fontSize="11" fontWeight="700" fill={afstandM >= 1 ? C.green : C.red} textAnchor="middle">
              {afstandM.toFixed(1).replace(".", ",")} m
            </text>
          </svg>
          <FreeDrag
            areaRef={areaRef}
            pos={{ x: pos.x, y: 200 }}
            setPos={(p) => setPos({ x: p.x, y: 200 })}
            clamp={(p) => ({ x: Math.max(80, Math.min(580, p.x)), y: 200 })}
            onRelease={handleRelease}
          >
            <div
              className="rounded-full border-2 shadow-md flex items-center justify-center select-none"
              style={{ width: 30, height: 30, backgroundColor: C.olive, borderColor: C.oliveDark }}
            >
              <Wind className="w-4 h-4 text-white" />
            </div>
          </FreeDrag>
        </div>
      </div>
      <HintBar text={hint} />
    </>
  );
}

function M1R3({ onComplete, addScore, badDrop }) {
  const [deel, setDeel] = useState("A");
  const [popup, setPopup] = useState(null);

  return (
    <div className="flex-1 flex flex-col items-center p-5">
      <StepBanner step={1} />
      <h2 className="text-xl font-bold italic mb-1" style={{ color: C.brownText }}>
        Ronde 3: Belendende bebouwing en perceelgrens
      </h2>
      <p className="text-sm mb-3 max-w-xl text-center font-medium" style={{ color: C.brown }}>
        {deel === "A"
          ? "Deel A — Versleep het buurpand en zie wanneer het belemmerend wordt (figuur 3 uit de NPR)."
          : "Deel B — Plaats de geveldoorvoer op een toegestane afstand van de perceelgrens (figuur 10 uit de NPR)."}
      </p>

      {deel === "A" ? (
        <M1R3A
          addScore={addScore}
          badDrop={badDrop}
          onDone={() =>
            setPopup({
              type: "correct",
              text: "Goed gezien! Niet belemmerend: vrij uitmonden. Belemmerend op ≥ 15 m: alleen met stabiliserende kap. Belemmerend op < 15 m: geen natuurlijke afvoer.",
              next: () => {
                setPopup(null);
                setDeel("B");
              },
            })
          }
        />
      ) : (
        <M1R3B
          addScore={addScore}
          badDrop={badDrop}
          onDone={() =>
            setPopup({
              type: "correct",
              text: "Klopt! Langszij minimaal 1 m van de perceelgrens, loodrecht gemeten minimaal 2 m. Alleen uitmondingen in het dak zijn vrijgesteld van deze eis.",
              next: () => {
                setPopup(null);
                onComplete();
              },
            })
          }
        />
      )}

      {popup && <FeedbackPopup type={popup.type} text={popup.text} onClose={popup.next} buttonText="Verder" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MISSIE 2 — RONDE 1: Welke modelsituatie is het? (bijlage A)
// ─────────────────────────────────────────────────────────────────────────────

const SIT_INFO = {
  1: { c1: 163, c2: 325, oms: "Toevoer in de gevel, afvoer in een hoger gelegen dakvlak" },
  3: { c1: 500, c2: 0, oms: "Toevoer in de gevel, afvoer hoger in dezelfde gevel" },
  4: { c1: 500, c2: -325, oms: "Toevoer in de gevel, afvoer lager in dezelfde gevel" },
  5: { c1: 80, c2: 80, oms: "Toevoer en afvoer in hetzelfde dakvlak (helling < 23°)" },
};

// Ankerpunten op de gebouwschets (620×380)
const ANKERS = [
  { id: "d1", x: 220, y: 104, type: "dak" },
  { id: "d2", x: 350, y: 104, type: "dak" },
  { id: "g1", x: 432, y: 170, type: "gevel" },
  { id: "g2", x: 432, y: 240, type: "gevel" },
  { id: "g3", x: 432, y: 300, type: "gevel" },
];

function bepaalSituatie(aAnker, tAnker) {
  const a = ANKERS.find((k) => k.id === aAnker);
  const t = ANKERS.find((k) => k.id === tAnker);
  if (!a || !t) return null;
  if (a.type === "dak" && t.type === "dak") return 5;
  if (t.type === "gevel" && a.type === "dak") return 1;
  if (t.type === "dak" && a.type === "gevel") return 13; // komt in deze missie niet voor
  return a.y <= t.y ? 3 : 4; // beide in de gevel: hoger (of gelijk) = 3, lager = 4
}

const SIT_OPDRACHTEN = [
  { sit: 1, hint: "Situatie 1 = toevoer (T) in de gevel, afvoer (A) in het hoger gelegen dakvlak." },
  { sit: 3, hint: "Situatie 3 = T in de gevel, A hóger in dezelfde gevel." },
  { sit: 4, hint: "Situatie 4 = T in de gevel, A láger in dezelfde gevel." },
  { sit: 5, hint: "Situatie 5 = toevoer én afvoer in hetzelfde dakvlak." },
];

function LetterChip({ letter }) {
  const isA = letter === "A";
  return (
    <div
      className="rounded-xl border-2 shadow-md flex flex-col items-center justify-center select-none px-3 py-1.5"
      style={{
        backgroundColor: isA ? C.red : "#2E86C1",
        borderColor: isA ? "#A93226" : "#21618C",
      }}
    >
      <span className="text-white font-bold text-base leading-none">{letter}</span>
      <span className="text-white text-[8px] font-bold uppercase">{isA ? "afvoer" : "toevoer"}</span>
    </div>
  );
}

function M2R1({ onComplete, addScore, badDrop }) {
  const [plaatsing, setPlaatsing] = useState({ A: null, T: null });
  const [opdracht, setOpdracht] = useState(0);
  const [hint, setHint] = useState(null);
  const [popup, setPopup] = useState(null);
  const evaluatieRef = useRef(null);

  const sit = plaatsing.A && plaatsing.T ? bepaalSituatie(plaatsing.A, plaatsing.T) : null;
  const info = sit ? SIT_INFO[sit] : null;

  const handleDrop = (ankerId, letter, point) => {
    if (plaatsing[letter === "A" ? "T" : "A"] === ankerId) {
      badDrop(point);
      setHint("Daar staat het andere element al — kies een ander punt.");
      return "wrong";
    }
    playSound("drop");
    setPlaatsing((prev) => ({ ...prev, [letter]: ankerId }));
    setHint(null);
    return "correct";
  };

  // beide geplaatst → na korte pauze toetsen aan de opdracht
  useEffect(() => {
    if (!plaatsing.A || !plaatsing.T) return;
    clearTimeout(evaluatieRef.current);
    evaluatieRef.current = setTimeout(() => {
      const doel = SIT_OPDRACHTEN[opdracht];
      if (!doel) return;
      const huidige = bepaalSituatie(plaatsing.A, plaatsing.T);
      if (huidige === doel.sit) {
        addScore(5);
        if (opdracht + 1 >= SIT_OPDRACHTEN.length) {
          setPopup({
            type: "correct",
            text: "Alle vier de modelsituaties herkend! Onthoud: gevel-gevel = 500 (3 of 4), gevel-dak = 163/325 (1), zelfde dakvlak = 80/80 (5).",
            next: onComplete,
          });
        } else {
          setOpdracht((o) => o + 1);
          setPlaatsing({ A: null, T: null });
          setHint(null);
        }
      } else {
        badDrop();
        setHint(
          huidige === 13
            ? "T op het dak met A in de gevel is situatie 13 — die komt hier niet voor. " + doel.hint
            : `Dit is situatie ${huidige}. ${doel.hint} Versleep A of T om het aan te passen.`
        );
      }
    }, 600);
    return () => clearTimeout(evaluatieRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plaatsing]);

  const chipBij = (ankerId) => (plaatsing.A === ankerId ? "A" : plaatsing.T === ankerId ? "T" : null);

  return (
    <div className="flex-1 flex flex-col items-center p-5">
      <StepBanner step={1} />
      <h2 className="text-xl font-bold italic mb-1" style={{ color: C.brownText }}>
        Ronde 1: Welke modelsituatie is het?
      </h2>
      <p className="text-sm mb-3 max-w-xl text-center font-medium" style={{ color: C.brown }}>
        Plaats de afvoer (A) en de toevoer (T) op het gebouw. Het paspoort toont welke modelsituatie uit bijlage A ontstaat.
      </p>

      <OpdrachtKaart nr={opdracht + 1} totaal={4} text={`Plaats A en T zó dat dit modelsituatie ${SIT_OPDRACHTEN[opdracht]?.sit} wordt.`} />

      <div className="flex flex-wrap gap-4 justify-center items-start mt-3">
        <div className="overflow-x-auto max-w-full">
          <div className="relative" style={{ width: 480, height: 380 }}>
            <svg width={480} height={380} viewBox="0 0 480 380" className="absolute inset-0">
              {/* maaiveld */}
              <line x1="10" y1="340" x2="470" y2="340" stroke={C.brownText} strokeWidth="2.5" />
              {/* gebouw: plat dak (< 23°) + gevel rechts */}
              <rect x="100" y="120" width="320" height="220" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2.5" />
              <line x1="100" y1="120" x2="420" y2="120" stroke={C.brownText} strokeWidth="3" />
              <text x="255" y="112" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">D — dakvlak (&lt; 23°)</text>
              <text x="452" y="235" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle" transform="rotate(90 452 235)">G — gevel</text>
              {/* deur + ramen decoratief */}
              <rect x="150" y="180" width="40" height="44" fill="#CFE2EE" stroke={C.brownText} strokeWidth="1.5" />
              <rect x="230" y="180" width="40" height="44" fill="#CFE2EE" stroke={C.brownText} strokeWidth="1.5" />
              <rect x="150" y="260" width="40" height="44" fill="#CFE2EE" stroke={C.brownText} strokeWidth="1.5" />
              <rect x="230" y="260" width="40" height="44" fill="#CFE2EE" stroke={C.brownText} strokeWidth="1.5" />
              {/* Δh-as aanduiding */}
              <text x="30" y="230" fontSize="10" fontWeight="700" fill={C.brown} transform="rotate(-90 30 230)">Δh = hoogteverschil</text>
            </svg>
            {ANKERS.map((k) => {
              // ankers t.o.v. dit 480-brede canvas: gevel-ankers op x=420
              const ax = k.type === "gevel" ? 420 : k.x - 60;
              const bezet = chipBij(k.id);
              return (
                <DropTarget
                  key={k.id}
                  id={`anker-${k.id}`}
                  onDropItem={(payload, point) => handleDrop(k.id, payload, point)}
                  className="absolute"
                  style={{ left: ax - 26, top: k.y - 26, width: 52, height: 52 }}
                  render={({ isHover, flash }) => (
                    <div
                      className="w-full h-full rounded-full border-2 flex items-center justify-center transition-all"
                      style={{
                        borderStyle: bezet ? "solid" : "dashed",
                        borderColor: bezet ? C.green : flash === "wrong" ? C.red : isHover ? C.olive : C.brown,
                        backgroundColor: bezet ? "rgba(232,245,227,0.95)" : isHover ? "rgba(237,240,224,0.95)" : "rgba(255,252,245,0.8)",
                      }}
                    >
                      {bezet ? (
                        <Draggable payload={bezet}>
                          <LetterChip letter={bezet} />
                        </Draggable>
                      ) : (
                        <span className="text-[9px] font-bold" style={{ color: C.brown }}>
                          {k.type === "dak" ? "dak" : "gevel"}
                        </span>
                      )}
                    </div>
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* modelsituatie-paspoort */}
        <div className="rounded-2xl border-2 p-4 w-56" style={{ backgroundColor: C.bgCard, borderColor: C.brownText }}>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.olive }}>
            Modelsituatie-paspoort
          </div>
          {sit && sit !== 13 && info ? (
            <>
              <div className="text-3xl font-bold italic mb-1" style={{ color: C.brownText }}>
                Situatie {sit}
              </div>
              <div className="text-xs italic mb-3" style={{ color: C.brown }}>
                {info.oms}
              </div>
              <div className="flex gap-2">
                <div className="flex-1 rounded-xl border px-2 py-1.5 text-center" style={{ borderColor: C.beigeMid }}>
                  <div className="text-[9px] font-bold" style={{ color: C.brown }}>C₁</div>
                  <div className="text-lg font-bold" style={{ color: C.brownText }}>{info.c1}</div>
                </div>
                <div className="flex-1 rounded-xl border px-2 py-1.5 text-center" style={{ borderColor: C.beigeMid }}>
                  <div className="text-[9px] font-bold" style={{ color: C.brown }}>C₂</div>
                  <div className="text-lg font-bold" style={{ color: info.c2 < 0 ? C.red : C.brownText }}>{info.c2}</div>
                </div>
              </div>
            </>
          ) : sit === 13 ? (
            <div className="text-xs italic" style={{ color: C.red }}>
              T op het dak en A in de gevel = situatie 13 — die behandelen we hier niet.
            </div>
          ) : (
            <div className="text-xs italic" style={{ color: C.brown }}>
              Plaats A én T om de situatie te bepalen…
            </div>
          )}
        </div>
      </div>

      <div className="mt-3">
        <HintBar text={hint} />
      </div>

      <div className="flex gap-4 flex-wrap justify-center mt-3 items-center">
        {!plaatsing.A && (
          <Draggable payload="A">
            <LetterChip letter="A" />
          </Draggable>
        )}
        {!plaatsing.T && (
          <Draggable payload="T">
            <LetterChip letter="T" />
          </Draggable>
        )}
        {(!plaatsing.A || !plaatsing.T) && (
          <span className="text-xs font-bold" style={{ color: C.brown }}>
            ← sleep naar een stippelcirkel op het gebouw
          </span>
        )}
      </div>

      {popup && <FeedbackPopup type={popup.type} text={popup.text} onClose={popup.next} buttonText="Naar de controlevraag" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MISSIE 2 — RONDE 2: Verdunningsfactor — voldoet het? (verkeerslicht)
// ─────────────────────────────────────────────────────────────────────────────

const VF_SCENES = [
  {
    type: "gevel",
    B: 36,
    opdracht: "Plaats de uitmonding (A) zó dat de verdunningsfactor voldoet bij 36 kW.",
  },
  {
    type: "gevel",
    B: 60,
    opdracht: "Zwaardere ketel: zorg dat f ook voldoet bij 60 kW.",
  },
  {
    type: "dak",
    B: 25,
    opdracht: "Nieuwe situatie: toevoer en afvoer in hetzelfde dakvlak (situatie 5). Zorg dat f voldoet bij 25 kW.",
  },
  {
    type: "geveldak",
    B: 15,
    opdracht: "Gashaard van 15 kW: de afvoer zit op het dak, het rooster bovenin de gevel (situatie 1). Zorg dat f voldoet.",
  },
];

// Berekening per scènetype. Schaal: 30 px/m.
function berekenF(scene, pos) {
  const S = 30;
  if (scene.type === "gevel") {
    const T = { x: 280, y: 320 };
    const dx = (pos.x - T.x) / S;
    const dy = (T.y - pos.y) / S; // positief = A hoger dan T
    const l = Math.hypot(dx, dy);
    const sit = dy >= 0 ? 3 : 4;
    const c1 = 500;
    const c2 = sit === 3 ? 0 : -325;
    const noemer = c1 * l * l + c2 * dy * dy;
    return { f: noemer > 0 ? scene.B / noemer : Infinity, sit, c1, c2, l, dh: Math.abs(dy) };
  }
  if (scene.type === "dak") {
    const T = { x: 120, y: 191 }; // aanzuigopening 0,3 m boven dak
    const A = { x: pos.x, y: 155 }; // uitmonding 1,5 m boven dak
    const dx = (A.x - T.x) / S;
    const dh = (T.y - A.y) / S; // 1,2 m
    const l = Math.hypot(dx, dh);
    const noemer = 80 * l * l + 80 * dh * dh;
    return { f: scene.B / noemer, sit: 5, c1: 80, c2: 80, l, dh };
  }
  // geveldak — situatie 1
  const T = { x: 404, y: 180 };
  const A = { x: pos.x, y: 155 };
  const dx = (T.x - A.x) / S;
  const dh = (T.y - A.y) / S;
  const l = Math.hypot(dx, dh);
  const noemer = 163 * l * l + 325 * dh * dh;
  return { f: scene.B / noemer, sit: 1, c1: 163, c2: 325, l, dh };
}

function fFormat(f) {
  if (!isFinite(f)) return "∞";
  if (f < 0.0001) return "< 0,0001";
  return f.toFixed(4).replace(".", ",");
}

// roze 'verboden zone' — raster van cellen waar f ≥ 0,01
function VerbodenZone({ scene, domein }) {
  const cellen = [];
  const stap = 16;
  for (let x = domein.x0; x < domein.x1; x += stap) {
    for (let y = domein.y0; y < domein.y1; y += stap) {
      const r = berekenF(scene, { x: x + stap / 2, y: y + stap / 2 });
      if (r.f >= 0.01) cellen.push({ x, y });
    }
  }
  return (
    <g>
      {cellen.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={stap} height={stap} fill="rgba(232,67,147,0.13)" />
      ))}
    </g>
  );
}

function Verkeerslicht({ ok, f }) {
  return (
    <div className="rounded-2xl border-2 p-4 w-44 flex flex-col items-center gap-2" style={{ backgroundColor: C.bgCard, borderColor: C.brownText }}>
      <div className="rounded-xl border-2 p-2 flex flex-col gap-2" style={{ backgroundColor: "#2b2b2b", borderColor: C.brownText }}>
        <div
          className="w-12 h-12 rounded-full border-2 transition-all duration-200"
          style={{
            backgroundColor: ok ? "#3a3a3a" : "#E74C3C",
            borderColor: "#1d1d1d",
            boxShadow: ok ? "none" : "0 0 18px rgba(231,76,60,0.8)",
          }}
        />
        <div
          className="w-12 h-12 rounded-full border-2 transition-all duration-200"
          style={{
            backgroundColor: ok ? "#2ECC71" : "#3a3a3a",
            borderColor: "#1d1d1d",
            boxShadow: ok ? "0 0 18px rgba(46,204,113,0.8)" : "none",
          }}
        />
      </div>
      <div className="text-center">
        <div className="text-[10px] font-bold uppercase" style={{ color: C.brown }}>verdunningsfactor</div>
        <div className="text-lg font-bold" style={{ color: ok ? C.green : C.red }}>f = {fFormat(f)}</div>
        <div className="text-[10px] font-bold" style={{ color: C.brown }}>eis: f &lt; 0,01</div>
      </div>
    </div>
  );
}

function M2R2({ onComplete, addScore, badDrop }) {
  const areaRef = useRef(null);
  const [sceneIdx, setSceneIdx] = useState(0);
  const [pos, setPosState] = useState({ x: 180, y: 140 });
  const posRef = useRef(pos);
  const setPos = (p) => {
    posRef.current = p;
    setPosState(p);
  };
  const [hint, setHint] = useState(null);
  const [popup, setPopup] = useState(null);

  const scene = VF_SCENES[sceneIdx];
  const res = berekenF(scene, pos);
  const ok = res.f < 0.01;

  const domein =
    scene.type === "gevel"
      ? { x0: 145, x1: 415, y0: 65, y1: 310 }
      : scene.type === "dak"
      ? { x0: 150, x1: 484, y0: 147, y1: 163 }
      : { x0: 96, x1: 384, y0: 147, y1: 163 };

  const clamp = (p) => {
    if (scene.type === "gevel") return { x: Math.max(150, Math.min(410, p.x)), y: Math.max(70, Math.min(305, p.y)) };
    if (scene.type === "dak") return { x: Math.max(155, Math.min(480, p.x)), y: 155 };
    return { x: Math.max(100, Math.min(380, p.x)), y: 155 };
  };

  const startPos = (idx) => {
    const s = VF_SCENES[idx];
    if (s.type === "gevel") return { x: 200, y: 130 };
    if (s.type === "dak") return { x: 200, y: 155 };
    return { x: 160, y: 155 };
  };

  const handleRelease = (point) => {
    const actueel = berekenF(scene, posRef.current);
    if (actueel.f < 0.01) {
      addScore(5, point);
      playSound("drop");
      setHint(null);
      if (sceneIdx + 1 >= VF_SCENES.length) {
        setPopup({
          type: "correct",
          text: "Sterk! Je hebt in vier situaties de uitmonding veilig gepositioneerd. De formule f = B / (C₁·l² + C₂·Δh²) doet het rekenwerk — afstand en hoogteverschil bepalen de verdunning.",
          next: onComplete,
        });
      } else {
        setSceneIdx((i) => i + 1);
        setPos(startPos(sceneIdx + 1));
      }
    } else {
      badDrop(point);
      setHint(
        scene.type === "gevel"
          ? actueel.sit === 4
            ? "Te dicht bij het rooster — verschuif de uitmonding verder weg, of plaats hem hóger dan het rooster (dan telt het hoogteverschil niet meer negatief)."
            : "Te dicht bij het rooster — vergroot de afstand."
          : scene.type === "dak"
          ? "Te dicht bij de aanzuigopening — schuif de uitmonding verder over het dak."
          : "Te dicht bij de dakrand met het rooster — schuif de uitmonding verder het dak op."
      );
    }
  };

  const sceneW = 560;
  const sceneH = scene.type === "gevel" ? 400 : scene.type === "dak" ? 310 : 380;

  return (
    <div className="flex-1 flex flex-col items-center p-5">
      <StepBanner step={1} />
      <h2 className="text-xl font-bold italic mb-1" style={{ color: C.brownText }}>
        Ronde 2: Verdunningsfactor — voldoet het?
      </h2>
      <p className="text-sm mb-3 max-w-xl text-center font-medium" style={{ color: C.brown }}>
        Versleep de uitmonding (A). Het verkeerslicht laat zien of de afstand tot het rooster voldoende is. Alleen het loslaten telt!
      </p>

      <OpdrachtKaart nr={sceneIdx + 1} totaal={4} text={scene.opdracht} />

      <div className="flex flex-wrap gap-4 justify-center items-start mt-3">
        <div className="overflow-x-auto max-w-full">
          <div ref={areaRef} className="relative" style={{ width: sceneW, height: sceneH }}>
            <svg width={sceneW} height={sceneH} viewBox={`0 0 ${sceneW} ${sceneH}`} className="absolute inset-0">
              {scene.type === "gevel" && (
                <>
                  <line x1="20" y1="370" x2="540" y2="370" stroke={C.brownText} strokeWidth="2.5" />
                  <rect x="130" y="50" width="300" height="320" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2.5" />
                  <text x="285" y="42" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">
                    gevel-aanzicht — situatie {res.sit} (C₁ = {res.c1}, C₂ = {res.c2})
                  </text>
                  <VerbodenZone scene={scene} domein={domein} />
                  {/* ventilatierooster T */}
                  <g>
                    <rect x="262" y="308" width="36" height="24" fill="#2E86C1" stroke={C.brownText} strokeWidth="2" rx="3" />
                    {[314, 320, 326].map((y) => (
                      <line key={y} x1="266" y1={y} x2="294" y2={y} stroke="white" strokeWidth="2" />
                    ))}
                    <text x="280" y="350" fontSize="11" fontWeight="700" fill="#2E86C1" textAnchor="middle">T — ventilatierooster</text>
                  </g>
                  {/* maatlijn A–T */}
                  <line x1="280" y1="320" x2={pos.x} y2={pos.y} stroke={C.brown} strokeWidth="1.5" strokeDasharray="5,4" />
                  <text x={(280 + pos.x) / 2 + 8} y={(320 + pos.y) / 2} fontSize="10" fontWeight="700" fill={C.brown}>
                    l = {res.l.toFixed(1).replace(".", ",")} m
                  </text>
                </>
              )}
              {scene.type === "dak" && (
                <>
                  <line x1="20" y1="290" x2="540" y2="290" stroke={C.brownText} strokeWidth="2.5" />
                  <rect x="60" y="200" width="440" height="90" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2.5" />
                  <text x="280" y="40" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">
                    plat dak — situatie 5 (C₁ = 80, C₂ = 80)
                  </text>
                  <VerbodenZone scene={scene} domein={{ x0: 150, x1: 484, y0: 150, y1: 162 }} />
                  {/* aanzuigopening T (0,3 m boven dak) */}
                  <rect x="112" y="191" width="16" height="9" fill="#2E86C1" stroke={C.brownText} strokeWidth="2" />
                  <text x="120" y="225" fontSize="11" fontWeight="700" fill="#2E86C1" textAnchor="middle">T</text>
                  <text x="120" y="238" fontSize="9" fontWeight="600" fill={C.brown} textAnchor="middle">aanzuig (0,3 m)</text>
                  {/* maatlijn */}
                  <line x1="120" y1="191" x2={pos.x} y2="160" stroke={C.brown} strokeWidth="1.5" strokeDasharray="5,4" />
                  <text x={(120 + pos.x) / 2} y="178" fontSize="10" fontWeight="700" fill={C.brown}>
                    l = {res.l.toFixed(1).replace(".", ",")} m
                  </text>
                </>
              )}
              {scene.type === "geveldak" && (
                <>
                  <line x1="20" y1="360" x2="540" y2="360" stroke={C.brownText} strokeWidth="2.5" />
                  <rect x="80" y="170" width="320" height="190" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2.5" />
                  <text x="240" y="40" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">
                    afvoer op het dak, rooster bovenin de gevel — situatie 1 (C₁ = 163, C₂ = 325)
                  </text>
                  <VerbodenZone scene={scene} domein={{ x0: 96, x1: 384, y0: 150, y1: 162 }} />
                  {/* rooster T bovenin de gevel */}
                  <rect x="396" y="174" width="22" height="14" fill="#2E86C1" stroke={C.brownText} strokeWidth="2" rx="2" />
                  <text x="430" y="186" fontSize="11" fontWeight="700" fill="#2E86C1">T</text>
                  {/* maatlijn */}
                  <line x1="404" y1="180" x2={pos.x} y2="160" stroke={C.brown} strokeWidth="1.5" strokeDasharray="5,4" />
                  <text x={(404 + pos.x) / 2} y="150" fontSize="10" fontWeight="700" fill={C.brown}>
                    l = {res.l.toFixed(1).replace(".", ",")} m
                  </text>
                </>
              )}
            </svg>
            <FreeDrag areaRef={areaRef} pos={pos} setPos={setPos} clamp={clamp} onRelease={handleRelease}>
              <div className="flex flex-col items-center select-none">
                <div
                  className="rounded-lg border-2 shadow-md px-2 py-1 text-xs font-bold"
                  style={{ backgroundColor: ok ? C.green : C.red, color: "white", borderColor: C.brownText }}
                >
                  A
                </div>
                {scene.type !== "gevel" && <div className="w-1.5 h-4" style={{ backgroundColor: C.brownText }} />}
              </div>
            </FreeDrag>
          </div>
        </div>

        <div className="flex flex-col gap-3 items-center">
          <Verkeerslicht ok={ok} f={res.f} />
          <div className="rounded-xl border-2 px-3 py-2 w-44 text-center" style={{ backgroundColor: C.bgCard, borderColor: C.beigeMid }}>
            <div className="text-[10px] font-bold" style={{ color: C.brown }}>belasting</div>
            <div className="text-xl font-bold" style={{ color: C.brownText }}>B = {scene.B} kW</div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <HintBar text={hint} />
      </div>

      {popup && <FeedbackPopup type={popup.type} text={popup.text} onClose={popup.next} buttonText="Naar de controlevraag" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MISSIE 2 — RONDE 3: Combitoestel-belasting (50%-regel) + RGA/LTV-combinaties
// ─────────────────────────────────────────────────────────────────────────────

const COMBIS = [
  {
    cv: 24,
    tap: 32,
    correct: "24 kW",
    opties: ["24 kW", "32 kW", "16 kW"],
    reden: "CV (24 kW) > 50% van tap (16 kW) — reken met 24 kW.",
  },
  {
    cv: 12,
    tap: 36,
    correct: "18 kW",
    opties: ["12 kW", "36 kW", "18 kW"],
    reden: "50% van tap (18 kW) > CV (12 kW) — reken met 18 kW.",
  },
  {
    cv: 30,
    tap: 24,
    correct: "30 kW",
    opties: ["30 kW", "12 kW", "24 kW"],
    reden: "CV (30 kW) > 50% van tap (12 kW) — reken met 30 kW.",
  },
];

const RGA_LTV = [
  { code: "B11", rga: "Bovendaks, natuurlijke trek", ltv: "Via de opstellingsruimte" },
  { code: "B22 / B23", rga: "Bovendaks of gevel, met ventilator", ltv: "Via de opstellingsruimte (zelfde drukvlak)" },
  { code: "C42", rga: "Gemeenschappelijk CLV-kanaal", ltv: "Gemeenschappelijk CLV-kanaal" },
  { code: "C82", rga: "Gemeenschappelijk half-CLV-kanaal", ltv: "Individueel via de gevel" },
];

function M2R3({ onComplete, addScore, badDrop }) {
  const [deel, setDeel] = useState("A");
  const [combiIdx, setCombiIdx] = useState(0);
  const [hint, setHint] = useState(null);
  const [reden, setReden] = useState(null);
  const [combiKlaar, setCombiKlaar] = useState(false);
  const [matches, setMatches] = useState({});
  const [popup, setPopup] = useState(null);

  const combi = COMBIS[combiIdx];

  const handleCombiDrop = (payload, point) => {
    if (!combi || combiKlaar) return undefined;
    if (payload === combi.correct) {
      addScore(5, point);
      playSound("drop");
      setHint(null);
      setReden(combi.reden);
      setCombiKlaar(true);
      setTimeout(() => {
        setCombiKlaar(false);
        setReden(null);
        if (combiIdx + 1 >= COMBIS.length) {
          setPopup({
            type: "correct",
            text: "De 50%-regel zit erin: reken met het maximum van de CV-belasting óf 50% van de tapbelasting. Nu de afvoercombinaties!",
            next: () => {
              setPopup(null);
              setDeel("B");
            },
          });
        } else {
          setCombiIdx((i) => i + 1);
        }
      }, 1600);
      return "correct";
    }
    badDrop(point);
    setHint("Denk aan de 50%-regel: reken met het maximum van de CV-belasting óf 50% van de tapbelasting.");
    return "wrong";
  };

  const handleMatchDrop = (kaartCode, payload, point) => {
    if (matches[kaartCode]) return undefined;
    if (payload === kaartCode) {
      addScore(5, point);
      playSound("drop");
      setHint(null);
      const nieuw = { ...matches, [kaartCode]: payload };
      setMatches(nieuw);
      if (Object.keys(nieuw).length === RGA_LTV.length) {
        setTimeout(
          () =>
            setPopup({
              type: "correct",
              text: "Alle combinaties goed! B11 = natuurlijke trek via het dak, B22/B23 = met ventilator, C42 = volledig CLV, C82 = half-CLV met eigen luchttoevoer via de gevel.",
              next: onComplete,
            }),
          500
        );
      }
      return "correct";
    }
    badDrop(point);
    const hints = {
      B11: "B11 is een open toestel op natuurlijke trek — geen ventilator, geen gevel.",
      "B22 / B23": "B22/B23 hebben een ventilator en halen lucht uit de opstellingsruimte.",
      C42: "Bij C42 zijn afvoer én toevoer gemeenschappelijk (volledig CLV).",
      C82: "C82 = half-CLV: alleen de afvoer is gemeenschappelijk.",
    };
    setHint(hints[payload] ?? "Kijk goed naar de combinatie van afvoer en toevoer.");
    return "wrong";
  };

  return (
    <div className="flex-1 flex flex-col items-center p-5">
      <StepBanner step={1} />
      <h2 className="text-xl font-bold italic mb-1" style={{ color: C.brownText }}>
        Ronde 3: Combitoestellen en RGA/LTV-combinaties
      </h2>

      {deel === "A" && combi && (
        <>
          <p className="text-sm mb-3 max-w-xl text-center font-medium" style={{ color: C.brown }}>
            Deel A — Met welke belasting reken je in de verdunningsformule? Sleep de juiste rekenwaarde naar de rekenkaart.
          </p>
          <OpdrachtKaart nr={combiIdx + 1} totaal={3} text="Kies de juiste rekenwaarde voor dit combitoestel." />

          <div className="flex flex-wrap gap-5 justify-center items-stretch my-4">
            {/* combitoestel */}
            <div className="rounded-2xl border-2 p-4 w-52 flex flex-col items-center gap-2" style={{ backgroundColor: C.bgCard, borderColor: C.brownText }}>
              <svg width="70" height="80" viewBox="0 0 70 80">
                <rect x="8" y="6" width="54" height="62" rx="6" fill="white" stroke={C.brownText} strokeWidth="2.5" />
                <circle cx="35" cy="30" r="13" fill="none" stroke={C.olive} strokeWidth="2.5" />
                <path d="M 35 22 Q 39 28 35 33 Q 31 28 35 22" fill={C.red} />
                <rect x="18" y="50" width="34" height="9" rx="2" fill={C.beigeMid} stroke={C.brownText} strokeWidth="1.5" />
                <line x1="26" y1="68" x2="26" y2="78" stroke={C.brownText} strokeWidth="2.5" />
                <line x1="44" y1="68" x2="44" y2="78" stroke={C.brownText} strokeWidth="2.5" />
              </svg>
              <div className="text-sm font-bold italic" style={{ color: C.brownText }}>Combitoestel {combiIdx + 1}</div>
              <div className="rounded-lg px-3 py-1.5 text-xs font-bold border" style={{ backgroundColor: C.beigeLight, borderColor: C.beigeMid, color: C.brownText }}>
                CV: {combi.cv} kW &nbsp;|&nbsp; Tap: {combi.tap} kW
              </div>
            </div>

            {/* rekenkaart (dropzone) */}
            <DropTarget
              id="rekenkaart"
              onDropItem={handleCombiDrop}
              render={({ isHover, flash }) => (
                <div
                  className="rounded-2xl border-2 p-4 w-52 flex flex-col items-center justify-center gap-2 transition-all"
                  style={{
                    borderStyle: combiKlaar ? "solid" : "dashed",
                    borderColor: combiKlaar ? C.green : flash === "wrong" ? C.red : isHover ? C.olive : C.brown,
                    backgroundColor: combiKlaar ? C.greenLight : flash === "wrong" ? C.redLight : isHover ? C.oliveLight : C.bgCard,
                  }}
                >
                  <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.olive }}>Rekenkaart</div>
                  <div className="text-sm font-bold italic text-center" style={{ color: C.brownText }}>
                    B voor de verdunningsformule:
                  </div>
                  <div className="text-2xl font-bold" style={{ color: combiKlaar ? C.green : C.beigeMid }}>
                    {combiKlaar ? combi.correct : "?"}
                  </div>
                </div>
              )}
            />
          </div>

          {reden && (
            <div className="rounded-xl border-2 px-4 py-2.5 max-w-xl w-full text-sm font-medium italic mb-2" style={{ backgroundColor: C.greenLight, borderColor: C.green, color: C.brownText }}>
              {reden}
            </div>
          )}
          <HintBar text={hint} />

          <div className="flex gap-3 flex-wrap justify-center mt-3">
            {!combiKlaar &&
              combi.opties.map((o) => (
                <Draggable key={o} payload={o}>
                  <DragCard label={o} />
                </Draggable>
              ))}
          </div>
        </>
      )}

      {deel === "B" && (
        <>
          <p className="text-sm mb-3 max-w-xl text-center font-medium" style={{ color: C.brown }}>
            Deel B — Sleep elke toestelcodering naar de juiste combinatie van rookgasafvoer (RGA) en luchttoevoer (LTV).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full my-3">
            {RGA_LTV.map((k) => (
              <DropTarget
                key={k.code}
                id={`match-${k.code}`}
                onDropItem={(payload, point) => handleMatchDrop(k.code, payload, point)}
                render={({ isHover, flash }) => (
                  <div
                    className="rounded-2xl border-2 p-3 h-full transition-all"
                    style={{
                      borderStyle: matches[k.code] ? "solid" : "dashed",
                      borderColor: matches[k.code] ? C.green : flash === "wrong" ? C.red : isHover ? C.olive : C.brown,
                      backgroundColor: matches[k.code] ? C.greenLight : flash === "wrong" ? C.redLight : isHover ? C.oliveLight : C.bgCard,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.olive }}>
                        combinatie
                      </span>
                      {matches[k.code] ? (
                        <span className="flex items-center gap-1 text-sm font-bold" style={{ color: C.green }}>
                          <CheckCircle className="w-4 h-4" /> {matches[k.code]}
                        </span>
                      ) : (
                        <span className="text-sm font-bold" style={{ color: C.beigeMid }}>?</span>
                      )}
                    </div>
                    <div className="text-xs font-medium" style={{ color: C.brownText }}>
                      <span className="font-bold">RGA:</span> {k.rga}
                    </div>
                    <div className="text-xs font-medium" style={{ color: C.brownText }}>
                      <span className="font-bold">LTV:</span> {k.ltv}
                    </div>
                  </div>
                )}
              />
            ))}
          </div>

          <HintBar text={hint} />

          <div className="flex gap-3 flex-wrap justify-center mt-3">
            {RGA_LTV.filter((k) => !matches[k.code]).map((k) => (
              <Draggable key={k.code} payload={k.code}>
                <DragCard label={k.code} />
              </Draggable>
            ))}
          </div>
        </>
      )}

      {popup && <FeedbackPopup type={popup.type} text={popup.text} onClose={popup.next} buttonText="Verder" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHERMEN: start, tussenscherm, game over
// ─────────────────────────────────────────────────────────────────────────────

function StartScreen({ onStart }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="py-3 px-5 text-center" style={{ backgroundColor: C.bgHeader }}>
        <span className="text-white font-bold italic text-lg">Uitmondingen &amp; Verdunningsafstand</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
        <div className="rounded-full p-7 border-4" style={{ backgroundColor: C.beigeLight, borderColor: C.brownText }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <line x1="6" y1="72" x2="74" y2="72" stroke={C.brownText} strokeWidth="3" />
            <rect x="22" y="44" width="36" height="28" fill={C.beigeMid} stroke={C.brownText} strokeWidth="3" />
            <polygon points="18,44 40,24 62,44" fill={C.olive} stroke={C.brownText} strokeWidth="3" />
            <rect x="36" y="8" width="8" height="18" fill={C.beigeMid} stroke={C.brownText} strokeWidth="2.5" />
            <path d="M 48 10 q 6 -4 12 0" fill="none" stroke={C.brown} strokeWidth="2" strokeLinecap="round" />
            <path d="M 50 4 q 6 -4 12 0" fill="none" stroke={C.brown} strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold italic text-center" style={{ color: C.brownText }}>
          Uitmondingen &amp; Verdunningsafstand
        </h1>
        <p className="max-w-md text-center font-medium" style={{ color: C.brown }}>
          Waar mag het rookgas naar buiten — en hoe ver moet dat van een ventilatierooster? Twee missies, zes rondes. (Leerdoel 15, NPR 3378-60)
        </p>
        <GameButton onClick={onStart}>Start de game</GameButton>
      </div>
    </div>
  );
}

function Tussenscherm({ scoreM1, onNext }) {
  const M1_MAX = 120;
  const pct = (scoreM1 / M1_MAX) * 100;
  const stars = pct >= 80 ? 3 : pct >= 60 ? 2 : 1;
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <h2 className="text-2xl font-bold italic" style={{ color: C.brownText }}>
        Missie 1 voltooid!
      </h2>
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <Star
            key={s}
            className={`w-12 h-12 transition-all duration-500 ${s <= stars ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
          />
        ))}
      </div>
      <div className="text-lg font-bold italic" style={{ color: C.brownText }}>
        Tussenstand: {scoreM1} punten
      </div>
      <div className="border-2 rounded-2xl p-6 max-w-lg" style={{ backgroundColor: C.bgCard, borderColor: C.brownText }}>
        <p className="text-sm text-center leading-relaxed" style={{ color: C.brownText }}>
          Je weet nu <strong>wáár</strong> de uitmonding mag. In missie 2 leer je hoe ver de uitmonding van een
          ventilatieopening moet zitten zodat de buren schone lucht krijgen.
        </p>
      </div>
      <GameButton onClick={onNext}>
        Door naar Missie 2
        <ArrowRight className="w-4 h-4" />
      </GameButton>
    </div>
  );
}

function GameOverScreen({ onRestart }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((h) => (
          <Heart key={h} className="w-8 h-8" fill="transparent" stroke="#B8A990" />
        ))}
      </div>
      <h2 className="text-2xl font-bold italic" style={{ color: C.red }}>
        Helaas, je levens zijn op…
      </h2>
      <div className="border-2 rounded-2xl p-6 max-w-lg" style={{ backgroundColor: C.bgCard, borderColor: C.brownText }}>
        <p className="text-sm text-center leading-relaxed" style={{ color: C.brownText }}>
          Geen probleem — van fouten leer je het meest. Bekijk de figuren nog eens goed en probeer het opnieuw!
        </p>
      </div>
      <GameButton onClick={onRestart} variant="danger">
        <RotateCcw className="w-4 h-4" />
        Probeer opnieuw
      </GameButton>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOFDCOMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const MAX_SCORE = 225;

const SCREEN_FLOW = {
  start: "m1intro",
  m1intro: "m1r1",
  m1r1: "m1r1mc",
  m1r1mc: "m1r2",
  m1r2: "m1r2mc",
  m1r2mc: "m1r3",
  m1r3: "m1r3mc",
  m1r3mc: "tussen",
  tussen: "m2intro",
  m2intro: "m2r1",
  m2r1: "m2r1mc",
  m2r1mc: "m2r2",
  m2r2: "m2r2mc",
  m2r2mc: "m2r3",
  m2r3: "m2r3mc",
  m2r3mc: "end",
};

export default function UitmondingGame({ initialScreen = "start" }) {
  const [screen, setScreen] = useState(initialScreen);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const livesRef = useRef(5);
  const juice = useGameJuice();

  const addScore = useCallback(
    (pts, point) => {
      setScore((prev) => Math.max(0, prev + pts));
      juice.triggerCorrect(pts, point);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [juice.triggerCorrect]
  );

  // foute sleepactie: -5 punten, geen leven kwijt
  const badDrop = useCallback(
    (point) => {
      setScore((prev) => Math.max(0, prev - 5));
      juice.triggerWrong(-5, point);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [juice.triggerWrong]
  );

  // fout MC-antwoord: -1 leven; bij 0 levens direct game over
  // (gatekeeper: zo is missie 2 ook nooit bereikbaar zonder levens)
  const loseLife = useCallback(() => {
    livesRef.current = Math.max(0, livesRef.current - 1);
    setLives(livesRef.current);
    juice.triggerWrong();
    if (livesRef.current === 0) setScreen("gameover");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [juice.triggerWrong]);

  const next = useCallback(() => {
    setScreen((prev) => SCREEN_FLOW[prev] ?? "end");
    juice.triggerLevelUp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [juice.triggerLevelUp]);

  const resetGame = () => {
    setScreen("start");
    setScore(0);
    livesRef.current = 5;
    setLives(5);
  };

  const missionRound = {
    m1r1: [1, 1], m1r1mc: [1, 1],
    m1r2: [1, 2], m1r2mc: [1, 2],
    m1r3: [1, 3], m1r3mc: [1, 3],
    m2r1: [2, 1], m2r1mc: [2, 1],
    m2r2: [2, 2], m2r2mc: [2, 2],
    m2r3: [2, 3], m2r3mc: [2, 3],
  }[screen] ?? [1, 0];

  const showProgress = !["start", "end", "gameover", "m1intro", "m2intro", "tussen"].includes(screen);

  const mcProps = { addScore, loseLife };

  return (
    <DragProvider>
      <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ backgroundColor: C.bgPage }}>
        <juice.JuiceOverlay />
        <div
          className="max-w-[800px] w-full mx-auto flex flex-col min-h-screen shadow-lg overflow-x-hidden"
          style={{
            backgroundColor: C.bgPage,
            animation: juice.shaking ? "shake 0.3s ease-in-out" : "none",
          }}
        >
          {showProgress && <ProgressBar currentMission={missionRound[0]} currentRound={missionRound[1]} score={score} lives={lives} />}

          {screen === "start" && <StartScreen onStart={next} />}

          {screen === "m1intro" && (
            <IntroScreen
              title="Missie 1: De juiste plek"
              buttonText="Aan de slag"
              onNext={next}
              text="De uitmonding is het punt waar het rookgas naar buiten komt. Een verkeerde plek betekent: slechte werking van het toestel, gevaar voor de bewoner, of hinder voor de buren. In deze missie leer je wáár de uitmonding wel en niet mag zitten."
            />
          )}

          {screen === "m1r1" && <M1R1 onComplete={next} addScore={addScore} badDrop={badDrop} />}
          {screen === "m1r1mc" && (
            <div className="flex-1 flex flex-col items-center p-5">
              <StepBanner step={2} />
              <MCControle pool={POOL_M1R1} onComplete={next} {...mcProps} />
            </div>
          )}

          {screen === "m1r2" && <M1R2 onComplete={next} addScore={addScore} badDrop={badDrop} />}
          {screen === "m1r2mc" && (
            <div className="flex-1 flex flex-col items-center p-5">
              <StepBanner step={2} />
              <MCControle pool={POOL_M1R2} onComplete={next} {...mcProps} />
            </div>
          )}

          {screen === "m1r3" && <M1R3 onComplete={next} addScore={addScore} badDrop={badDrop} />}
          {screen === "m1r3mc" && (
            <div className="flex-1 flex flex-col items-center p-5">
              <StepBanner step={2} />
              <MCControle pool={POOL_M1R3} onComplete={next} nextLabel="Naar het tussenscherm" {...mcProps} />
            </div>
          )}

          {/* op het tussenscherm is de totaalscore exact de missie 1-score */}
          {screen === "tussen" && <Tussenscherm scoreM1={score} onNext={next} />}

          {screen === "m2intro" && (
            <IntroScreen
              title="Missie 2: Verdunningsfactor en RGA/LTV"
              buttonText="Aan de slag"
              onNext={next}
              text="De uitmonding zit op een goede plek — maar zit hij ook ver genoeg van een ventilatierooster? Als rookgas wordt meegezogen als verse lucht is dat gevaarlijk. Met de verdunningsfactor controleer je of de afstand voldoende is."
            />
          )}

          {screen === "m2r1" && <M2R1 onComplete={next} addScore={addScore} badDrop={badDrop} />}
          {screen === "m2r1mc" && (
            <div className="flex-1 flex flex-col items-center p-5">
              <StepBanner step={2} />
              <MCControle pool={POOL_M2R1} onComplete={next} {...mcProps} />
            </div>
          )}

          {screen === "m2r2" && <M2R2 onComplete={next} addScore={addScore} badDrop={badDrop} />}
          {screen === "m2r2mc" && (
            <div className="flex-1 flex flex-col items-center p-5">
              <StepBanner step={2} />
              <MCControle pool={POOL_M2R2} onComplete={next} {...mcProps} />
            </div>
          )}

          {screen === "m2r3" && <M2R3 onComplete={next} addScore={addScore} badDrop={badDrop} />}
          {screen === "m2r3mc" && (
            <div className="flex-1 flex flex-col items-center p-5">
              <StepBanner step={2} />
              <MCControle pool={POOL_M2R3} onComplete={next} lastRound {...mcProps} />
            </div>
          )}

          {screen === "end" && (
            <EndScreen
              score={score}
              maxScore={MAX_SCORE}
              lives={lives}
              onRestart={resetGame}
              text="Je kunt nu een uitmonding op een veilige plek positioneren en controleren of de verdunningsafstand voldoet! Gebied I en II zijn vrij, B11 is kritisch, en met f = B / (C₁·l² + C₂·Δh²) toets je of het rookgas voldoende verdunt voordat het een rooster bereikt."
            />
          )}

          {screen === "gameover" && <GameOverScreen onRestart={resetGame} />}

          <div className="py-2 text-center text-[10px]" style={{ color: C.brown }}>
            Studium B.V. — Vakmanschap CO · Leerdoel 15 · NPR 3378-60:2022
          </div>
        </div>
      </div>
    </DragProvider>
  );
}
