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
// VRAGENPOOLS — per ronde 3 vragen; de game kiest er willekeurig een en
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
    hint: "De vrije gebieden hebben 0 Pa — gebied III dus niet. Onthoud ook: de kustwaarde is altijd hoger dan de binnenlandwaarde.",
    bron: "NPR 3378-60:2022, § 5.1.2 (drukwaarden onder figuur 2)",
    afbeelding: <AfbGebiedenKlein />,
  },
  {
    question: "Welke uitmondingsgebieden gelden als 'vrije' gebieden (overdruk 0 Pa)?",
    options: ["Gebied I en gebied II", "Alleen gebied I", "Gebied I, II en III", "Gebied I en gebied V"],
    correct: 0,
    feedbackCorrect:
      "Juist! Gebieden I en II zijn vrij van overdruk. In gebied II is wel een stabiliserende kap nodig bij belendende bebouwing op > 15 m.",
    feedbackWrong: "Gebied I (0 Pa) en gebied II (0 Pa) zijn de vrije uitmondingsgebieden. Vanaf gebied III geldt overdruk.",
    hint: "'Vrij' betekent: geen overdruk (0 Pa). Het zijn precies de gebieden waar een B11 op natuurlijke trek mag uitmonden.",
    bron: "NPR 3378-60:2022, § 5.1.2 en § 5.2.1",
    afbeelding: <AfbGebiedenKlein />,
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
    hint: "Hoe verder van de nok, hoe groter de vereiste uitmondingshoogte wordt. Is de uitmonding daar dan nog automatisch 'vrij'?",
    bron: "NPR 3378-60:2022, § 5.2.3 (formule 1, figuur 4)",
    afbeelding: <AfbSchuinDakVer />,
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
    hint: "Uitmonding en luchttoevoer moeten in dezelfde drukzone blijven — wat betekent dat voor de plek van de toevoeropening?",
    bron: "NPR 3378-60:2022, § 5.3.1",
    afbeelding: <AfbDakvlakA />,
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
    hint: "Gebied II bestaat alleen dankzij belendende bebouwing op voldoende afstand. Wat gebeurt er met de gebieden als die bebouwing dichterbij staat?",
    bron: "NPR 3378-60:2022, § 5.1.3 (belendende bebouwing) en § 5.2.1",
    afbeelding: <AfbBelemmering />,
  },
  {
    question: "Welk type toestel mag in principe in elk uitmondingsgebied uitmonden, mits de fabrikant dat toestaat?",
    options: ["Type C (gesloten toestel)", "Type B11", "Alle types onder dezelfde voorwaarden", "Type A"],
    correct: 0,
    feedbackCorrect:
      "Correct! Type C mag in elk gebied, omdat de uitmonding en luchttoevoer zijn ontworpen om drukverschillen te kunnen overwinnen. De installatie-instructie van de fabrikant is leidend.",
    feedbackWrong:
      "Type C-toestellen zijn gesloten en kunnen drukverschillen overwinnen — mits de fabrikant dat toestaat. Type B11 mag alleen in gebied I/II.",
    hint: "Welk toesteltype is gesloten en kan drukverschillen op de uitmonding zelf overwinnen?",
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
    hint: "Er gelden twee maten: loodrecht en langszij. De loodrechte maat is de grootste van de twee.",
    bron: "NPR 3378-60:2022, § 8.2 (Bbl-eisen perceelgrens)",
    afbeelding: <AfbPerceelgrens />,
  },
  {
    question: "Welke regels gelden voor een uitmonding van een type C-toestel in een gevel?",
    options: [
      "Minimaal 0,5 m van een dakrand of gevelrand en minimaal 2 m loodrecht van de perceelgrens",
      "De uitmonding moet altijd bovendaks zijn",
      "De uitmonding mag niet in een gevel met ramen zitten",
      "De uitmonding moet minimaal 5 m van elke buitenruimte",
    ],
    correct: 0,
    feedbackCorrect:
      "Juist! Voor type C in de gevel gelden: ten minste 0,5 m van een dakrand/gevelrand/dakoverstek, en loodrecht ten minste 2 m van de perceelgrens.",
    feedbackWrong:
      "Type C in de gevel: 0,5 m van dakrand/gevelrand en 2 m loodrecht van de perceelgrens. Bovendaks is geen vereiste — dat is juist een van de voordelen van type C.",
    hint: "Denk aan twee eisen tegelijk: een afstand tot de dak-/gevelrand en een afstand tot de perceelgrens. Bovendaks hoeft type C juist niet.",
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
    hint: "De wind trekt zich niets aan van eigendomsgrenzen. Wat telt er voor de bepaling van het uitmondingsgebied?",
    bron: "NPR 3378-60:2022, § 5.1.1 LET OP-kader (wind en belendende bebouwing) en § 5.2.3",
    afbeelding: <AfbDakdoorvoerBuren />,
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
    hint: "Gevel-gevel-situaties hebben de hoogste C₁. Kijk daarna wat er met het hoogteverschil gebeurt als de afvoer al hoger ligt dan de toevoer.",
    bron: "NPR 3378-60:2022, § 9.2 tabel 2 en bijlage A.2 (situatie 3)",
    afbeelding: <AfbSituatie3 />,
  },
  {
    question: "Welke modelsituatie geldt wanneer zowel de uitmonding als de ventilatieopening in hetzelfde dakvlak liggen?",
    options: ["Situatie 5", "Situatie 1", "Situatie 3", "Situatie 4"],
    correct: 0,
    feedbackCorrect: "Correct! Bij toevoer en afvoer in hetzelfde dakvlak hoort situatie 5, met C₁ = C₂ = 80.",
    feedbackWrong: "Toevoer en afvoer in hetzelfde dakvlak = situatie 5. De waarden 500/0 horen bij situaties met gevel-gevel.",
    hint: "Beide openingen in een dakvlak met helling < 23° — het paspoort uit de sleepronde toonde hier C₁ = C₂ = 80.",
    bron: "NPR 3378-60:2022, § 9.2 tabel 2 en bijlage A.2 (situatie 5)",
    afbeelding: <AfbZelfdeDakvlak />,
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
    hint: "C₂ wordt negatief als het hoogteverschil tegen de verdunning werkt. Ligt de afvoer dan boven of juist onder de toevoer?",
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
    hint: "Reken het na: situatie 3, dus f = B / (500 × l²) — het hoogteverschil telt niet mee. Vergelijk je uitkomst met de eis van 0,01.",
    bron: "NPR 3378-60:2022, § 9.3 voorbeeld 1 (uitgewerkt rekenvoorbeeld)",
    afbeelding: <AfbVoorbeeld1 />,
  },
  {
    question: "Wat is de maximale toegestane verdunningsfactor f voor uitmondingen van gasgestookte toestellen?",
    options: ["0,01", "0,1", "0,001", "1,0"],
    correct: 0,
    feedbackCorrect: "Juist! De eis is f ≤ 0,01. Dat komt overeen met ongeveer 1.000 ppm CO₂ in de toevoerlucht.",
    feedbackWrong:
      "De eis is f ≤ 0,01. Dat komt overeen met circa 0,1% CO₂ (1.000 ppm) in de toevoerlucht. Buitenlucht zelf zit op circa 400 ppm.",
    hint: "De eis is voor alle gasgestookte toestellen gelijk en ligt tussen de uiterste antwoordopties in.",
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
    hint: "Kijk waar de afstand l in de formule staat: boven of onder de deelstreep?",
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
    feedbackCorrect: "Correct! Bij combi tot 40 kW geldt: rekenen met het maximum van de CV-belasting of 50% van de tap-belasting.",
    feedbackWrong: "De 50%-regel: rekenen met het maximum van CV-belasting of 50% van de tapbelasting. Niet optellen — het maximum van de twee.",
    hint: "Niet optellen! Je vergelijkt twee waarden met elkaar en rekent met een ervan.",
    bron: "NPR 3378-60:2022, § 9.2 (Berekening met 50% van de tapbelasting)",
  },
  {
    question: "Welke combinatie van rookgasafvoer en luchttoevoer hoort bij een C82 toestel?",
    options: [
      "Gemeenschappelijke rookgasafvoer en individuele luchttoevoer via de gevel",
      "Bovendakse rookgasafvoer met natuurlijke trek en luchttoevoer via opstellingsruimte",
      "Gemeenschappelijke rookgasafvoer en gemeenschappelijke luchttoevoer",
      "Concentrische individuele rookgasafvoer en luchttoevoer",
    ],
    correct: 0,
    feedbackCorrect: "Klopt! C82 = half-CLV: gemeenschappelijk afvoerkanaal, maar elk toestel haalt eigen lucht via de gevel.",
    feedbackWrong:
      "C82 hoort bij half-CLV: rookgasafvoer gemeenschappelijk, luchttoevoer individueel via de gevel. C42 = volledig CLV (beide gemeenschappelijk).",
    hint: "Half-CLV betekent: een van de twee (rookgasafvoer of luchttoevoer) is gemeenschappelijk. Welke van de twee is dat?",
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
    hint: "Denk aan welk document bij elk toestel hoort — en wie dat document opstelt.",
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

// Uitlegkaart voor een ronde — de "briefing": leg uit wat de begrippen zijn
// (de besturing), zodat de ronde zelf de puzzel is die je met die kennis oplost.
function RondeUitleg({ titel, regels, figuur, onStart }) {
  return (
    <div className="flex-1 flex flex-col items-center p-5">
      <StepBanner step={0} />
      <h2 className="text-xl font-bold italic mb-3 text-center" style={{ color: C.brownText }}>
        {titel}
      </h2>
      <div
        className="border-2 rounded-2xl p-5 max-w-xl w-full flex flex-col gap-3"
        style={{ backgroundColor: C.bgCard, borderColor: C.brownText }}
      >
        <div className="flex flex-col gap-2.5">
          {regels.map((r, i) => (
            <p key={i} className="text-sm leading-relaxed" style={{ color: C.brownText }}>
              {r}
            </p>
          ))}
        </div>
        {figuur && (
          <div className="flex justify-center overflow-x-auto rounded-xl border p-2 mt-1" style={{ borderColor: C.beigeMid, backgroundColor: "#FFFEFB" }}>
            {figuur}
          </div>
        )}
      </div>
      <div className="mt-5">
        <GameButton onClick={onStart} variant="green">
          Aan de slag
          <ArrowRight className="w-4 h-4" />
        </GameButton>
      </div>
    </div>
  );
}

// Toont eerst de uitlegkaart, daarna de ronde zelf. De ronde-component wordt
// pas gemount na 'Aan de slag', zodat zijn interne state vers begint.
function RondeMetUitleg({ titel, regels, figuur, children }) {
  const [gestart, setGestart] = useState(false);
  if (!gestart) return <RondeUitleg titel={titel} regels={regels} figuur={figuur} onStart={() => setGestart(true)} />;
  return children;
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

// ─── NPR-figuurstijl: kleuren, arcering en bouwstenen voor de scènes ───

// Een kleur per uitmondingsgebied (groen = vrij, warm = overdruk)
const ZONE_KLEUR = {
  I: "#4A7C3F",   // groen — vrij gebied (0 Pa)
  II: "#2E86C1",  // blauw — vrij, met stabiliserende kap (0 Pa)
  III: "#E67E22", // oranje — 25/40 Pa
  IV: "#C0392B",  // rood — 37/60 Pa (hoogste overdruk)
  V: "#8E44AD",   // paars — 12/20 Pa
};

// Diagonale arcering in gebiedskleur, zoals de arcering in de NPR-figuren
function ZonePatroon({ id, kleur }) {
  return (
    <pattern id={id} width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <rect width="7" height="7" fill={kleur} opacity="0.10" />
      <line x1="0" y1="0" x2="0" y2="7" stroke={kleur} strokeWidth="1.4" opacity="0.5" />
    </pattern>
  );
}

// Maaiveldlijn met grondarcering (schuine streepjes), zoals in figuur 1
function Grond({ x1, x2, y }) {
  const ticks = [];
  for (let x = x1 + 10; x < x2; x += 14) ticks.push(x);
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={C.brownText} strokeWidth="2.5" />
      {ticks.map((x) => (
        <line key={x} x1={x} y1={y} x2={x - 7} y2={y + 7} stroke={C.brownText} strokeWidth="1" opacity="0.7" />
      ))}
    </g>
  );
}

// Raamgroep smal-breed-smal met diagonale kruisjes, zoals de gevels in figuur 1
function GevelRamen({ x, y }) {
  return (
    <g fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.5">
      <rect x={x} y={y} width="13" height="42" />
      <line x1={x} y1={y} x2={x + 13} y2={y + 42} strokeWidth="1" />
      <line x1={x + 13} y1={y} x2={x} y2={y + 42} strokeWidth="1" />
      <rect x={x + 18} y={y} width="38" height="42" />
      <rect x={x + 22} y={y + 4} width="30" height="34" fill="none" strokeWidth="1" />
      <rect x={x + 61} y={y} width="13" height="42" />
      <line x1={x + 61} y1={y} x2={x + 74} y2={y + 42} strokeWidth="1" />
      <line x1={x + 74} y1={y} x2={x + 61} y2={y + 42} strokeWidth="1" />
    </g>
  );
}

// Liggend raam (rechtsboven in de gevel van figuur 1)
function LiggendRaam({ x, y, w = 64, h = 22 }) {
  return (
    <g fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.5">
      <rect x={x} y={y} width={w} height={h} />
      <line x1={x} y1={y} x2={x + w} y2={y + h} strokeWidth="1" />
    </g>
  );
}

// Deur met klink
function Deur({ x, y, h = 70 }) {
  return (
    <g>
      <rect x={x} y={y} width="46" height={h} fill="#FFFFFF" stroke={C.brownText} strokeWidth="2" />
      <rect x={x + 5} y={y + 5} width="36" height={h - 10} fill="none" stroke={C.brownText} strokeWidth="1" />
      <circle cx={x + 38} cy={y + h / 2} r="2.5" fill={C.brownText} />
      <line x1={x + 33} y1={y + h / 2 + 8} x2={x + 41} y2={y + h / 2 + 8} stroke={C.brownText} strokeWidth="1.2" />
    </g>
  );
}

// Uitmondingspijp met pijl omhoog en rookpluim, zoals in de NPR-figuren
function PijpMetRook({ cx, top, voetY, w = 14, rook = true }) {
  return (
    <g>
      <rect x={cx - w / 2} y={top} width={w} height={voetY - top} fill="#FFFFFF" stroke={C.brownText} strokeWidth="2" />
      <line x1={cx - w / 2 - 3} y1={top} x2={cx + w / 2 + 3} y2={top} stroke={C.brownText} strokeWidth="2" />
      <line x1={cx} y1={top - 2} x2={cx} y2={top - 18} stroke={C.brownText} strokeWidth="2" />
      <polygon points={`${cx - 4},${top - 16} ${cx + 4},${top - 16} ${cx},${top - 25}`} fill={C.brownText} />
      {rook && (
        <g fill="#C9C9C9" opacity="0.55">
          <ellipse cx={cx + 2} cy={top - 32} rx="9" ry="7" />
          <ellipse cx={cx + 10} cy={top - 44} rx="12" ry="9" />
          <ellipse cx={cx + 4} cy={top - 57} rx="9" ry="7" />
        </g>
      )}
    </g>
  );
}

// ─── MINI-FIGUREN BIJ DE MC-VRAGEN (zelfde NPR-stijl als de scènes) ───

// Compacte figuur 2: vijf gelabelde, gekleurde gebieden (bij vragen over de gebieden)
function AfbGebiedenKlein() {
  const Z = [
    { id: "I", x: 174, y: 22, w: 52, h: 30 },
    { id: "II", x: 110, y: 58, w: 48, h: 28 },
    { id: "III", x: 66, y: 116, w: 50, h: 30 },
    { id: "V", x: 298, y: 52, w: 48, h: 28 },
    { id: "IV", x: 298, y: 116, w: 48, h: 30 },
  ];
  return (
    <svg width="420" height="196" viewBox="0 0 420 196">
      <defs>
        {["I", "II", "III", "IV", "V"].map((z) => (
          <ZonePatroon key={z} id={`mz-${z}`} kleur={ZONE_KLEUR[z]} />
        ))}
      </defs>
      <Grond x1={6} x2={414} y={170} />
      <rect x="10" y="62" width="44" height="108" fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      <rect x="366" y="55" width="48" height="115" fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      <rect x="150" y="120" width="100" height="50" fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      <polygon points="146,120 200,76 254,120" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2" />
      <rect x="196" y="54" width="9" height="24" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.5" />
      {Z.map((z) => (
        <g key={z.id}>
          <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="7" fill={`url(#mz-${z.id})`} stroke={ZONE_KLEUR[z.id]} strokeWidth="1.2" />
          <text x={z.x + z.w / 2} y={z.y + z.h / 2 + 4} fontSize="12" fontWeight="700" fontStyle="italic" fill={C.brownText} textAnchor="middle">
            {z.id}
          </text>
        </g>
      ))}
      <text x="102" y="190" fontSize="9" fontWeight="700" fill={C.brown} textAnchor="middle">≥ 15 m</text>
      <text x="310" y="190" fontSize="9" fontWeight="700" fill={C.brown} textAnchor="middle">&lt; 15 m</text>
    </svg>
  );
}

// Schuin dak ≥ 23° met doorvoer op meer dan 0,8 m van de nok: hoogte = ?
function AfbSchuinDakVer() {
  return (
    <svg width="380" height="190" viewBox="0 0 380 190">
      <Grond x1={20} x2={360} y={168} />
      <rect x="60" y="120" width="260" height="48" fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      <polygon points="52,120 200,40 328,120" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2" />
      {/* doorvoer ver van de nok */}
      <rect x="105" y="50" width="11" height="39" fill="#FFFFFF" stroke={C.brownText} strokeWidth="2" />
      <line x1="110" y1="48" x2="110" y2="36" stroke={C.brownText} strokeWidth="2" />
      <polygon points="106,38 114,38 110,30" fill={C.brownText} />
      {/* hoogtemaat met vraagteken */}
      <line x1="128" y1="50" x2="128" y2="89" stroke={C.red} strokeWidth="1" />
      <polygon points="125,57 131,57 128,51" fill={C.red} />
      <polygon points="125,82 131,82 128,88" fill={C.red} />
      <text x="136" y="73" fontSize="12" fontWeight="700" fontStyle="italic" fill={C.red}>h = ?</text>
      {/* afstand tot de nok */}
      <line x1="110" y1="26" x2="200" y2="26" stroke={C.brownText} strokeWidth="1" />
      <polygon points="113,23 113,29 107,26" fill={C.brownText} />
      <polygon points="197,23 197,29 203,26" fill={C.brownText} />
      <line x1="200" y1="22" x2="200" y2="38" stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
      <text x="155" y="18" fontSize="10" fontWeight="700" fill={C.brownText} textAnchor="middle">meer dan 0,8 m</text>
      {/* hellingshoek */}
      <path d="M 296 120 A 26 26 0 0 0 302 105" fill="none" stroke={C.brownText} strokeWidth="1" />
      <text x="252" y="112" fontSize="10" fontWeight="700" fontStyle="italic" fill={C.brownText}>α ≥ 23°</text>
    </svg>
  );
}

// B23-uitmonding (A) op het dakvlak in gebied III; waar mag de toevoer (T)?
function AfbDakvlakA() {
  return (
    <svg width="380" height="180" viewBox="0 0 380 180">
      <defs>
        <ZonePatroon id="mda-III" kleur={ZONE_KLEUR.III} />
      </defs>
      <Grond x1={20} x2={360} y={160} />
      <rect x="80" y="115" width="220" height="45" fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      <polygon points="72,115 190,45 308,115" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2" />
      {/* gebied III-strook op het rechterdakvlak */}
      <polygon points="206,55 308,115 308,103 206,43" fill="url(#mda-III)" />
      {/* uitmonding A op het dakvlak */}
      <rect x="240" y="68" width="16" height="14" rx="3" fill={C.red} stroke={C.brownText} strokeWidth="1.5" />
      <text x="248" y="78" fontSize="10" fontWeight="700" fill="#FFFFFF" textAnchor="middle">A</text>
      <text x="312" y="100" fontSize="9" fontWeight="700" fill={ZONE_KLEUR.III}>gebied III</text>
      {/* mogelijke T-posities */}
      {[
        { x: 285, y: 100 },
        { x: 130, y: 80 },
        { x: 90, y: 138 },
      ].map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="12" fill="#FFFFFF" stroke="#2E86C1" strokeWidth="1.5" strokeDasharray="4,3" />
          <text x={p.x} y={p.y + 4} fontSize="10" fontWeight="700" fill="#2E86C1" textAnchor="middle">T?</text>
        </g>
      ))}
    </svg>
  );
}

// B11 bovendaks met een belemmerend buurpand: hoe ver staat het?
function AfbBelemmering() {
  return (
    <svg width="380" height="180" viewBox="0 0 380 180">
      <Grond x1={10} x2={370} y={160} />
      {/* eigen woning met B11-uitmonding bovendaks */}
      <rect x="40" y="110" width="90" height="50" fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      <polygon points="34,110 85,70 136,110" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2" />
      <rect x="80" y="46" width="10" height="26" fill="#FFFFFF" stroke={C.brownText} strokeWidth="2" />
      <path d="M 76 46 L 85 36 L 94 46 Z" fill={C.olive} stroke={C.brownText} strokeWidth="1.5" />
      <text x="60" y="38" fontSize="9" fontWeight="700" fill={C.brown} textAnchor="end">B11 + kap</text>
      {/* belemmerend buurpand */}
      <rect x="250" y="40" width="100" height="120" fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      {[56, 86, 116].map((y) =>
        [262, 290, 318].map((x) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="14" height="16" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1" />
        ))
      )}
      <text x="300" y="152" fontSize="9" fontWeight="700" fill={C.brown} textAnchor="middle">belemmerend</text>
      {/* 15°-zichtlijn en afstandsmaat */}
      <line x1="85" y1="46" x2="320" y2="-10" stroke={C.brown} strokeWidth="1" strokeDasharray="5,4" />
      <line x1="136" y1="170" x2="250" y2="170" stroke={C.red} strokeWidth="1" />
      <polygon points="139,167 139,173 133,170" fill={C.red} />
      <polygon points="247,167 247,173 253,170" fill={C.red} />
      <text x="193" y="166" fontSize="11" fontWeight="700" fill={C.red} textAnchor="middle">? m</text>
    </svg>
  );
}

// Figuur 10-mini (bovenaanzicht): uitmonding loodrecht t.o.v. de perceelgrens vóór de gevel
function AfbPerceelgrens() {
  return (
    <svg width="380" height="180" viewBox="0 0 380 180">
      <defs>
        <ZonePatroon id="mpg-rood" kleur={ZONE_KLEUR.IV} />
      </defs>
      <text x="190" y="14" fontSize="9" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">bovenaanzicht</text>
      {/* woning met de gevel naar voren (onderzijde) */}
      <rect x="78" y="26" width="184" height="56" fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      <text x="170" y="58" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">woning A</text>
      {/* gevellijn */}
      <line x1="78" y1="82" x2="262" y2="82" stroke={C.brownText} strokeWidth="3" />
      {/* verboden zone (< 2 m) langs de perceelgrens, vóór de gevel */}
      <rect x="78" y="122" width="184" height="28" fill="url(#mpg-rood)" stroke={ZONE_KLEUR.IV} strokeWidth="1" strokeDasharray="4,3" />
      {/* perceelgrens evenwijdig aan de gevel, ervóór */}
      <line x1="58" y1="150" x2="312" y2="150" stroke={C.brownText} strokeWidth="1.5" strokeDasharray="8,5" />
      <text x="170" y="166" fontSize="9" fontWeight="700" fill={C.brownText} textAnchor="middle">perceelgrens</text>
      {/* uitmonding op de gevel */}
      <rect x="150" y="76" width="13" height="13" rx="2" fill={C.olive} stroke={C.brownText} strokeWidth="1.5" />
      {/* loodrechte maat: haaks van de gevel naar de perceelgrens */}
      <line x1="156" y1="90" x2="156" y2="150" stroke={C.red} strokeWidth="1.3" />
      <polygon points="152,95 160,95 156,88" fill={C.red} />
      <polygon points="152,145 160,145 156,152" fill={C.red} />
      <text x="167" y="124" fontSize="11" fontWeight="700" fill={C.red} textAnchor="start">? m</text>
      <text x="200" y="113" fontSize="9" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="start">loodrecht gemeten</text>
    </svg>
  );
}

// Dakdoorvoer (B11) naast het hogere pannendak van de buren
function AfbDakdoorvoerBuren() {
  return (
    <svg width="380" height="180" viewBox="0 0 380 180">
      <Grond x1={10} x2={370} y={160} />
      {/* eigen woning met plat dak en dakdoorvoer */}
      <rect x="40" y="90" width="130" height="70" fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      <rect x="95" y="58" width="11" height="32" fill="#FFFFFF" stroke={C.brownText} strokeWidth="2" />
      <line x1="100" y1="56" x2="100" y2="44" stroke={C.brownText} strokeWidth="2" />
      <polygon points="96,46 104,46 100,38" fill={C.brownText} />
      <text x="100" y="174" fontSize="9" fontWeight="700" fill={C.brown} textAnchor="middle">eigen woning (B11)</text>
      {/* aangrenzend pannendak van de buren, hoger dan de doorvoer */}
      <rect x="170" y="100" width="160" height="60" fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      <polygon points="164,100 250,30 336,100" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2" />
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1={164 + t * 86} y1={100 - t * 70} x2={336 - t * 86} y2={100 - t * 70} stroke={C.brownText} strokeWidth="0.8" opacity="0.5" />
      ))}
      <text x="250" y="174" fontSize="9" fontWeight="700" fill={C.brown} textAnchor="middle">dak van de buren</text>
      {/* perceelgrens */}
      <line x1="170" y1="20" x2="170" y2="160" stroke={C.brownText} strokeWidth="1.5" strokeDasharray="8,5" />
      <text x="176" y="26" fontSize="9" fontWeight="700" fill={C.brownText}>perceelgrens</text>
    </svg>
  );
}

// Bijlage A, situatie 3: toevoer in de gevel, afvoer hoger in dezelfde gevel
function AfbSituatie3() {
  return (
    <svg width="300" height="190" viewBox="0 0 300 190">
      <Grond x1={20} x2={280} y={170} />
      <rect x="70" y="30" width="150" height="140" fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      <text x="145" y="24" fontSize="10" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">G — gevel (≥ 75°)</text>
      {/* A hoog, T laag op dezelfde gevel */}
      <rect x="212" y="56" width="18" height="16" rx="3" fill={C.red} stroke={C.brownText} strokeWidth="1.5" />
      <text x="221" y="68" fontSize="10" fontWeight="700" fill="#FFFFFF" textAnchor="middle">A</text>
      <rect x="212" y="126" width="18" height="16" rx="3" fill="#2E86C1" stroke={C.brownText} strokeWidth="1.5" />
      <text x="221" y="138" fontSize="10" fontWeight="700" fill="#FFFFFF" textAnchor="middle">T</text>
      {/* Δh-maat */}
      <line x1="236" y1="64" x2="266" y2="64" stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
      <line x1="236" y1="134" x2="266" y2="134" stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
      <line x1="260" y1="64" x2="260" y2="134" stroke={C.brownText} strokeWidth="1" />
      <polygon points="257,71 263,71 260,65" fill={C.brownText} />
      <polygon points="257,127 263,127 260,133" fill={C.brownText} />
      <text x="270" y="103" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brownText}>Δh</text>
    </svg>
  );
}

// Bijlage A, situatie ?: toevoer en afvoer in hetzelfde (platte) dakvlak
function AfbZelfdeDakvlak() {
  return (
    <svg width="340" height="150" viewBox="0 0 340 150">
      <Grond x1={15} x2={325} y={130} />
      <rect x="50" y="70" width="240" height="60" fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      <text x="170" y="62" fontSize="10" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">D — dakvlak (&lt; 23°)</text>
      {/* afvoer A en toevoer T in hetzelfde dakvlak */}
      <rect x="100" y="40" width="11" height="30" fill="#FFFFFF" stroke={C.brownText} strokeWidth="2" />
      <rect x="96" y="24" width="19" height="16" rx="3" fill={C.red} stroke={C.brownText} strokeWidth="1.5" />
      <text x="105.5" y="36" fontSize="10" fontWeight="700" fill="#FFFFFF" textAnchor="middle">A</text>
      <rect x="216" y="58" width="19" height="12" rx="2" fill="#2E86C1" stroke={C.brownText} strokeWidth="1.5" />
      <text x="225" y="54" fontSize="10" fontWeight="700" fill="#2E86C1" textAnchor="middle">T</text>
      <line x1="110" y1="34" x2="222" y2="62" stroke={C.brown} strokeWidth="1.2" strokeDasharray="5,4" />
    </svg>
  );
}

// Voorbeeld 1 uit § 9.3: A op 0,9 m boven het rooster, kortste afstand 1,3 m
function AfbVoorbeeld1() {
  return (
    <svg width="340" height="200" viewBox="0 0 340 200">
      <Grond x1={20} x2={320} y={184} />
      <rect x="70" y="20" width="200" height="164" fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      {/* raam met ventilatierooster bovenin */}
      <rect x="140" y="120" width="60" height="52" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.5" />
      <rect x="150" y="124" width="40" height="14" rx="2" fill="#2E86C1" stroke={C.brownText} strokeWidth="1.5" />
      <text x="208" y="135" fontSize="10" fontWeight="700" fill="#2E86C1">T</text>
      {/* uitmonding A: 0,9 m hoger, kortste afstand 1,3 m */}
      <rect x="132" y="89" width="19" height="16" rx="3" fill={C.red} stroke={C.brownText} strokeWidth="1.5" />
      <text x="141.5" y="101" fontSize="10" fontWeight="700" fill="#FFFFFF" textAnchor="middle">A</text>
      {/* maatlijnen */}
      <line x1="141" y1="107" x2="170" y2="131" stroke={C.brown} strokeWidth="1.2" strokeDasharray="4,3" />
      <text x="166" y="112" fontSize="10" fontWeight="700" fill={C.brown}>l = 1,3 m</text>
      <line x1="128" y1="97" x2="100" y2="97" stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
      <line x1="146" y1="131" x2="100" y2="131" stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
      <line x1="106" y1="97" x2="106" y2="131" stroke={C.brownText} strokeWidth="1" />
      <polygon points="103,103 109,103 106,97" fill={C.brownText} />
      <polygon points="103,125 109,125 106,131" fill={C.brownText} />
      <text x="98" y="118" fontSize="10" fontWeight="700" fontStyle="italic" fill={C.brownText} textAnchor="end">Δh = 0,9 m</text>
      {/* belasting */}
      <rect x="232" y="32" width="86" height="22" rx="6" fill={C.beigeLight} stroke={C.brownText} strokeWidth="1" />
      <text x="275" y="47" fontSize="11" fontWeight="700" fill={C.brownText} textAnchor="middle">B = 36 kW</text>
    </svg>
  );
}

// Scene 1a: plat dak — nagebouwd naar NPR figuur 1a (gebieden I en III)
function ScenePlatDak() {
  const dakY = 150;   // bovenkant plat dak
  const lijnY = 130;  // het 0,5 m-vlak (0,5 m = 20 px)
  const L = 140, R = 450;
  return (
    <svg width={560} height={360} viewBox="0 0 560 360" className="absolute inset-0">
      <defs>
        <ZonePatroon id="pd-I" kleur={ZONE_KLEUR.I} />
        <ZonePatroon id="pd-III" kleur={ZONE_KLEUR.III} />
      </defs>
      {/* gebied I: alles boven het 0,5 m-vlak (groene arcering) */}
      <rect x={L} y={26} width={R - L} height={lijnY - 26} fill="url(#pd-I)" />
      {/* gebied III: de dunne strook tussen dak en 0,5 m-vlak (oranje arcering) */}
      <rect x={L} y={lijnY} width={R - L} height={dakY - lijnY} fill="url(#pd-III)" />
      {/* maaiveld */}
      <Grond x1={60} x2={510} y={320} />
      {/* gevel met ramen en deur, zoals figuur 1a */}
      <rect x="170" y={dakY} width="230" height={320 - dakY} fill={C.bgCard} stroke={C.brownText} strokeWidth="2.5" />
      <GevelRamen x={190} y={172} />
      <LiggendRaam x={318} y={180} />
      <GevelRamen x={190} y={240} />
      <Deur x={324} y={250} h={70} />
      {/* uitmonding met pijl en rookpluim */}
      <PijpMetRook cx={249} top={118} voetY={dakY} />
      {/* het 0,5 m-vlak */}
      <line x1={L} y1={lijnY} x2={R} y2={lijnY} stroke={C.brownText} strokeWidth="1.5" strokeDasharray="7,5" />
      {/* maat 0,5 m rechts, zoals in de figuur */}
      <line x1={428} y1={lijnY - 12} x2={428} y2={dakY + 12} stroke={C.brownText} strokeWidth="1" />
      <polygon points="425,133 431,133 428,127" fill={C.brownText} transform="rotate(180 428 130)" />
      <polygon points="425,147 431,147 428,153" fill={C.brownText} transform="rotate(180 428 150)" />
      <text x="436" y="144" fontSize="10" fontWeight="700" fill={C.brownText}>0,5 m</text>
      {/* leaderlijn naar de III-labelpositie (zoals het NPR-bijschrift) */}
      <line x1={443} y1={141} x2={486} y2={160} stroke={C.brownText} strokeWidth="1" />
      <text x="285" y="344" fontSize="11" fontStyle="italic" fontWeight="600" fill={C.brown} textAnchor="middle">plat dak</text>
    </svg>
  );
}

// Scene 1b: schuin dak α ≥ 23° — nagebouwd naar NPR figuur 1c.
// Twee doorvoeren: een lange schoorsteen op 0,8 m van de nok en een korte in
// de nok (h-min). Gebied I is de 'trechter' boven de nok, gebied III volgt de
// dakvlakken.
function SceneSchuinDak() {
  return (
    <svg width={560} height={420} viewBox="0 0 560 420" className="absolute inset-0">
      <defs>
        <ZonePatroon id="ps-I" kleur={ZONE_KLEUR.I} />
        <ZonePatroon id="ps-III" kleur={ZONE_KLEUR.III} />
      </defs>
      {/* gebied I: trechter boven de nok, begrensd door de hoogtelijnen */}
      <polygon points="40,16 233,102 272,124 522,50 522,16" fill="url(#ps-I)" />
      <line x1="233" y1="102" x2="40" y2="16" stroke={C.brownText} strokeWidth="1" />
      <line x1="272" y1="124" x2="522" y2="50" stroke={C.brownText} strokeWidth="1" />
      {/* gebied III: stroken die de beide dakvlakken volgen */}
      <polygon points="158,252 233,178 233,162 158,236" fill="url(#ps-III)" />
      <polygon points="284,136 422,252 422,236 284,120" fill="url(#ps-III)" />
      {/* maaiveld */}
      <Grond x1={60} x2={510} y={380} />
      {/* gevel met ramen en deur */}
      <rect x="170" y="252" width="240" height="128" fill={C.bgCard} stroke={C.brownText} strokeWidth="2.5" />
      <GevelRamen x={190} y={262} />
      <LiggendRaam x={320} y={268} />
      <GevelRamen x={190} y={322} />
      <Deur x={330} y={310} h={70} />
      {/* schuin dak, nok links van het midden zoals figuur 1c */}
      <polygon points="158,252 272,140 422,252" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2.5" />
      {/* lange schoorsteen op 0,8 m van de nok */}
      <PijpMetRook cx={240} top={96} voetY={172} w={13} />
      {/* korte doorvoer in de nok (zonder rook), met h-min-maat */}
      <PijpMetRook cx={272} top={118} voetY={140} w={12} rook={false} />
      <line x1="280" y1="118" x2="330" y2="118" stroke={C.brownText} strokeWidth="1" />
      <line x1="280" y1="140" x2="330" y2="140" stroke={C.brownText} strokeWidth="1" />
      <line x1="324" y1="118" x2="324" y2="140" stroke={C.brownText} strokeWidth="1" />
      <polygon points="321,122 327,122 324,116" fill={C.brownText} transform="rotate(180 324 119)" />
      <polygon points="321,136 327,136 324,142" fill={C.brownText} transform="rotate(180 324 139)" />
      <text x="332" y="133" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brownText}>
        h<tspan fontSize="7" dy="3">min</tspan>
      </text>
      {/* 0,8 m-maat tussen de twee doorvoeren */}
      <line x1="240" y1="176" x2="240" y2="198" stroke={C.brownText} strokeWidth="1" />
      <line x1="272" y1="144" x2="272" y2="198" stroke={C.brownText} strokeWidth="1" />
      <line x1="240" y1="194" x2="272" y2="194" stroke={C.brownText} strokeWidth="1" />
      <polygon points="244,191 244,197 238,194" fill={C.brownText} />
      <polygon points="268,191 268,197 274,194" fill={C.brownText} />
      <text x="200" y="198" fontSize="10" fontWeight="700" fill={C.brownText}>0,8 m</text>
      {/* hellingshoek α aan de rechterdakvoet */}
      <path d="M 382 252 A 40 40 0 0 0 390 228" fill="none" stroke={C.brownText} strokeWidth="1.2" />
      <line x1="352" y1="252" x2="422" y2="252" stroke={C.brownText} strokeWidth="1" />
      <text x="338" y="244" fontSize="12" fontWeight="700" fontStyle="italic" fill={C.brownText}>α ≥ 23°</text>
      {/* leaderlijn naar de III-labelpositie rechts van de dakvoet */}
      <line x1="424" y1="244" x2="470" y2="298" stroke={C.brownText} strokeWidth="1" />
      <text x="290" y="404" fontSize="11" fontStyle="italic" fontWeight="600" fill={C.brown} textAnchor="middle">schuin dak α ≥ 23°</text>
    </svg>
  );
}

// Scene 1c / R2: figuur 2-composiet — vijf gebieden met belendende bebouwing,
// elk gebied met een eigen kleur-arcering zoals de NPR-figuren
function SceneBelendend({ kapInII }) {
  // dezelfde rects als de dropzones (ZONES2), iets ruimer als gekleurd vlak
  const vlakken = [
    { id: "I", x: 330, y: 88, w: 100, h: 58 },
    { id: "II", x: 232, y: 146, w: 92, h: 56 },
    { id: "III", x: 168, y: 252, w: 108, h: 72 },
    { id: "V", x: 466, y: 112, w: 90, h: 60 },
    { id: "IV", x: 466, y: 232, w: 90, h: 76 },
  ];
  return (
    <svg width={760} height={380} viewBox="0 0 760 380" className="absolute inset-0">
      <defs>
        {["I", "II", "III", "IV", "V"].map((z) => (
          <ZonePatroon key={z} id={`pb-${z}`} kleur={ZONE_KLEUR[z]} />
        ))}
      </defs>
      {/* gekleurde gebiedsvlakken */}
      {vlakken.map((v) => (
        <rect key={v.id} x={v.x - 8} y={v.y - 8} width={v.w + 16} height={v.h + 16} rx="12" fill={`url(#pb-${v.id})`} />
      ))}
      {/* maaiveld */}
      <Grond x1={20} x2={740} y={340} />
      {/* belendend gebouw links (≥ 15 m) met raampjes */}
      <rect x="40" y="130" width="90" height="210" fill={C.bgCard} stroke={C.brownText} strokeWidth="2.5" />
      {[150, 186, 222, 290].map((y) =>
        [52, 78, 104].map((x) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="16" height="18" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1" />
        ))
      )}
      <text x="85" y="262" fontSize="10" fontWeight="700" fill={C.brown} textAnchor="middle">belendende</text>
      <text x="85" y="274" fontSize="10" fontWeight="700" fill={C.brown} textAnchor="middle">bebouwing</text>
      {/* belendend gebouw rechts (< 15 m) met raampjes */}
      <rect x="560" y="120" width="120" height="220" fill={C.bgCard} stroke={C.brownText} strokeWidth="2.5" />
      {[138, 172, 206, 292].map((y) =>
        [572, 600, 628, 656].map((x) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="16" height="18" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1" />
        ))
      )}
      <text x="620" y="252" fontSize="10" fontWeight="700" fill={C.brown} textAnchor="middle">belendende</text>
      <text x="620" y="264" fontSize="10" fontWeight="700" fill={C.brown} textAnchor="middle">bebouwing</text>
      {/* hoofdgebouw met schuin dak ≥ 23°, gevel zoals figuur 1 */}
      <rect x="300" y="240" width="160" height="100" fill={C.bgCard} stroke={C.brownText} strokeWidth="2.5" />
      <GevelRamen x={312} y={252} />
      <Deur x={402} y={278} h={62} />
      <polygon points="292,240 380,160 468,240" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2.5" />
      <path d="M 432 240 A 28 28 0 0 0 438 224" fill="none" stroke={C.brownText} strokeWidth="1.2" />
      <text x="400" y="232" fontSize="10" fontWeight="700" fontStyle="italic" fill={C.brownText}>α ≥ 23°</text>
      {/* uitmonding op de nok met pijl en rook */}
      <PijpMetRook cx={380} top={128} voetY={162} />
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
      uitleg: "Sleep de zone-labels naar de gekleurde gebieden in deze figuur (figuur 1a uit de NPR).",
      sceneW: 560,
      sceneH: 360,
      scene: <ScenePlatDak />,
      drops: [
        { id: "plat-I", rect: { x: 215, y: 44, w: 150, h: 66 }, expected: "Gebied I", tooltip: OVERDRUK.I },
        { id: "plat-III", rect: { x: 450, y: 152, w: 104, h: 44 }, expected: "Gebied III", tooltip: OVERDRUK.III },
      ],
      labels: ["Gebied I", "Gebied III"],
      hints: {
        "Gebied I": "Gebied I is het vrije gebied: alles vanaf 0,5 m boven het platte dak (het grote groene vlak).",
        "Gebied III": "Gebied III is de dunne oranje strook tussen het dakvlak en het 0,5 m-vlak — daar wijst de lijn naartoe.",
      },
    },
    {
      titel: "Schuin dak (α ≥ 23°)",
      uitleg: "Hetzelfde gebouw, maar nu met een schuin dak (figuur 1c). Let op de twee doorvoeren: een op 0,8 m van de nok, een in de nok.",
      sceneW: 560,
      sceneH: 420,
      scene: <SceneSchuinDak />,
      drops: [
        { id: "schuin-I", rect: { x: 418, y: 22, w: 104, h: 46 }, expected: "Gebied I", tooltip: OVERDRUK.I },
        { id: "schuin-III", rect: { x: 440, y: 298, w: 104, h: 44 }, expected: "Gebied III", tooltip: OVERDRUK.III },
      ],
      labels: ["Gebied I", "Gebied III"],
      hints: {
        "Gebied I": "Bij een schuin dak ≥ 23° is gebied I de groene 'trechter' boven de nok — hoe verder van de nok, hoe hoger de schoorsteen moet zijn.",
        "Gebied III": "Gebied III volgt het dakvlak: de oranje strook direct boven het dak — daar wijst de lijn bij de dakvoet naartoe.",
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
              ? "Goed! Vanaf 0,5 m boven het platte dak is het gebied I (vrij). De smalle strook eronder is gebied III."
              : "Goed! Binnen 0,8 m van de nok mag de uitmonding net boven de nok (gebied I). Verder weg moet de schoorsteen veel hoger.",
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
            "Alle vijf gevonden! I en II zijn vrij (0 Pa). III = 25/40, IV = 37/60, V = 12/20 Pa (binnenland/kust). Let op: het cijfer is geen rangorde — V heeft minder overdruk dan III en IV.",
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
      II: "In gebied II mag B11 alleen met stabiliserende kap — kijk, die verschijnt automatisch!",
    },
    hintFout: "B11 werkt op natuurlijke trek en kan geen overdruk overwinnen. Alleen gebied I, of gebied II met stabiliserende kap.",
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
        Sleep elk toesteltype naar een uitmondingsgebied waar het mag uitmonden. Let op: B11 is kritisch!
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
    text: "Plaats het buurpand zo dat het niet belemmerend is.",
    check: (s) => !s.belemmerend,
    hint: "Schuif het buurpand verder weg: zodra de top onder het 15°-vlak vanaf de uitmonding blijft, is het niet meer belemmerend.",
  },
  {
    text: "Plaats het buurpand zo dat het wel belemmerend is, maar op ten minste 15 m afstand staat.",
    check: (s) => s.belemmerend && s.dM >= 15,
    hint: "Het pand moet boven het 15°-vlak uitsteken (belemmerend), maar de gevel moet op ≥ 15 m staan — dan mag een B11 nog uitmonden met stabiliserende kap.",
  },
  {
    text: "Plaats het buurpand belemmerend en dichterbij dan 15 m.",
    check: (s) => s.belemmerend && s.dM < 15,
    hint: "Schuif het pand binnen de 15 m-markering. Dan is natuurlijke afvoer niet meer toelaatbaar (gebieden IV en V).",
  },
];

function M1R3A({ onDone, addScore, badDrop }) {
  const areaRef = useRef(null);
  // Start bewust FOUT: het buurpand staat te dichtbij (belemmerend en < 15 m),
  // zodat de cursist het echt moet verslepen om opdracht 1 (niet belemmerend) te halen.
  const [pos, setPosState] = useState({ x: 300, y: 0 });
  // ref naast state: de release-evaluatie moet de actuele positie zien, ook als
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
      ? { tekst: "Belemmerend en < 15 m — natuurlijke afvoer niet toelaatbaar", kleur: C.red }
      : { tekst: "Belemmerend, maar ≥ 15 m — natuurlijke afvoer alleen met stabiliserende kap", kleur: "#B8860B" }
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
            <text x="600" y="30" fontSize="10" fontWeight="700" fill={C.brown} textAnchor="end">belemmeringsvlak — 15° vanaf de uitmonding</text>
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

// ── Plattegrond-helpers voor de perceelgrens-opdrachten (deel B) ──
// Bovenaanzicht: 1 px = 1 SVG-unit; PX_B px per meter. De doorvoer wordt op de
// gevel-polyline geprojecteerd; langszij en loodrecht zijn rechte maten naar de grens.
const PX_B = 40;
const fmtB = (n) => (n == null ? "—" : n.toFixed(1).replace(".", ","));

// dichtstbijzijnde punt op lijnstuk a–b
function projSeg(p, a, b) {
  const vx = b.x - a.x, vy = b.y - a.y;
  const len2 = vx * vx + vy * vy || 1;
  let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2;
  t = Math.max(0, Math.min(1, t));
  const x = a.x + t * vx, y = a.y + t * vy;
  const dx = p.x - x, dy = p.y - y;
  return { x, y, d2: dx * dx + dy * dy };
}
// dichtstbijzijnde punt op de hele gevel-polyline (globaal minimum; bij gelijkspel
// wint de laagste index → geen geflikker bij een knik)
function projPolyline(p, segs) {
  let best = null;
  for (const [a, b] of segs) {
    const r = projSeg(p, a, b);
    if (!best || r.d2 < best.d2) best = r;
  }
  return best ? { x: best.x, y: best.y } : p;
}
// langszij = horizontale afstand tot de zijgrens; loodrecht = verticale afstand tot de frontgrens
function meetB(pos, cfg) {
  return {
    langszij: cfg.gLx != null ? (pos.x - cfg.gLx) / PX_B : null,
    loodrecht: cfg.gBy != null ? (cfg.gBy - pos.y) / PX_B : null,
  };
}
function voldoetB(m, cfg) {
  return (cfg.gLx == null || m.langszij >= 1) && (cfg.gBy == null || m.loodrecht >= 2);
}

// Drie vaste opdrachten: 1 = langszij 1 m (rechte gevel), 2 = loodrecht 2 m (uitbouw),
// 3 = combinatie (hoekkavel, schuine gevel: beide eisen knijpen de geldige zone af).
const OPDR_B = [
  {
    id: 1,
    toonVerboden: true,
    toonStoplicht: true,
    kleurInline: true,
    gLx: 90,
    gBy: null,
    segs: [[{ x: 90, y: 200 }, { x: 470, y: 200 }]],
    gebouw: "90,55 470,55 470,200 90,200",
    woning: { x: 280, y: 125 },
    gevel: { x: 450, y: 193, anchor: "end" },
    verboden: [{ x: 90, y: 150, w: 40, h: 110 }],
    grenzen: [{ x1: 90, y1: 30, x2: 90, y2: 320, label: "perceelgrens", lx: 96, ly: 318, anchor: "start" }],
    start: { x: 114, y: 200 },
    tekst: "Opdracht 1 — De perceelgrens ligt naast de gevel. Sleep de uitmonding langs de gevel tot hij ten minste 1 m van de grens ligt (langszij).",
    hint: (m) => `Nu ${fmtB(m.langszij)} m van de zijgrens — langszij moet dat ten minste 1 m zijn. Schuif verder van de grens af.`,
  },
  {
    id: 2,
    toonVerboden: false,
    toonStoplicht: true,
    kleurInline: false,
    tweeMeterLijn: false,
    gLx: null,
    gBy: 330,
    segs: [
      [{ x: 90, y: 286 }, { x: 235, y: 286 }],
      [{ x: 235, y: 286 }, { x: 235, y: 230 }],
      [{ x: 235, y: 230 }, { x: 465, y: 230 }],
    ],
    gebouw: "90,60 465,60 465,230 235,230 235,286 90,286",
    woning: { x: 320, y: 145 },
    gevel: { x: 455, y: 222, anchor: "end" },
    uitbouwLabel: { x: 162, y: 270 },
    verboden: [{ x: 40, y: 250, w: 440, h: 80 }],
    grenzen: [{ x1: 30, y1: 330, x2: 500, y2: 330, label: "perceelgrens", lx: 470, ly: 348, anchor: "end" }],
    start: { x: 150, y: 286 },
    tekst: "Opdracht 2 — De perceelgrens ligt vóór de gevel. De uitbouw staat dichter bij de grens. Sleep de uitmonding naar een muur die ten minste 2 m van de grens ligt (loodrecht).",
    hint: (m) => `Nu ${fmtB(m.loodrecht)} m vóór de grens — loodrecht moet dat ten minste 2 m zijn (meer dan 1 m is hier niet genoeg). Schuif naar de muur die verder van de grens staat.`,
  },
  {
    id: 3,
    toonVerboden: false,
    toonStoplicht: false,
    kleurInline: false,
    gLx: 70,
    gBy: 340,
    segs: [[{ x: 75, y: 150 }, { x: 455, y: 300 }]],
    gebouw: "75,40 455,40 455,300 75,150",
    woning: { x: 250, y: 95 },
    gevel: { x: 250, y: 218, anchor: "start" },
    verboden: [
      { x: 70, y: 40, w: 40, h: 300 },
      { x: 20, y: 260, w: 480, h: 80 },
    ],
    grenzen: [
      { x1: 70, y1: 28, x2: 70, y2: 340, label: "perceelgrens", lx: 64, ly: 44, anchor: "end" },
      { x1: 20, y1: 340, x2: 500, y2: 340, label: "perceelgrens", lx: 470, ly: 358, anchor: "end" },
    ],
    start: { x: 398, y: 278 },
    tekst: "Opdracht 3 — Hoekkavel met twee grenzen. Zet de uitmonding zó neer dat hij langszij ten minste 1 m én loodrecht ten minste 2 m van de grenzen blijft.",
    hint: (m) => {
      const p = [];
      if (m.langszij < 1) p.push(`langszij ${fmtB(m.langszij)} m (moet ≥ 1 m)`);
      if (m.loodrecht < 2) p.push(`loodrecht ${fmtB(m.loodrecht)} m (moet ≥ 2 m)`);
      return `Nog niet goed: ${p.join(" en ")}. Verschuif tot beide groen zijn.`;
    },
  },
];

// Compact stoplicht + live maten naast de scène
function MaatLicht({ maten, cfg, ok }) {
  const Bulb = ({ on, kleur }) => (
    <div
      className="w-9 h-9 rounded-full border-2"
      style={{ backgroundColor: on ? kleur : "#3a3a3a", borderColor: "#1d1d1d", boxShadow: on ? `0 0 16px ${kleur}` : "none" }}
    />
  );
  const Rij = ({ label, waarde, eis, goed }) => (
    <div className="text-center">
      <div className="text-[10px] font-bold uppercase" style={{ color: C.brown }}>{label}</div>
      <div className="text-base font-bold" style={{ color: goed ? C.green : C.red }}>{fmtB(waarde)} m</div>
      <div className="text-[10px] font-bold" style={{ color: C.brown }}>{eis}</div>
    </div>
  );
  return (
    <div className="rounded-2xl border-2 p-3 w-40 flex flex-col items-center gap-2" style={{ backgroundColor: C.bgCard, borderColor: C.brownText }}>
      <div className="rounded-xl border-2 p-2 flex flex-col gap-2" style={{ backgroundColor: "#2b2b2b", borderColor: C.brownText }}>
        <Bulb on={!ok} kleur="#E74C3C" />
        <Bulb on={ok} kleur="#2ECC71" />
      </div>
      <div className="flex flex-col gap-2">
        {cfg.gLx != null && <Rij label="langszij" waarde={maten.langszij} eis="eis: ≥ 1 m" goed={maten.langszij >= 1} />}
        {cfg.gBy != null && <Rij label="loodrecht" waarde={maten.loodrecht} eis="eis: ≥ 2 m" goed={maten.loodrecht >= 2} />}
      </div>
    </div>
  );
}

function M1R3B({ onDone, addScore, badDrop }) {
  const areaRef = useRef(null);
  const [opdracht, setOpdracht] = useState(0);
  const opdrachtRef = useRef(0);
  const cfg = OPDR_B[opdracht];
  const [pos, setPosState] = useState(OPDR_B[0].start);
  const posRef = useRef(pos);
  const setPos = (p) => {
    posRef.current = p;
    setPosState(p);
  };
  const [hint, setHint] = useState(null);
  const [bevroren, setBevroren] = useState(false); // korte freeze tijdens de overgang

  const maten = meetB(pos, cfg);
  const ok = voldoetB(maten, cfg);

  const clamp = (p) => projPolyline(p, cfg.segs);

  const handleRelease = (point) => {
    if (bevroren) return;
    const c = OPDR_B[opdrachtRef.current];
    const m = meetB(posRef.current, c);
    if (voldoetB(m, c)) {
      addScore(5, point);
      playSound("drop");
      setHint(null);
      setBevroren(true);
      setTimeout(() => {
        const ni = opdrachtRef.current + 1;
        if (ni >= OPDR_B.length) {
          onDone();
          return;
        }
        opdrachtRef.current = ni;
        setOpdracht(ni);
        setPos(OPDR_B[ni].start);
        setBevroren(false);
      }, 650);
    } else {
      badDrop(point);
      setHint(c.hint(m));
    }
  };

  const SCW = 520;
  const SCH = 380;

  return (
    <>
      <OpdrachtKaart nr={opdracht + 1} totaal={3} text={cfg.tekst} />
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs font-semibold mt-1" style={{ color: C.brownText }}>
        <span>┈┈ = perceelgrens</span>
        {cfg.toonVerboden && <span style={{ color: C.red }}>▨ = verboden zone</span>}
        <span>regel: langszij ≥ 1 m · loodrecht ≥ 2 m</span>
      </div>
      <div className="flex flex-wrap gap-4 justify-center items-start mt-3">
        <div className="overflow-x-auto max-w-full">
          <div ref={areaRef} className="relative" style={{ width: SCW, height: SCH }}>
            <svg width={SCW} height={SCH} viewBox={`0 0 ${SCW} ${SCH}`} className="absolute inset-0">
              <defs>
                <ZonePatroon id="pgb-rood" kleur={ZONE_KLEUR.IV} />
              </defs>
              <rect x="0" y="0" width={SCW} height={SCH} fill="#F3ECDD" />
              <text x={SCW / 2} y={16} fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">bovenaanzicht — je kijkt van boven op het dak</text>
              {/* verboden zones (alleen waar toonVerboden aan staat — opdracht 1) */}
              {cfg.toonVerboden &&
                cfg.verboden.map((v, i) => (
                  <rect key={i} x={v.x} y={v.y} width={v.w} height={v.h} fill="url(#pgb-rood)" stroke={ZONE_KLEUR.IV} strokeWidth="1" strokeDasharray="4,3" />
                ))}
              {/* 2 m-afstandsstreep i.p.v. een rode zone (opdracht 2) */}
              {cfg.tweeMeterLijn && (
                <g>
                  <line x1={40} y1={cfg.gBy - 80} x2={480} y2={cfg.gBy - 80} stroke={C.olive} strokeWidth="2" strokeDasharray="7,4" />
                  <text x={476} y={cfg.gBy - 86} fontSize="11" fontWeight="700" fill={C.olive} textAnchor="end">minimaal 2 m van de grens</text>
                  <line x1={60} y1={cfg.gBy - 80} x2={60} y2={cfg.gBy} stroke={C.brown} strokeWidth="1.3" />
                  <line x1={55} y1={cfg.gBy - 80} x2={65} y2={cfg.gBy - 80} stroke={C.brown} strokeWidth="1.3" />
                  <line x1={55} y1={cfg.gBy} x2={65} y2={cfg.gBy} stroke={C.brown} strokeWidth="1.3" />
                  <text x={70} y={cfg.gBy - 36} fontSize="11" fontWeight="800" fill={C.brown} textAnchor="start">2 m</text>
                </g>
              )}
              {/* gebouw */}
              <polygon points={cfg.gebouw} fill="#FBF6EC" stroke={C.brownText} strokeWidth="2" />
              {/* labels — het is een plattegrond (dak van boven), geen gevelaanzicht */}
              <text x={cfg.woning.x} y={cfg.woning.y} fontSize="13" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">woning</text>
              <text x={cfg.gevel.x} y={cfg.gevel.y} fontSize="10.5" fontWeight="700" fill={C.olive} textAnchor={cfg.gevel.anchor}>gevel (voorwand)</text>
              {cfg.uitbouwLabel && (
                <text x={cfg.uitbouwLabel.x} y={cfg.uitbouwLabel.y} fontSize="10" fontWeight="700" fill={C.brown} textAnchor="middle">uitbouw</text>
              )}
              {/* gevel waar de doorvoer op zit (dik) */}
              {cfg.segs.map(([a, b], i) => (
                <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.brownText} strokeWidth="4" strokeLinecap="round" />
              ))}
              {/* perceelgrenzen */}
              {cfg.grenzen.map((g, i) => (
                <g key={i}>
                  <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} stroke={C.brownText} strokeWidth="2" strokeDasharray="9,5" />
                  <text x={g.lx} y={g.ly} fontSize="11" fontWeight="700" fill={C.brownText} textAnchor={g.anchor}>{g.label}</text>
                </g>
              ))}
              {/* live langszij-maat (horizontaal naar de zijgrens) */}
              {cfg.gLx != null && (
                <g>
                  <line x1={cfg.gLx} y1={pos.y + 26} x2={pos.x} y2={pos.y + 26} stroke={C.brown} strokeWidth="1.5" />
                  <line x1={cfg.gLx} y1={pos.y + 21} x2={cfg.gLx} y2={pos.y + 31} stroke={C.brown} strokeWidth="1.5" />
                  <line x1={pos.x} y1={pos.y + 21} x2={pos.x} y2={pos.y + 31} stroke={C.brown} strokeWidth="1.5" />
                  <line x1={pos.x} y1={pos.y} x2={pos.x} y2={pos.y + 26} stroke={C.brown} strokeWidth="0.8" strokeDasharray="2,2" />
                  <text x={(cfg.gLx + pos.x) / 2} y={pos.y + 42} fontSize="13" fontWeight="800" fill={cfg.kleurInline ? (maten.langszij >= 1 ? C.green : C.red) : C.brown} textAnchor="middle">
                    langszij {fmtB(maten.langszij)} m
                  </text>
                </g>
              )}
              {/* live loodrecht-maat (verticaal naar de frontgrens); label klapt naar links bij weinig ruimte rechts */}
              {cfg.gBy != null && (() => {
                const rechts = pos.x < SCW - 150;
                const mx = rechts ? pos.x + 26 : pos.x - 26;
                return (
                  <g>
                    <line x1={mx} y1={pos.y} x2={mx} y2={cfg.gBy} stroke={C.brown} strokeWidth="1.5" />
                    <line x1={mx - 5} y1={pos.y} x2={mx + 5} y2={pos.y} stroke={C.brown} strokeWidth="1.5" />
                    <line x1={mx - 5} y1={cfg.gBy} x2={mx + 5} y2={cfg.gBy} stroke={C.brown} strokeWidth="1.5" />
                    <line x1={pos.x} y1={pos.y} x2={mx} y2={pos.y} stroke={C.brown} strokeWidth="0.8" strokeDasharray="2,2" />
                    <text x={rechts ? mx + 8 : mx - 8} y={(pos.y + cfg.gBy) / 2} fontSize="13" fontWeight="800" fill={cfg.kleurInline ? (maten.loodrecht >= 2 ? C.green : C.red) : C.brown} textAnchor={rechts ? "start" : "end"}>
                      loodrecht {fmtB(maten.loodrecht)} m
                    </text>
                  </g>
                );
              })()}
            </svg>
            <FreeDrag areaRef={areaRef} pos={pos} setPos={setPos} clamp={clamp} onRelease={handleRelease} disabled={bevroren}>
              <div className="flex flex-col items-center select-none">
                <div className="rounded-full shadow-md" style={{ width: 20, height: 20, backgroundColor: "#FFFFFF", border: `3px solid ${cfg.kleurInline ? (ok ? C.green : C.red) : C.olive}` }} />
                <div className="text-[10px] font-bold mt-0.5 px-1 rounded" style={{ color: C.brownText, backgroundColor: "rgba(255,253,248,0.85)" }}>uitmonding</div>
              </div>
            </FreeDrag>
          </div>
        </div>
        {cfg.toonStoplicht && <MaatLicht maten={maten} cfg={cfg} ok={ok} />}
      </div>
      <div className="mt-2">
        <HintBar text={hint} />
      </div>
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
          : "Deel B — Zet de geveldoorvoer zelf op de juiste plek t.o.v. de perceelgrens (NEN 2757-1, § 6.2.2)."}
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
              text: "Sterk! Naast de grens (langszij) ten minste 1 m, recht vóór de gevel (loodrecht) ten minste 2 m. Welke van de twee bindt, hangt af van waar de perceelgrens ligt.",
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
  { sit: 1, taak: "Plaats de toevoer (T) in de gevel en de afvoer (A) in het hoger gelegen dakvlak.", hint: "Toevoer (T) in de gevel, afvoer (A) in het hoger gelegen dakvlak — dat is situatie 1." },
  { sit: 3, taak: "Plaats beide in dezelfde gevel, met de afvoer (A) hoger dan de toevoer (T).", hint: "Beide in dezelfde gevel, afvoer (A) hoger dan toevoer (T) — dat is situatie 3." },
  { sit: 4, taak: "Plaats beide in dezelfde gevel, met de afvoer (A) lager dan de toevoer (T).", hint: "Beide in dezelfde gevel, afvoer (A) lager dan toevoer (T) — dat is situatie 4." },
  { sit: 5, taak: "Plaats de toevoer (T) en de afvoer (A) in hetzelfde (platte) dakvlak.", hint: "Toevoer (T) en afvoer (A) in hetzelfde dakvlak — dat is situatie 5." },
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

  // scène-coördinaten van een anker (gevel-ankers liggen op de rechtergevel)
  const ankerScene = (id) => {
    const k = ANKERS.find((a) => a.id === id);
    if (!k) return null;
    return { x: k.type === "gevel" ? 420 : k.x - 60, y: k.y };
  };
  const pA = plaatsing.A ? ankerScene(plaatsing.A) : null;
  const pT = plaatsing.T ? ankerScene(plaatsing.T) : null;
  const toonDh = pA && pT && Math.abs(pA.y - pT.y) > 14;

  return (
    <div className="flex-1 flex flex-col items-center p-5">
      <StepBanner step={1} />
      <h2 className="text-xl font-bold italic mb-1" style={{ color: C.brownText }}>
        Ronde 1: Welke modelsituatie is het?
      </h2>
      <p className="text-sm mb-3 max-w-xl text-center font-medium" style={{ color: C.brown }}>
        Plaats de afvoer (A) en de toevoer (T) op het gebouw. Het paspoort toont welke modelsituatie uit bijlage A ontstaat.
      </p>

      <OpdrachtKaart nr={opdracht + 1} totaal={4} text={SIT_OPDRACHTEN[opdracht]?.taak ?? ""} />

      <div className="flex flex-wrap gap-4 justify-center items-start mt-3">
        <div className="overflow-x-auto max-w-full">
          <div className="relative" style={{ width: 480, height: 380 }}>
            <svg width={480} height={380} viewBox="0 0 480 380" className="absolute inset-0">
              {/* maaiveld met grondarcering */}
              <Grond x1={30} x2={460} y={340} />
              {/* gebouw: plat dak (< 23°) + gevel rechts, zoals bijlage A */}
              <rect x="100" y="120" width="320" height="220" fill={C.bgCard} stroke={C.brownText} strokeWidth="2.5" />
              <line x1="100" y1="120" x2="420" y2="120" stroke={C.brownText} strokeWidth="3" />
              <text x="255" y="112" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">D — dakvlak (&lt; 23°)</text>
              <text x="452" y="235" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle" transform="rotate(90 452 235)">G — gevel (≥ 75°)</text>
              {/* gevel met ramen en deur (figuur 1-stijl) */}
              <GevelRamen x={130} y={160} />
              <GevelRamen x={230} y={160} />
              <GevelRamen x={130} y={240} />
              <Deur x={244} y={270} h={70} />
              {/* hoekannotatie gevel ≥ 75° */}
              <path d="M 388 340 A 32 32 0 0 0 420 310" fill="none" stroke={C.brownText} strokeWidth="1" />
              <text x="362" y="326" fontSize="9" fontWeight="700" fontStyle="italic" fill={C.brownText}>≥ 75°</text>
              {/* Δh-maat tussen A en T, zoals in de bijlage A-figuren */}
              {toonDh && (
                <g>
                  <line x1={pA.x - 24} y1={pA.y} x2="66" y2={pA.y} stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
                  <line x1={pT.x - 24} y1={pT.y} x2="66" y2={pT.y} stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="72" y1={Math.min(pA.y, pT.y)} x2="72" y2={Math.max(pA.y, pT.y)} stroke={C.brownText} strokeWidth="1" />
                  <polygon points={`69,${Math.min(pA.y, pT.y) + 7} 75,${Math.min(pA.y, pT.y) + 7} 72,${Math.min(pA.y, pT.y) + 1}`} fill={C.brownText} />
                  <polygon points={`69,${Math.max(pA.y, pT.y) - 7} 75,${Math.max(pA.y, pT.y) - 7} 72,${Math.max(pA.y, pT.y) - 1}`} fill={C.brownText} />
                  <text x="46" y={(pA.y + pT.y) / 2 + 4} fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brownText}>Δh</text>
                </g>
              )}
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
                  <div className="text-[8px] leading-tight" style={{ color: C.brown }}>weegt de afstand</div>
                </div>
                <div className="flex-1 rounded-xl border px-2 py-1.5 text-center" style={{ borderColor: C.beigeMid }}>
                  <div className="text-[9px] font-bold" style={{ color: C.brown }}>C₂</div>
                  <div className="text-lg font-bold" style={{ color: info.c2 < 0 ? C.red : C.brownText }}>{info.c2}</div>
                  <div className="text-[8px] leading-tight" style={{ color: C.brown }}>weegt de hoogte</div>
                </div>
              </div>
              {info.c2 < 0 && (
                <div className="text-[10px] italic mt-2" style={{ color: C.red }}>
                  C₂ is negatief: de afvoer ligt lager dan de toevoer — dat werkt tegen de verdunning.
                </div>
              )}
            </>
          ) : sit === 13 ? (
            <div className="text-xs italic" style={{ color: C.red }}>
              T op het dak en A in de gevel = situatie 13 — die behandelen we hier niet.
            </div>
          ) : (
            <div className="text-xs italic" style={{ color: C.brown }}>
              Plaats A en T om de situatie te bepalen…
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
    opdracht: "Plaats de uitmonding (A) zo dat de verdunningsfactor voldoet bij 36 kW.",
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

// 'verboden zone' — raster van cellen waar f ≥ 0,01, in dezelfde rode
// arcering als uitmondingsgebied IV (rood gearceerd = daar niet)
function VerbodenZone({ scene, domein, fill = "url(#vz-rood)" }) {
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
        <rect key={i} x={c.x} y={c.y} width={stap} height={stap} fill={fill} />
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
            ? "Te dicht bij het rooster — verschuif de uitmonding verder weg, of plaats hem hoger dan het rooster (dan telt het hoogteverschil niet meer negatief)."
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
        Versleep de uitmonding (A) en kijk hoe l en Δh de formule veranderen. Verkeerslicht groen = de afstand voldoet. Alleen het loslaten telt!
      </p>

      <OpdrachtKaart nr={sceneIdx + 1} totaal={4} text={scene.opdracht} />

      <div className="flex flex-wrap gap-4 justify-center items-start mt-3">
        <div className="overflow-x-auto max-w-full">
          <div ref={areaRef} className="relative" style={{ width: sceneW, height: sceneH }}>
            <svg width={sceneW} height={sceneH} viewBox={`0 0 ${sceneW} ${sceneH}`} className="absolute inset-0">
              <defs>
                <ZonePatroon id="vz-rood" kleur={ZONE_KLEUR.IV} />
              </defs>
              {scene.type === "gevel" && (
                <>
                  <Grond x1={40} x2={520} y={370} />
                  <rect x="130" y="50" width="300" height="320" fill={C.bgCard} stroke={C.brownText} strokeWidth="2.5" />
                  <text x="285" y="42" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">
                    gevel-aanzicht (figuur 14) — situatie {res.sit} (C₁ = {res.c1}, C₂ = {res.c2})
                  </text>
                  {/* ramen zoals figuur 14: het rooster zit bovenin het middelste raam */}
                  <g fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.5">
                    <rect x="166" y="300" width="56" height="56" />
                    <line x1="166" y1="300" x2="222" y2="356" strokeWidth="1" />
                    <rect x="338" y="300" width="56" height="56" />
                    <line x1="338" y1="300" x2="394" y2="356" strokeWidth="1" />
                    <rect x="246" y="300" width="68" height="56" />
                  </g>
                  <VerbodenZone scene={scene} domein={domein} />
                  {/* ventilatierooster T bovenin het middelste raam */}
                  <g>
                    <rect x="262" y="306" width="36" height="22" fill="#2E86C1" stroke={C.brownText} strokeWidth="2" rx="3" />
                    {[312, 318, 323].map((y) => (
                      <line key={y} x1="266" y1={y} x2="294" y2={y} stroke="white" strokeWidth="2" />
                    ))}
                    <text x="280" y="366" fontSize="10" fontWeight="700" fill="#2E86C1" textAnchor="middle">T — rooster</text>
                  </g>
                  {/* maatlijn l (kortste afstand A–T) */}
                  <line x1="280" y1="320" x2={pos.x} y2={pos.y} stroke={C.brown} strokeWidth="1.5" strokeDasharray="5,4" />
                  <text x={(280 + pos.x) / 2 + 8} y={(320 + pos.y) / 2} fontSize="10" fontWeight="700" fill={C.brown}>
                    l = {res.l.toFixed(1).replace(".", ",")} m
                  </text>
                  {/* Δh-maat links, zoals in de NPR-figuren */}
                  {Math.abs(320 - pos.y) > 16 && (
                    <g>
                      <line x1={pos.x - 14} y1={pos.y} x2="96" y2={pos.y} stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
                      <line x1="262" y1="320" x2="96" y2="320" stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
                      <line x1="102" y1={pos.y} x2="102" y2="320" stroke={C.brownText} strokeWidth="1" />
                      <polygon points={`99,${Math.min(pos.y, 320) + 7} 105,${Math.min(pos.y, 320) + 7} 102,${Math.min(pos.y, 320) + 1}`} fill={C.brownText} />
                      <polygon points={`99,${Math.max(pos.y, 320) - 7} 105,${Math.max(pos.y, 320) - 7} 102,${Math.max(pos.y, 320) - 1}`} fill={C.brownText} />
                      <text x="78" y={(pos.y + 320) / 2 + 4} fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brownText}>Δh</text>
                    </g>
                  )}
                </>
              )}
              {scene.type === "dak" && (
                <>
                  <Grond x1={30} x2={530} y={290} />
                  <rect x="60" y="200" width="440" height="90" fill={C.bgCard} stroke={C.brownText} strokeWidth="2.5" />
                  {/* raampjes in de bovenste verdieping (figuur 16-stijl) */}
                  {[110, 200, 290, 380].map((x) => (
                    <rect key={x} x={x} y="226" width="40" height="38" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.5" />
                  ))}
                  <text x="280" y="40" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">
                    plat dak (figuur 16) — situatie 5 (C₁ = 80, C₂ = 80)
                  </text>
                  <VerbodenZone scene={scene} domein={{ x0: 150, x1: 484, y0: 150, y1: 162 }} />
                  {/* aanzuigopening T (0,3 m boven dak) */}
                  <rect x="112" y="191" width="16" height="9" fill="#2E86C1" stroke={C.brownText} strokeWidth="2" />
                  <text x="105" y="186" fontSize="11" fontWeight="700" fill="#2E86C1" textAnchor="end">T</text>
                  {/* Δh-maat links (vast: 1,2 m hoogteverschil) */}
                  <line x1="110" y1="191" x2="64" y2="191" stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="150" y1="155" x2="64" y2="155" stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="70" y1="155" x2="70" y2="191" stroke={C.brownText} strokeWidth="1" />
                  <polygon points="67,162 73,162 70,156" fill={C.brownText} />
                  <polygon points="67,184 73,184 70,190" fill={C.brownText} />
                  <text x="46" y="177" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brownText}>Δh</text>
                  {/* maatlijn l */}
                  <line x1="120" y1="191" x2={pos.x} y2="160" stroke={C.brown} strokeWidth="1.5" strokeDasharray="5,4" />
                  <text x={(120 + pos.x) / 2} y="178" fontSize="10" fontWeight="700" fill={C.brown}>
                    l = {res.l.toFixed(1).replace(".", ",")} m
                  </text>
                </>
              )}
              {scene.type === "geveldak" && (
                <>
                  <Grond x1={30} x2={530} y={360} />
                  <rect x="80" y="170" width="320" height="190" fill={C.bgCard} stroke={C.brownText} strokeWidth="2.5" />
                  <GevelRamen x={110} y={206} />
                  <GevelRamen x={110} y={276} />
                  <Deur x={300} y={290} h={70} />
                  <LiggendRaam x={296} y={210} />
                  <text x="240" y="40" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">
                    afvoer op het dak, rooster bovenin de gevel — situatie 1 (C₁ = 163, C₂ = 325)
                  </text>
                  <VerbodenZone scene={scene} domein={{ x0: 96, x1: 384, y0: 150, y1: 162 }} />
                  {/* rooster T bovenin de gevel */}
                  <rect x="396" y="174" width="22" height="14" fill="#2E86C1" stroke={C.brownText} strokeWidth="2" rx="2" />
                  <text x="430" y="186" fontSize="11" fontWeight="700" fill="#2E86C1">T</text>
                  {/* Δh-maat rechts */}
                  <line x1="404" y1="180" x2="466" y2="180" stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="420" y1="155" x2="466" y2="155" stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="460" y1="155" x2="460" y2="180" stroke={C.brownText} strokeWidth="1" />
                  <text x="470" y="172" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brownText}>Δh</text>
                  {/* maatlijn l */}
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

      {/* Meelopende berekening: laat zien WAAROM het verkeerslicht groen/rood is */}
      <div className="mt-3 rounded-xl border-2 px-4 py-3 max-w-xl w-full text-center" style={{ backgroundColor: C.bgCard, borderColor: C.brownText }}>
        <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: C.olive }}>
          Verdunningsfactor berekenen
        </div>
        <div className="text-sm font-bold" style={{ color: C.brownText }}>
          f = B / (C₁·l² + C₂·Δh²)
        </div>
        <div className="text-sm mt-1" style={{ color: C.brown }}>
          = {scene.B} / ({res.c1} × {res.l.toFixed(1).replace(".", ",")}²{" "}
          {res.c2 < 0 ? "−" : "+"} {Math.abs(res.c2)} × {res.dh.toFixed(1).replace(".", ",")}²) ={" "}
          <span className="font-bold" style={{ color: ok ? C.green : C.red }}>{fFormat(res.f)}</span>
        </div>
        <div className="text-[11px] mt-1 font-bold" style={{ color: ok ? C.green : C.red }}>
          eis: f &lt; 0,01 — {ok ? "voldoet ✓" : "nog te dicht bij het rooster ✗"}
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
    reden: "50% van tap = 0,5 × 32 = 16 kW. De CV-belasting (24 kW) is hoger → reken met 24 kW.",
  },
  {
    cv: 12,
    tap: 36,
    correct: "18 kW",
    opties: ["12 kW", "36 kW", "18 kW"],
    reden: "50% van tap = 0,5 × 36 = 18 kW. Dat is hoger dan de CV-belasting (12 kW) → reken met 18 kW.",
  },
  {
    cv: 30,
    tap: 24,
    correct: "30 kW",
    opties: ["30 kW", "12 kW", "24 kW"],
    reden: "50% van tap = 0,5 × 24 = 12 kW. De CV-belasting (30 kW) is hoger → reken met 30 kW.",
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
      // niet auto-doorspringen: de cursist leest de berekening en klikt zelf verder
      return "correct";
    }
    badDrop(point);
    setHint("Denk aan de 50%-regel: reken met het maximum van de CV-belasting of 50% van de tapbelasting.");
    return "wrong";
  };

  const handleCombiVolgende = () => {
    setCombiKlaar(false);
    setReden(null);
    if (combiIdx + 1 >= COMBIS.length) {
      setPopup({
        type: "correct",
        text: "De 50%-regel zit erin: reken met het maximum van de CV-belasting of 50% van de tapbelasting. Nu de afvoercombinaties!",
        next: () => {
          setPopup(null);
          setDeel("B");
        },
      });
    } else {
      setCombiIdx((i) => i + 1);
    }
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
      C42: "Bij C42 zijn afvoer en toevoer gemeenschappelijk (volledig CLV).",
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
            {combiKlaar ? (
              <GameButton onClick={handleCombiVolgende} variant="green">
                {combiIdx + 1 >= COMBIS.length ? "Naar de afvoercombinaties" : "Volgende toestel"}
                <ArrowRight className="w-4 h-4" />
              </GameButton>
            ) : (
              combi.opties.map((o) => (
                <Draggable key={o} payload={o}>
                  <DragCard label={o} />
                </Draggable>
              ))
            )}
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
        <div className="border-2 rounded-2xl px-5 py-4 max-w-md w-full" style={{ backgroundColor: C.bgCard, borderColor: C.brownText }}>
          <div className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: C.olive }}>
            Zo werkt het
          </div>
          <ul className="text-sm space-y-1.5" style={{ color: C.brownText }}>
            <li>
              <span className="font-bold">Bediening:</span> sleep een kaartje naar de juiste plek — of tik het aan en tik daarna op de plek.
            </li>
            <li>
              <span className="font-bold">Elke ronde:</span> eerst een korte uitleg, dan een opdracht, dan een controlevraag.
            </li>
            <li>
              <span className="font-bold">Punten:</span> goede zet +5, foute zet −5; controlevraag goed +10.
            </li>
            <li className="flex items-center gap-1.5">
              <span className="font-bold">Levens:</span>
              <span className="inline-flex gap-0.5">
                {[1, 2, 3, 4, 5].map((h) => (
                  <Heart key={h} className="w-3.5 h-3.5" fill="#E74C3C" stroke="#E74C3C" />
                ))}
              </span>
              <span>— elke foute controlevraag kost een hartje; bij 5 fouten begin je opnieuw.</span>
            </li>
          </ul>
        </div>
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
          Je weet nu <strong>waar</strong> de uitmonding mag. In missie 2 leer je hoe ver hij van een
          ventilatieopening moet zitten.
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
              text={
                "De uitmonding is waar het rookgas naar buiten komt.\n" +
                "Verkeerde plek = slechte werking, gevaar of overlast.\n" +
                "Je leert waar de uitmonding wel en niet mag."
              }
            />
          )}

          {screen === "m1r1" && (
            <RondeMetUitleg
              titel="Ronde 1: De vijf uitmondingsgebieden"
              figuur={<AfbGebiedenKlein />}
              regels={[
                "Wind duwt rookgas soms terug. Die tegendruk heet overdruk (in Pascal, Pa). Meer Pa = lastiger.",
                "Rond het dak zijn 5 gebieden (I t/m V). I en II zijn vrij: 0 Pa. Vanaf III is er overdruk.",
                "Groen = vrij, oranje/rood = overdruk. Sleep elk label naar de juiste plek.",
              ]}
            >
              <M1R1 onComplete={next} addScore={addScore} badDrop={badDrop} />
            </RondeMetUitleg>
          )}
          {screen === "m1r1mc" && (
            <div className="flex-1 flex flex-col items-center p-5">
              <StepBanner step={2} />
              <MCControle pool={POOL_M1R1} onComplete={next} {...mcProps} />
            </div>
          )}

          {screen === "m1r2" && (
            <RondeMetUitleg
              titel="Ronde 2: Welk toestel mag waar uitmonden?"
              regels={[
                "Niet elk toestel kan tegen overdruk. B11 heeft geen ventilator: alleen gebied I, of II met een kap.",
                "B22, B23 en type C kunnen overdruk wel aan. Sleep elk toestel naar een gebied waar het mag.",
              ]}
            >
              <M1R2 onComplete={next} addScore={addScore} badDrop={badDrop} />
            </RondeMetUitleg>
          )}
          {screen === "m1r2mc" && (
            <div className="flex-1 flex flex-col items-center p-5">
              <StepBanner step={2} />
              <MCControle pool={POOL_M1R2} onComplete={next} {...mcProps} />
            </div>
          )}

          {screen === "m1r3" && (
            <RondeMetUitleg
              titel="Ronde 3: Belemmering en perceelgrens"
              regels={[
                "Deel A — Een hoog buurpand dichtbij stoort de afvoer. Steekt de top boven de 15°-lijn vanaf je uitmonding uit? Dan is het belemmerend. Ook binnen 15 m? Dan mag natuurlijke afvoer niet meer.",
                "Deel B — De uitmonding moet ver genoeg van de perceelgrens (grens met de buren): langszij minimaal 1 m, loodrecht minimaal 2 m.",
              ]}
            >
              <M1R3 onComplete={next} addScore={addScore} badDrop={badDrop} />
            </RondeMetUitleg>
          )}
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
              text={
                "De plek is goed. Maar zit de uitmonding ver genoeg van een ventilatierooster?\n" +
                "Rookgas dat als verse lucht naar binnen wordt gezogen is gevaarlijk.\n" +
                "Met de verdunningsfactor check je of de afstand genoeg is."
              }
            />
          )}

          {screen === "m2r1" && (
            <RondeMetUitleg
              titel="Ronde 1: Welke modelsituatie is het?"
              regels={[
                "Het maakt uit hoe de afvoer (A) en toevoer (T) liggen: in de gevel of in het dak, hoger of lager.",
                "Elke ligging is een 'situatie' met twee factoren: C₁ weegt de afstand, C₂ het hoogteverschil.",
                "Plaats A en T volgens de opdracht. Het paspoort toont de situatie met C₁ en C₂.",
              ]}
            >
              <M2R1 onComplete={next} addScore={addScore} badDrop={badDrop} />
            </RondeMetUitleg>
          )}
          {screen === "m2r1mc" && (
            <div className="flex-1 flex flex-col items-center p-5">
              <StepBanner step={2} />
              <MCControle pool={POOL_M2R1} onComplete={next} {...mcProps} />
            </div>
          )}

          {screen === "m2r2" && (
            <RondeMetUitleg
              titel="Ronde 2: Verdunningsfactor — voldoet het?"
              regels={[
                "De verdunningsfactor f zegt hoe goed het rookgas verdunt voor het bij een rooster komt. Kleiner = beter. Eis: f < 0,01.",
                "Formule: f = B / (C₁·l² + C₂·Δh²). Meer afstand l = kleinere f = beter.",
                "Schuif de uitmonding tot f voldoet. Groen verkeerslicht = goed.",
              ]}
            >
              <M2R2 onComplete={next} addScore={addScore} badDrop={badDrop} />
            </RondeMetUitleg>
          )}
          {screen === "m2r2mc" && (
            <div className="flex-1 flex flex-col items-center p-5">
              <StepBanner step={2} />
              <MCControle pool={POOL_M2R2} onComplete={next} {...mcProps} />
            </div>
          )}

          {screen === "m2r3" && (
            <RondeMetUitleg
              titel="Ronde 3: Combitoestel en afvoercombinaties"
              regels={[
                "Deel A — 50%-regel. Een combitoestel doet cv en warm water niet samen op vol vermogen. Reken met het hoogste van: de cv-belasting of 50% van de tapbelasting (niet optellen).",
                "Deel B — Koppel elke toestelcode aan de juiste afvoer en toevoer.",
              ]}
            >
              <M2R3 onComplete={next} addScore={addScore} badDrop={badDrop} />
            </RondeMetUitleg>
          )}
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
              text="Je kunt nu een uitmonding veilig plaatsen en de verdunningsafstand checken. Gebied I en II zijn vrij, B11 is kritisch, en met f = B / (C₁·l² + C₂·Δh²) check je of het rookgas genoeg verdunt."
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
