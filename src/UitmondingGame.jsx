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
import { KAART_B1 } from "./kaartB1.js";

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
      "Juist! Gebieden I en II zijn vrij van overdruk. In gebied II (de wig boven de nok bij belendende bebouwing op ≥ 15 m) is wel een stabiliserende kap nodig.",
    feedbackWrong: "Gebied I (0 Pa) en gebied II (0 Pa) zijn de vrije uitmondingsgebieden. Vanaf gebied III geldt overdruk.",
    hint: "'Vrij' betekent: geen overdruk (0 Pa). Het zijn precies de gebieden waar een B11 op natuurlijke trek mag uitmonden.",
    bron: "NPR 3378-60:2022, § 5.1.2 en § 5.2.1",
    afbeelding: <AfbGebiedenKlein />,
  },
  {
    question:
      "Een uitmonding zit op meer dan 0,8 m van de nok (schuin dak α ≥ 23°). Wat betekent dat voor de hoogte van de schoorsteen?",
    options: [
      "De schoorsteen moet flink hoger dan hmin om nog in gebied I uit te komen",
      "Een hoogte van hmin boven de nok is ook hier voldoende",
      "De uitmonding valt automatisch in gebied I, ongeacht de hoogte",
      "Zo'n uitmonding is niet toegestaan",
    ],
    correct: 0,
    feedbackCorrect:
      "Correct! Alleen binnen 0,8 m van de nok volstaat hmin boven de nok. Verder van de nok wordt gebied I (de trechter) pas op grotere hoogte bereikt — de schoorsteen moet dus flink hoger, anders mondt hij uit in gebied III.",
    feedbackWrong:
      "Denk aan de trechter: binnen 0,8 m van de nok volstaat hmin boven de nok, maar verder van de nok begint gebied I pas op grotere hoogte. De schoorsteen moet daar dus flink hoger — anders zit de uitmonding in gebied III.",
    hint: "Denk aan de trechter boven de nok uit de sleepronde: hoe verder van de nok, hoe hoger je moet uitmonden om er nog in te vallen.",
    bron: "NPR 3378-60:2022, toelichting bij figuur 1c en § 5.2.3",
    afbeelding: <AfbSchuinDakVer />,
  },
];

const POOL_M1R2 = [
  {
    question: "Een B11-toestel werkt op natuurlijke trek, zonder ventilator. Waar mag de afvoer uitmonden?",
    options: [
      "Alleen in gebied I, of in gebied II met een stabiliserende kap",
      "In elk uitmondingsgebied, net als een type C-toestel",
      "In elk gebied, zolang de uitmonding maar bovendaks zit",
      "Alleen in gebied III, IV of V",
    ],
    correct: 0,
    feedbackCorrect:
      "Juist! Zonder ventilator kan een B11 geen overdruk overwinnen: alleen het vrije gebied I, of gebied II met een stabiliserende kap. Dat is het grote verschil met B22/B23 en type C.",
    feedbackWrong:
      "Een B11 heeft geen ventilator en kan overdruk niet wegdrukken. Hij mag alleen uitmonden in gebied I, of in gebied II met een stabiliserende kap — de overige gebieden zijn voor toestellen met ventilator of voor type C.",
    hint: "Denk aan de sleepronde: welk toestel was de kieskeurige, en welke twee gebieden bleven er voor hem over?",
    bron: "NPR 3378-60:2022, § 5.2.1",
  },
  {
    question: "Wanneer mag een type B11-toestel (met stabiliserende kap) niet meer uitmonden in de wig boven de nok?",
    options: [
      "Als het belemmerende gebouw op minder dan 15 m staat — de wig is dan gebied V in plaats van gebied II",
      "Als het dak een hellingshoek van minder dan 23° heeft",
      "Als de uitmonding meer dan hmin boven de nok uitsteekt",
      "Een B11-toestel mag nooit boven de nok uitmonden",
    ],
    correct: 0,
    feedbackCorrect:
      "Klopt! Op ≥ 15 m is de wig gebied II (0 Pa) en mag een B11 daar met stabiliserende kap uitmonden. Staat het gebouw dichterbij dan 15 m, dan wordt de wig gebied V (12/20 Pa) — natuurlijke afvoer is dan niet meer toelaatbaar.",
    feedbackWrong:
      "Kijk naar de afstand: op ≥ 15 m is de wig gebied II en mag een B11 daar uitmonden (met stabiliserende kap). Op < 15 m wordt de wig gebied V en is natuurlijke afvoer niet meer toelaatbaar.",
    hint: "De wig boven de nok bestaat in beide figuren, maar wisselt van gebied. Wat gebeurt er als het belemmerende gebouw dichterbij komt dan 15 m?",
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
    question: "Wanneer is een naastgelegen gebouw belemmerend voor de uitmonding?",
    options: [
      "Als het over de hele breedte van het belemmeringsvlak boven dat vlak uitsteekt",
      "Zodra het hoger is dan de uitmonding",
      "Alleen als het binnen 15 m van de uitmonding staat",
      "Elk gebouw dat boven het 10°-vlak uitsteekt, ook een slanke toren",
    ],
    correct: 0,
    feedbackCorrect:
      "Juist! Het belemmeringsvlak loopt 15° naar links en rechts en 10° schuin omhoog vanaf de uitmonding. Alleen een gebouw dat over de hele breedte van dat vlak erbovenuit steekt, is belemmerend — een slanke toren dus niet.",
    feedbackWrong:
      "Kijk naar figuur 3: een gebouw is belemmerend als het over de hele breedte van het vlak (15° links/rechts, 10° schuin omhoog) erbovenuit steekt. Een slanke toren vult die breedte niet en is dus niet belemmerend. De afstand bepaalt niet of iets belemmerend is, maar wat de gevolgen zijn.",
    hint: "Denk aan de slanke toren uit de sleepronde: die stak boven het 10°-vlak uit en was toch niet belemmerend. Waarom ook alweer?",
    bron: "NPR 3378-60:2022, § 5.1.3 en figuur 3",
    afbeelding: <AfbBelemmering />,
  },
  {
    question: "Een buurgebouw is belemmerend en staat op 18 m van de uitmonding. Wat geldt voor een toestel met natuurlijke afvoer (B11)?",
    options: [
      "Uitmonden mag, mits met een stabiliserende kap",
      "Natuurlijke afvoer is hier niet toelaatbaar",
      "Uitmonden mag zonder verdere maatregelen",
      "Het toestel moet worden vervangen door een type C",
    ],
    correct: 0,
    feedbackCorrect:
      "Klopt! Belemmerend op ≥ 15 m: natuurlijke afvoer is toelaatbaar met stabiliserende kap. Pas binnen 15 m is natuurlijke afvoer niet meer toelaatbaar.",
    feedbackWrong:
      "De afstand bepaalt de maatregel: belemmerend op ≥ 15 m → toelaatbaar met stabiliserende kap; belemmerend op < 15 m → natuurlijke afvoer niet toelaatbaar.",
    hint: "18 m is meer dan 15 m. Welke maatregel hoorde daar in de sleepronde ook alweer bij?",
    bron: "NPR 3378-60:2022, § 5.1.3",
  },
  {
    question:
      "Een dakdoorvoer is aangesloten op een B11-toestel; het naastgelegen pannendak is van de buren. Mag deze dakdoorvoer hier uitmonden?",
    options: [
      "Nee, de dakdoorvoer moet boven de nok uitkomen, ook al is het naastgelegen dak van de buren",
      "Ja, als er een stabiliserende kap op zit",
      "Ja, mits de doorvoer minimaal 0,5 m boven het platte dak uitsteekt",
      "Nee, omdat de rookgassen de buren hinderen",
    ],
    correct: 0,
    feedbackCorrect:
      "Klopt! Het hogere buurdak grenst direct aan de doorvoer: het steekt over de volle breedte boven het 10°-vlak uit en staat ruim binnen 15 m — belemmerend dus. Pas als de uitmonding boven de nok van het buurdak uitkomt, is het dak niet meer belemmerend. De wind trekt zich niets aan van perceelgrenzen.",
    feedbackWrong:
      "Pas de les van deze ronde toe: het hogere buurdak steekt over de volle breedte boven het 10°-vlak uit en staat binnen 15 m — belemmerend, dus geen natuurlijke afvoer op deze hoogte. Dat verandert pas als de uitmonding boven de nok van het buurdak uitkomt: dan is het dak niet meer belemmerend. Wiens eigendom het is, maakt de wind niets uit.",
    hint: "Bekijk het buurdak als belemmering: steekt het boven het 10°-vlak vanaf de doorvoer uit, en hoe ver staat het? En trekt de wind zich iets aan van eigendomsgrenzen?",
    bron: "NPR 3378-60:2022, § 5.1.1 LET OP-kader (wind en belendende bebouwing) en § 5.1.3",
    afbeelding: <AfbDakdoorvoerBuren />,
  },
  {
    question: "Een woning in Katwijk (aan zee) heeft een uitmonding in gebied III. Met welke overdruk moet je rekenen?",
    options: ["40 Pa", "25 Pa", "0 Pa", "60 Pa"],
    correct: 0,
    feedbackCorrect:
      "Klopt! Katwijk ligt in het kustgebied en daar waait het harder: gebied III is er 40 Pa (binnenland: 25 Pa). Ook IV en V zijn hoger aan de kust: 60 en 20 Pa.",
    feedbackWrong:
      "Katwijk ligt in het kustgebied (zie de kaart van Nederland): gebied III is daar 40 Pa. In het binnenland zou dat 25 Pa zijn; 60 Pa hoort bij gebied IV aan de kust.",
    hint: "Kust of binnenland? Katwijk ligt aan zee — en de kustwaarde is altijd de hoogste van de twee.",
    bron: "NPR 3378-60:2022, § 5.1.2 (drukwaarden) en bijlage B (figuur B.1)",
  },
];

const POOL_M2R1 = [
  {
    question: "Waarom bestaat de eis voor de verdunningsfactor?",
    options: [
      "Rookgas kan via een raam of ventilatierooster een gebouw binnenkomen — dat mag alleen als het sterk verdund is",
      "Omdat rookgas anders het afvoerkanaal verstopt",
      "Om energie te besparen bij het stoken",
      "Omdat rookgas anders condenseert op de gevel",
    ],
    correct: 0,
    feedbackCorrect:
      "Precies! Roosters en ramen zuigen buitenlucht naar binnen als 'verse' lucht. Zit daar rookgas bij, dan moet dat zo sterk verdund zijn dat het geen kwaad kan — daar is de verdunningsfactor de maat voor.",
    feedbackWrong:
      "Denk aan het rooster uit de sleepronde: dat zuigt buitenlucht naar binnen. Komt daar rookgas langs, dan mag dat alleen sterk verdund — daarvoor bestaat de verdunningsfactor.",
    hint: "Wat ging er mis in de sleepronde toen de uitmonding vlak bij het rooster hing?",
    bron: "NPR 3378-60:2022, § 9.1",
  },
  {
    question: "Wat is de verdunningsfactor f?",
    options: [
      "De maat voor hoe sterk rookgas is verdund op de plek waar het een raam of rooster bereikt",
      "De verhouding tussen het CV-vermogen en het tapvermogen",
      "De trek in het rookgasafvoerkanaal",
      "Het CO-gehalte in de ketel",
    ],
    correct: 0,
    feedbackCorrect:
      "Juist! Hoe kleiner f, hoe sterker het rookgas onderweg is verdund. De afstand (en het hoogteverschil) tussen uitmonding en rooster bepalen de verdunning.",
    feedbackWrong:
      "f zegt hoe sterk het rookgas is verdund als het bij een toevoeropening (raam of rooster) aankomt. Een klein getal = sterk verdund = goed.",
    hint: "Kijk naar het verkeerslicht-kaartje uit de sleepronde: daar stond het getal f, met de eis eronder.",
    bron: "NPR 3378-60:2022, § 9.1 en § 9.2",
  },
  {
    question: "Rookgas van jouw ketel drijft richting het ventilatierooster van de buren. Wanneer is dat toegestaan?",
    options: [
      "Als het rookgas daar zo verdund aankomt dat f kleiner is dan 0,01",
      "Nooit — rookgas mag geen rooster van een ander gebouw bereiken",
      "Alleen als het rooster hoger zit dan de uitmonding",
      "Alleen als de buren daar toestemming voor geven",
    ],
    correct: 0,
    feedbackCorrect:
      "Klopt! Je kunt niet voorkomen dat rookgas ooit een rooster bereikt — het moet daar alleen voldoende verdund zijn: f < 0,01.",
    feedbackWrong:
      "Het criterium is de verdunning: op het rooster moet f kleiner zijn dan 0,01. Volledig vermijden hoeft niet, en hoger of lager is niet het criterium.",
    hint: "Er is een getal dat hier alles bepaalt — welk getal was dat ook alweer?",
    bron: "NPR 3378-60:2022, § 9.1 en § 9.2",
  },
];

const POOL_M2R2 = [
  {
    question: "Welke eis geldt voor de verdunningsfactor f bij gasgestookte toestellen?",
    options: ["f moet kleiner zijn dan 0,01", "f moet groter zijn dan 0,01", "f moet kleiner zijn dan 0,1", "f moet precies 0 zijn"],
    correct: 0,
    feedbackCorrect: "Juist! De eis is f < 0,01 — altijd, voor alle gasgestookte toestellen. Dit is het getal om te onthouden.",
    feedbackWrong:
      "De eis is f < 0,01, voor alle gasgestookte toestellen gelijk. Kleiner dan dus — en precies 0 hoeft niet: volledig vermijden kan ook niet.",
    hint: "De eis is voor alle gasgestookte toestellen gelijk — het kleine getal dat in elke sleepronde onder het verkeerslicht stond.",
    bron: "NPR 3378-60:2022, § 9.1 en § 9.2 (eis verdunningsfactor)",
  },
  {
    question: "Wat gebeurt er met de verdunningsfactor als je de uitmonding verder van het ventilatierooster plaatst?",
    options: [
      "f wordt kleiner — meer afstand betekent meer verdunning",
      "f wordt groter",
      "f blijft gelijk — alleen het vermogen van de ketel telt",
      "f wordt onvoorspelbaar — alleen meten geeft uitsluitsel",
    ],
    correct: 0,
    feedbackCorrect:
      "Klopt! Onderweg mengt het rookgas zich met steeds meer buitenlucht: hoe verder van het rooster, hoe sterker verdund en hoe kleiner f. Ook een groter hoogteverschil helpt.",
    feedbackWrong:
      "Meer afstand = meer menging met buitenlucht = sterkere verdunning = kleinere f. Een groter hoogteverschil helpt ook.",
    hint: "Werd het verkeerslicht groener of juist roder toen je de uitmonding van het rooster wegschoof?",
    bron: "NPR 3378-60:2022, § 9.2",
  },
  {
    question: "Een zwaardere ketel heeft een hogere belasting (meer kW). Wat betekent dat voor de plaats van de uitmonding?",
    options: [
      "Er is meer afstand (of hoogteverschil) nodig om f onder 0,01 te krijgen",
      "De uitmonding mag juist dichter bij het rooster",
      "Het maakt niet uit — de eis hangt niet van het vermogen af",
      "Een zwaardere ketel mag niet in de gevel uitmonden",
    ],
    correct: 0,
    feedbackCorrect:
      "Juist! Meer vermogen betekent meer rookgas — er is dan meer afstand of hoogte nodig voordat f onder 0,01 zakt. Dat zag je bij de ketel van 40 kW.",
    feedbackWrong:
      "Meer kW betekent meer rookgas. Om dat even sterk te verdunnen is meer afstand of hoogteverschil nodig — de eis f < 0,01 zelf blijft gelijk.",
    hint: "Vergelijk de ketels van 24 en 40 kW uit de sleeprondes: welke had meer afstand nodig?",
    bron: "NPR 3378-60:2022, § 9.2",
  },
];

const POOL_M2R3 = [
  {
    question: "Met welke belasting reken je bij een combiketel voor de verdunningsfactor?",
    options: [
      "Het hoogste van: de volledige CV-belasting of 50% van de tapbelasting",
      "De CV-belasting en 50% van de tapbelasting bij elkaar opgeteld",
      "Altijd de volledige tapbelasting — die is het hoogst",
      "50% van beide belastingen",
    ],
    correct: 0,
    feedbackCorrect: "Correct! Vergelijk de volledige CV-belasting met de helft van de tapbelasting en reken met de hoogste van die twee.",
    feedbackWrong:
      "De 50%-regel: neem het maximum van de volledige CV-belasting of 50% van de tapbelasting. Niet optellen, en niet met de volle tapbelasting rekenen.",
    hint: "Niet optellen! Je vergelijkt twee waarden met elkaar en rekent met een ervan.",
    bron: "NPR 3378-60:2022, § 9.2 (berekening met 50% van de tapbelasting)",
  },
  {
    question: "Een combiketel heeft een CV-belasting van 20 kW en een tapbelasting van 28 kW. Met welke belasting reken je voor de verdunningsfactor?",
    options: ["20 kW", "28 kW", "14 kW", "48 kW"],
    correct: 0,
    feedbackCorrect: "Klopt! 50% van de tapbelasting = 14 kW; de CV-belasting (20 kW) is hoger — dus reken je met 20 kW.",
    feedbackWrong:
      "Vergelijk: CV = 20 kW tegenover 50% van tap = 14 kW. Het maximum van die twee telt: 20 kW. Nooit optellen (48 kW) en nooit met de volle tapbelasting rekenen.",
    hint: "Halveer eerst de tapbelasting en vergelijk die met de CV-belasting. De hoogste van de twee wint.",
    bron: "NPR 3378-60:2022, § 9.2 (berekening met 50% van de tapbelasting)",
  },
  {
    question: "Een combiketel heeft een CV-belasting van 10 kW en een tapbelasting van 30 kW. Met welke belasting reken je?",
    options: ["15 kW", "10 kW", "30 kW", "40 kW"],
    correct: 0,
    feedbackCorrect: "Juist! 50% van de tapbelasting = 15 kW, en dat is hoger dan de CV-belasting (10 kW) — dus reken je met 15 kW.",
    feedbackWrong:
      "50% van 30 = 15 kW; de CV-belasting is 10 kW. Het maximum is hier dus de gehalveerde tapbelasting: 15 kW. Niet de volle 30, en zeker niet optellen.",
    hint: "Soms wint de gehalveerde tapbelasting het van de CV-belasting — reken het maar na.",
    bron: "NPR 3378-60:2022, § 9.2 (berekening met 50% van de tapbelasting)",
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
// Kleurfamilies naar betekenis (collega-feedback): groen = drukvrij (I en II),
// geel naar rood = oplopende overdruk (V 12/20, III 25/40, IV 37/60 Pa).
const ZONE_KLEUR = {
  I: "#4A7C3F",   // groen — vrij gebied (0 Pa)
  II: "#7FA34D",  // lichtgroen — ook vrij, maar alleen met stabiliserende kap (0 Pa)
  III: "#E67E22", // oranje — 25/40 Pa
  IV: "#C0392B",  // rood — 37/60 Pa (hoogste overdruk)
  V: "#D9A93A",   // amber — 12/20 Pa (laagste overdruk)
};

// Neutrale arcering: in ronde 1 zijn alle zones tijdens het slepen deze kleur,
// zodat de cursist op vorm en positie kiest, niet op kleur. De gebiedskleur
// verschijnt pas na een goede plaatsing (collega-feedback: 'ik speel op kleur').
const ZONE_NEUTRAAL = "#9C8B6E";

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

// Compacte samenvatting van figuur 2a en 2b: twee mini-schema's met dezelfde
// topologie als de grote figuren — gebied I boven de 10°-lijn, de wig boven de
// nok (II bij ≥ 15 m, V bij < 15 m) en het gebied eronder (III resp. IV).
function AfbGebiedenKlein() {
  const Chip = ({ id, x, y }) => (
    <g>
      <rect x={x} y={y} width="38" height="20" rx="6" fill={`url(#mz-${id})`} stroke={ZONE_KLEUR[id]} strokeWidth="1.2" />
      <text x={x + 19} y={y + 14} fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brownText} textAnchor="middle">
        {id}
      </text>
    </g>
  );
  return (
    <svg width="420" height="196" viewBox="0 0 420 196">
      <defs>
        {["I", "II", "III", "IV", "V"].map((z) => (
          <ZonePatroon key={z} id={`mz-${z}`} kleur={ZONE_KLEUR[z]} />
        ))}
      </defs>
      <Grond x1={6} x2={414} y={170} />
      {/* links: figuur 2a — belendende bebouwing op ≥ 15 m */}
      <rect x="11" y="45" width="36" height="7" fill={C.bgCard} stroke={C.brownText} strokeWidth="1.5" />
      <rect x="14" y="52" width="30" height="118" fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      <rect x="120" y="126" width="64" height="44" fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      <polygon points="114,126 150,102 190,126" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2" />
      <line x1="44" y1="48" x2="196" y2="75" stroke={C.brown} strokeWidth="1.2" strokeDasharray="6,4" />
      <Chip id="I" x={148} y={24} />
      <Chip id="II" x={130} y={76} />
      <Chip id="III" x={58} y={94} />
      <text x="105" y="190" fontSize="9" fontWeight="700" fill={C.brown} textAnchor="middle">≥ 15 m</text>
      {/* scheidingslijn */}
      <line x1="209" y1="18" x2="209" y2="168" stroke={C.brown} strokeWidth="1" strokeDasharray="3,4" opacity="0.5" />
      {/* rechts: figuur 2b — belendende bebouwing op < 15 m */}
      <rect x="219" y="37" width="36" height="7" fill={C.bgCard} stroke={C.brownText} strokeWidth="1.5" />
      <rect x="222" y="44" width="30" height="126" fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      <rect x="330" y="126" width="64" height="44" fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      <polygon points="324,126 360,102 400,126" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2" />
      <line x1="252" y1="40" x2="406" y2="67" stroke={C.brown} strokeWidth="1.2" strokeDasharray="6,4" />
      <Chip id="I" x={356} y={14} />
      <Chip id="V" x={340} y={76} />
      <Chip id="IV" x={268} y={94} />
      <text x="315" y="190" fontSize="9" fontWeight="700" fill={C.brown} textAnchor="middle">&lt; 15 m</text>
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
      <path d="M 296 120 A 26 26 0 0 1 302 105" fill="none" stroke={C.brownText} strokeWidth="1" />
      <text x="252" y="112" fontSize="10" fontWeight="700" fontStyle="italic" fill={C.brownText}>α ≥ 23°</text>
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
      {/* 10°-belemmeringslijn (diagonaal in het zijaanzicht) en afstandsmaat */}
      <line x1="85" y1="46" x2="320" y2="-10" stroke={C.brown} strokeWidth="1" strokeDasharray="5,4" />
      <text x="150" y="28" fontSize="9" fontWeight="700" fill={C.brown}>10°</text>
      <line x1="136" y1="170" x2="250" y2="170" stroke={C.red} strokeWidth="1" />
      <polygon points="139,167 139,173 133,170" fill={C.red} />
      <polygon points="247,167 247,173 253,170" fill={C.red} />
      <text x="193" y="166" fontSize="11" fontWeight="700" fill={C.red} textAnchor="middle">? m</text>
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

// Scene 1a: plat dak — nagebouwd naar NPR figuur 1a (gebieden I en III)
function ScenePlatDak({ onthuld }) {
  const dakY = 150;   // bovenkant plat dak
  const lijnY = 130;  // het 0,5 m-vlak (0,5 m = 20 px)
  const L = 140, R = 450;
  const k = (z) => (!onthuld || onthuld.includes(z) ? ZONE_KLEUR[z] : ZONE_NEUTRAAL);
  return (
    <svg width={560} height={360} viewBox="0 0 560 360" className="absolute inset-0">
      <defs>
        <ZonePatroon id="pd-I" kleur={k("I")} />
        <ZonePatroon id="pd-III" kleur={k("III")} />
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

// Scene figuur 1b: schuin dak α < 23° — nagebouwd naar NPR figuur 1b.
// Flauw dak, EEN rookgasafvoer op het LINKER dakvlak met een witte rookpluim.
// Gebied III = een band van 0,5 m (verticaal gemeten) die het HELE dak volgt,
// ook over de nok, en voorbij de dakvoeten horizontaal doorloopt. Gebied I =
// alles daarboven. Rechts de 0,5 m-maat tussen de twee bandranden.
function SceneSchuinDakB({ onthuld }) {
  const k = (z) => (!onthuld || onthuld.includes(z) ? ZONE_KLEUR[z] : ZONE_NEUTRAAL);
  return (
    <svg width={560} height={420} viewBox="0 0 560 420" className="absolute inset-0">
      <defs>
        <ZonePatroon id="psb-I" kleur={k("I")} />
        <ZonePatroon id="psb-III" kleur={k("III")} />
      </defs>
      {/* gebied I: alles boven de 0,5 m-band */}
      <polygon points="40,20 495,20 495,236 410,236 290,202 170,236 40,236" fill="url(#psb-I)" />
      {/* gebied III: 0,5 m-band die het dak volgt (ook over de nok en voorbij de dakvoeten) */}
      <polygon points="40,236 170,236 290,202 410,236 495,236 495,252 410,252 290,218 170,252 40,252" fill="url(#psb-III)" stroke={k("III")} strokeWidth="0.6" strokeOpacity="0.5" />
      {/* witte rookpluim boven de doorvoer (uitsparing in de arcering) */}
      <g fill={C.bgCard}>
        <ellipse cx="250" cy="190" rx="8" ry="7" />
        <ellipse cx="258" cy="176" rx="10" ry="8" />
        <ellipse cx="251" cy="161" rx="8" ry="7" />
      </g>
      {/* maaiveld */}
      <Grond x1={60} x2={510} y={380} />
      {/* gevel met ramen en deur */}
      <rect x="170" y="252" width="240" height="128" fill={C.bgCard} stroke={C.brownText} strokeWidth="2.5" />
      <GevelRamen x={190} y={262} />
      <LiggendRaam x={320} y={268} />
      <GevelRamen x={190} y={322} />
      <Deur x={330} y={310} h={70} />
      {/* flauw schuin dak (α < 23°), symmetrisch */}
      <polygon points="170,252 290,218 410,252" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2.5" />
      {/* een rookgasafvoer op het linker dakvlak, door de band heen */}
      <PijpMetRook cx={245} top={205} voetY={232} w={13} rook={false} />
      {/* 0,5 m-maat rechts: tussen de onder- en bovenrand van de band */}
      <line x1="410" y1="236" x2="530" y2="236" stroke={C.brownText} strokeWidth="1" />
      <line x1="410" y1="252" x2="530" y2="252" stroke={C.brownText} strokeWidth="1" />
      <line x1="516" y1="220" x2="516" y2="236" stroke={C.brownText} strokeWidth="1" />
      <line x1="516" y1="268" x2="516" y2="252" stroke={C.brownText} strokeWidth="1" />
      <polygon points="513,230 519,230 516,236" fill={C.brownText} />
      <polygon points="513,258 519,258 516,252" fill={C.brownText} />
      <text transform="rotate(-90 542 244)" x="542" y="244" fontSize="10" fontWeight="700" fill={C.brownText} textAnchor="middle">0,5 m</text>
      {/* hellingshoek α halverwege het rechter dakvlak */}
      <path d="M 366 252 A 40 40 0 0 1 357 237" fill="none" stroke={C.brownText} strokeWidth="1.2" />
      <text x="314" y="247" fontSize="12" fontWeight="700" fontStyle="italic" fill={C.brownText}>α &lt; 23°</text>
      <text x="290" y="404" fontSize="11" fontStyle="italic" fontWeight="600" fill={C.brown} textAnchor="middle">schuin dak α &lt; 23°</text>
    </svg>
  );
}

// Scene figuur 1c: schuin dak α ≥ 23° — nagebouwd naar NPR figuur 1c.
// Gebied I = de 'trechter' boven de nok: een horizontale bodem op hmin boven de
// nok, met twee steile randen die naar boven uitwaaieren. De lange schoorsteen
// (op 0,8 m van de nok) en de korte nokdoorvoer staan er allebei IN, elk met een
// witte rookpluim. Gebied III = alles buiten de trechter, tot op de dakvlakken.
// Rechts de hmin-maat als witte strook tussen noklijn en trechterbodem.
function SceneSchuinDak({ onthuld, kaal = false }) {
  const k = (z) => (!onthuld || onthuld.includes(z) ? ZONE_KLEUR[z] : ZONE_NEUTRAAL);
  return (
    <svg width={560} height={420} viewBox="0 0 560 420" className="absolute inset-0">
      <defs>
        <ZonePatroon id="ps-I" kleur={k("I")} />
        <ZonePatroon id="ps-III" kleur={k("III")} />
      </defs>
      {!kaal && (
        <>
          {/* gebied III: buiten de trechter, links en rechts tot op het dak */}
          <polygon points="40,20 175,20 221,86 221,190 158,252 40,252" fill="url(#ps-III)" strokeOpacity="0" />
          <polygon points="367,20 500,20 500,252 422,252 292,155 292,128" fill="url(#ps-III)" strokeOpacity="0" />
          {/* gebied I: de trechter boven de nok — smalle steile V (±55°), bodem = hmin boven de nok */}
          <polygon points="175,20 367,20 292,128 221,128 221,86" fill="url(#ps-I)" stroke={k("I")} strokeWidth="0.6" strokeOpacity="0.5" />
          {/* dunne witte hmin-strook: tussen trechterbodem en noklijn */}
          <rect x="278" y="128" width="252" height="12" fill={C.bgCard} />
          {/* witte rookpluimen boven beide doorvoeren */}
          <g fill={C.bgCard}>
            <ellipse cx="233" cy="62" rx="8" ry="7" />
            <ellipse cx="242" cy="49" rx="10" ry="8" />
            <ellipse cx="277" cy="108" rx="7" ry="6" />
            <ellipse cx="285" cy="95" rx="9" ry="7" />
          </g>
        </>
      )}
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
      {!kaal && (
        <>
          {/* hmin-maatlijnen: bovenrand = trechterbodem, onderrand = nokniveau */}
          <line x1="221" y1="128" x2="530" y2="128" stroke={C.brownText} strokeWidth="1" />
          <line x1="272" y1="140" x2="530" y2="140" stroke={C.brownText} strokeWidth="1" />
          <line x1="516" y1="110" x2="516" y2="128" stroke={C.brownText} strokeWidth="1" />
          <line x1="516" y1="158" x2="516" y2="140" stroke={C.brownText} strokeWidth="1" />
          <polygon points="513,122 519,122 516,128" fill={C.brownText} />
          <polygon points="513,146 519,146 516,140" fill={C.brownText} />
          <text transform="rotate(-90 544 134)" x="544" y="134" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brownText} textAnchor="middle">
            h<tspan fontSize="7" dy="3">min</tspan>
          </text>
        </>
      )}
      {/* lange schoorsteen op 0,8 m van de nok — reikt tot in de trechter (gebied I) */}
      <PijpMetRook cx={228} top={76} voetY={188} w={14} rook={false} />
      {/* korte doorvoer in de nok: hoeft maar hmin boven de nok uit te steken */}
      <PijpMetRook cx={272} top={122} voetY={148} w={12} rook={false} />
      {/* 0,8 m-maat tussen schoorsteen en nok */}
      <line x1="228" y1="192" x2="228" y2="244" stroke={C.brownText} strokeWidth="1" />
      <line x1="272" y1="152" x2="272" y2="244" stroke={C.brownText} strokeWidth="1" />
      <line x1="228" y1="240" x2="272" y2="240" stroke={C.brownText} strokeWidth="1" />
      <polygon points="234,237 234,243 227,240" fill={C.brownText} />
      <polygon points="266,237 266,243 273,240" fill={C.brownText} />
      <text x="220" y="244" fontSize="10" fontWeight="700" fill={C.brownText} textAnchor="end">0,8 m</text>
      {/* hellingshoek α aan de rechterdakvoet */}
      <path d="M 382 252 A 40 40 0 0 1 390 228" fill="none" stroke={C.brownText} strokeWidth="1.2" />
      <line x1="352" y1="252" x2="422" y2="252" stroke={C.brownText} strokeWidth="1" />
      <text x="338" y="244" fontSize="12" fontWeight="700" fontStyle="italic" fill={C.brownText}>α ≥ 23°</text>
      <text x="290" y="404" fontSize="11" fontStyle="italic" fontWeight="600" fill={C.brown} textAnchor="middle">schuin dak α ≥ 23°</text>
    </svg>
  );
}

// Figuur 2 gesplitst in twee aparte figuren (kun je niet in een plaatje vatten):
//  - 2a: belendende bebouwing op ≥ 15 m → gebieden I, II, III
//  - 2b: belendende bebouwing op < 15 m → gebieden I, IV, V
const ZONES_2A = [
  { id: "I", x: 548, y: 114, w: 100, h: 28 },
  { id: "II", x: 528, y: 164, w: 62, h: 28 },
  { id: "III", x: 600, y: 184, w: 76, h: 48 },
];
const ZONES_2B = [
  { id: "I", x: 552, y: 98, w: 88, h: 36 },
  { id: "V", x: 528, y: 168, w: 68, h: 28 },
  { id: "IV", x: 630, y: 206, w: 50, h: 44 },
];

// Doorvoer met stabiliserende kap zoals in NPR figuur 2: kastje met kruis dat
// onder de daklijn hangt, dunne pijp omhoog met alleen een mondkap (geen pijl).
function KapPijp({ cx, boxTop, mondY }) {
  const bw = 26;
  const bh = 24;
  return (
    <g>
      <rect x={cx - 5} y={mondY} width={10} height={boxTop - mondY} fill="#FFFFFF" stroke={C.brownText} strokeWidth="2" />
      <line x1={cx - 9} y1={mondY} x2={cx + 9} y2={mondY} stroke={C.brownText} strokeWidth="2" />
      <rect x={cx - bw / 2} y={boxTop} width={bw} height={bh} fill="#FFFFFF" stroke={C.brownText} strokeWidth="2" />
      <line x1={cx - bw / 2} y1={boxTop} x2={cx + bw / 2} y2={boxTop + bh} stroke={C.brownText} strokeWidth="1.1" />
      <line x1={cx - bw / 2} y1={boxTop + bh} x2={cx + bw / 2} y2={boxTop} stroke={C.brownText} strokeWidth="1.1" />
    </g>
  );
}

// Gedeelde onderdelen van figuur 2a/2b, exact naar de NPR: breed hoog belendend
// gebouw links (kaal, met dakrand), klein eigen huis rechts met flauw schuin dak
// (nok 562,240; dakvoeten 476,286 en 642,286) en het bijschrift "schuin dak
// α ≥ 23°" in de gevel (zoals de NPR — geen ramen/deur), maaiveld en de
// afstandsmaat van het gebouw tot de UITMONDING. Canvas 760×470.
function Fig2Basis({ belX, belW, belTop, pijpX, maatLabel, children }) {
  const belR = belX + belW;
  return (
    <>
      {/* maaiveld */}
      <Grond x1={20} x2={740} y={430} />
      {/* belendende bebouwing: breed en hoog, met dakrand */}
      <rect x={belX - 6} y={belTop - 8} width={belW + 12} height={8} fill={C.bgCard} stroke={C.brownText} strokeWidth="2" />
      <rect x={belX} y={belTop} width={belW} height={430 - belTop} fill={C.bgCard} stroke={C.brownText} strokeWidth="2.5" />
      <text x={belX + belW / 2} y={246} fontSize="11" fontWeight="700" fill={C.brown} textAnchor="middle">belendende</text>
      <text x={belX + belW / 2} y={260} fontSize="11" fontWeight="700" fill={C.brown} textAnchor="middle">bebouwing</text>
      {/* eigen gebouw: kaal zoals NPR figuur 2, met het bijschrift in de gevel */}
      <rect x="484" y="286" width="150" height="144" fill={C.bgCard} stroke={C.brownText} strokeWidth="2.5" />
      <polygon points="476,286 562,240 642,286" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2.5" />
      <text x="559" y="356" fontSize="11" fontWeight="600" fill={C.brown} textAnchor="middle">schuin dak</text>
      <text x="559" y="372" fontSize="11" fontWeight="600" fontStyle="italic" fill={C.brown} textAnchor="middle">α ≥ 23°</text>
      {children}
      {/* afstandsmaat: van het belendende gebouw tot de UITMONDING (meetlijn door de pijp, zoals NPR) */}
      <line x1={pijpX} y1="250" x2={pijpX} y2="446" stroke={C.brown} strokeWidth="1" />
      <line x1={belR} y1="440" x2={pijpX} y2="440" stroke={C.brown} strokeWidth="1.2" />
      <line x1={belR} y1="434" x2={belR} y2="446" stroke={C.brown} strokeWidth="1.2" />
      <polygon points={`${belR + 7},437 ${belR + 7},443 ${belR + 1},440`} fill={C.brown} />
      <polygon points={`${pijpX - 7},437 ${pijpX - 7},443 ${pijpX - 1},440`} fill={C.brown} />
      <text x={(belR + pijpX) / 2} y="458" fontSize="11" fontWeight="700" fill={C.brown} textAnchor="middle">{maatLabel}</text>
    </>
  );
}

// Figuur 2a, exact naar de NPR: belendende bebouwing op ≥ 15 m. Gebied II = de
// wig hoog boven de nok, met de top op de 10°-lijn en de punt op de mond van een
// LANGE nokdoorvoer. Aan BEIDE kanten van de wig, onder de 10°-lijn en tot op de
// dakvlakken, ligt gebied III. Gebied I ligt BOVEN de 10°-lijn (vanaf de wig, met
// horizontale bovenrand; links daarvan is het wit). De kap-pijp staat op het
// linker dakvlak met een witte pluimstrook; de ≥ 15 m wordt tot die uitmonding
// gemeten.
function SceneFig2A({ kapOpNok = false, onthuld, kaal = false }) {
  const t = (x) => 100 + 0.176 * (x - 300); // 10°-lijn vanaf de dakrand (300,100)
  const k = (z) => (!onthuld || onthuld.includes(z) ? ZONE_KLEUR[z] : ZONE_NEUTRAAL);
  return (
    <svg width={760} height={470} viewBox="0 0 760 470" className="absolute inset-0">
      <defs>
        <ZonePatroon id="f2a-I" kleur={k("I")} />
        <ZonePatroon id="f2a-II" kleur={k("II")} />
        <ZonePatroon id="f2a-III" kleur={k("III")} />
      </defs>
      {!kaal && (
        <>
          {/* gebied III: het hele veld onder de 10°-lijn, aan beide kanten van de wig,
              tot op een smalle WITTE band boven de dakvlakken (rechts doorlopend voorbij de dakvoet) */}
          <polygon points={`450,${t(450)} 680,${t(680)} 680,292 663,292 562,234 476,280 476,286 450,286`} fill="url(#f2a-III)" />
          {/* gebied I: boven de 10°-lijn, vanaf de wig tot de rechter veldrand, met horizontale bovenrand */}
          <polygon points={`507,110 680,110 680,${t(680)} 507,${t(507)}`} fill="url(#f2a-I)" />
          {/* gebied II: wig boven de nok met afgeknotte voet, top op de 10°-lijn */}
          <polygon points={`507,${t(507)} 607,${t(607)} 577,226 537,226`} fill={C.bgCard} />
          <polygon points={`507,${t(507)} 607,${t(607)} 577,226 537,226`} fill="url(#f2a-II)" stroke={k("II")} strokeWidth="0.6" strokeOpacity="0.5" />
          {/* sleutelgat-uitsparing in de wigvoet, rond de kap van de nokdoorvoer */}
          <rect x="543" y="210" width="29" height="17" fill={C.bgCard} />
          {/* wit pluimkanaal boven de kap-pijp: breed, naar beneden versmallend, eindigt onder de 10°-lijn */}
          <polygon points="491,173 519,173 511,231 499,231" fill={C.bgCard} />
        </>
      )}
      <Fig2Basis belX={136} belW={158} belTop={104} pijpX={505} maatLabel="≥ 15 m">
        {/* lange nokdoorvoer: kanaal onder de nok, brede kap die in de wigvoet steekt; rechterrand op de nok */}
        <rect x="541" y="266" width="28" height="30" fill="#FFFFFF" stroke={C.brownText} strokeWidth="2" />
        <rect x="552" y="212" width="10" height="56" fill="#FFFFFF" stroke={C.brownText} strokeWidth="2" />
        <rect x="547" y="202" width="20" height="10" fill="#FFFFFF" stroke={C.brownText} strokeWidth="2" />
        {/* stabiliserende kap op de nokdoorvoer (verschijnt als B11 in gebied II wordt
            geplaatst) — groot en met label, zodat het lesmoment niet te missen is */}
        {kapOpNok && (
          <g style={{ animation: "kapVerschijnt 0.6s ease-out" }}>
            <rect x="540" y="184" width="34" height="18" fill="#FFFFFF" stroke={C.brownText} strokeWidth="2.2" />
            <line x1="540" y1="184" x2="574" y2="202" stroke={C.brownText} strokeWidth="1.2" />
            <line x1="540" y1="202" x2="574" y2="184" stroke={C.brownText} strokeWidth="1.2" />
            <line x1="576" y1="190" x2="614" y2="172" stroke={C.green} strokeWidth="1.4" />
            <rect x="614" y="156" width="132" height="20" rx="4" fill={C.bgCard} stroke={C.green} strokeWidth="1.5" />
            <text x="680" y="170" fontSize="11" fontWeight="700" fill={C.green} textAnchor="middle">stabiliserende kap!</text>
          </g>
        )}
        {/* kap-pijp op het linker dakvlak */}
        <KapPijp cx={505} boxTop={278} mondY={231} />
        {/* hellingshoek α aan de rechterdakvoet */}
        <line x1="588" y1="286" x2="642" y2="286" stroke={C.brownText} strokeWidth="1" />
        <path d="M 630 286 A 26 26 0 0 1 620 274" fill="none" stroke={C.brownText} strokeWidth="1.2" />
        <text x="606" y="281" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brownText}>α</text>
      </Fig2Basis>
      {!kaal && (
        <>
          {/* 10°-lijn: gestreept vanaf de dakrand tot de wig, en verder als grens I/III rechts van de wig */}
          <line x1="300" y1="100" x2="507" y2={t(507)} stroke={C.brown} strokeWidth="1.5" strokeDasharray="7,5" />
          <line x1="607" y1={t(607)} x2="680" y2={t(680)} stroke={C.brown} strokeWidth="1.5" strokeDasharray="7,5" />
          <line x1="300" y1="100" x2="374" y2="100" stroke={C.brown} strokeWidth="1" />
          <path d={`M 360 100 A 28 28 0 0 1 357 ${t(357).toFixed(0)}`} fill="none" stroke={C.brown} strokeWidth="1.2" />
          <text x="364" y="93" fontSize="10" fontWeight="700" fill={C.brown}>10°</text>
        </>
      )}
    </svg>
  );
}

// Figuur 2b, exact naar de NPR: belendende bebouwing op < 15 m (hoger en
// dichterbij). Gebied I ligt nu BOVEN de 10°-lijn; daaronder is alles verstoord:
// gebied V = de grote omgekeerde driehoek boven de nok (afgeknotte punt), gebied
// IV = de rest langs beide dakvlakken. Een kap-pijp op het rechter dakvlak met
// witte pluim; de < 15 m wordt tot die uitmonding gemeten.
function SceneFig2B({ onthuld }) {
  const t = (x) => 118 + 0.176 * (x - 378); // 10°-lijn vanaf de dakrand (378,118)
  const k = (z) => (!onthuld || onthuld.includes(z) ? ZONE_KLEUR[z] : ZONE_NEUTRAAL);
  return (
    <svg width={760} height={470} viewBox="0 0 760 470" className="absolute inset-0">
      <defs>
        <ZonePatroon id="f2b-I" kleur={k("I")} />
        <ZonePatroon id="f2b-IV" kleur={k("IV")} />
        <ZonePatroon id="f2b-V" kleur={k("V")} />
      </defs>
      {/* gebied I: boven de 10°-lijn, over de volle veldbreedte */}
      <polygon points={`450,92 680,92 680,${t(680)} 450,${t(450)}`} fill="url(#f2b-I)" />
      {/* gebied IV: alles onder de 10°-lijn, tot op een smalle WITTE band boven de
          dakvlakken (rechts doorlopend voorbij de dakvoet) */}
      <polygon points={`450,${t(450)} 680,${t(680)} 680,292 663,292 562,234 476,280 476,286 450,286`} fill="url(#f2b-IV)" />
      {/* gebied V: grote omgekeerde driehoek boven de nok, met afgeknotte voet */}
      <polygon points={`503,${t(503)} 620,${t(620)} 586,221 538,221`} fill={C.bgCard} />
      <polygon points={`503,${t(503)} 620,${t(620)} 586,221 538,221`} fill="url(#f2b-V)" stroke={k("V")} strokeWidth="0.6" strokeOpacity="0.5" />
      {/* sleutelgat-uitsparing in de V-voet + witte ruimte tussen voet en nok */}
      <rect x="549" y="210" width="24" height="12" fill={C.bgCard} />
      <rect x="538" y="221" width="48" height="14" fill={C.bgCard} />
      {/* witte rookpluim boven de kap-pijp: een aaneengesloten pluim */}
      <g fill={C.bgCard}>
        <ellipse cx="617" cy="225" rx="8" ry="8" />
        <ellipse cx="621" cy="212" rx="9" ry="9" />
        <ellipse cx="617" cy="199" rx="8" ry="8" />
        <ellipse cx="622" cy="187" rx="7" ry="7" />
      </g>
      <Fig2Basis belX={214} belW={158} belTop={122} pijpX={612} maatLabel="< 15 m">
        {/* kap-pijp op het rechter dakvlak, kanaal onder de daklijn */}
        <KapPijp cx={612} boxTop={296} mondY={234} />
        {/* hellingshoek α aan de linkerdakvoet */}
        <line x1="476" y1="286" x2="538" y2="286" stroke={C.brownText} strokeWidth="1" />
        <path d="M 524 286 A 38 38 0 0 0 510 268" fill="none" stroke={C.brownText} strokeWidth="1.2" />
        <text x="528" y="278" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brownText}>α</text>
      </Fig2Basis>
      {/* 10°-lijn: gestreept vanaf de dakrand tot de V, en verder als grens I/IV rechts van de V */}
      <line x1="378" y1="118" x2="503" y2={t(503)} stroke={C.brown} strokeWidth="1.5" strokeDasharray="7,5" />
      <line x1="620" y1={t(620)} x2="680" y2={t(680)} stroke={C.brown} strokeWidth="1.5" strokeDasharray="7,5" />
      <line x1="378" y1="118" x2="442" y2="118" stroke={C.brown} strokeWidth="1" />
      <path d={`M 430 118 A 26 26 0 0 1 427 ${t(427).toFixed(0)}`} fill="none" stroke={C.brown} strokeWidth="1.2" />
      <text x="434" y="110" fontSize="10" fontWeight="700" fill={C.brown}>10°</text>
    </svg>
  );
}

function M1R1({ onComplete, addScore, badDrop }) {
  const [stap, setStap] = useState(0); // 0=plat 1=schuin<23 2=schuin>=23 3=fig2a 4=fig2b
  const [zones, setZones] = useState({});
  const [hint, setHint] = useState(null);
  const [popup, setPopup] = useState(null);
  const [constructieOk, setConstructieOk] = useState(false);

  // zones die al goed geplaatst zijn, krijgen hun gebiedskleur; de rest blijft
  // neutraal gearceerd zodat de cursist op vorm kiest, niet op kleur
  const onthuld = Object.values(zones).map((v) => v.split(" ")[1]);

  const stappen = [
    {
      titel: "Plat dak",
      uitleg:
        "Vrijstaande woning met plat dak, geen belendende bebouwing (figuur 1a uit de NPR). Het vlak op 0,5 m boven het dak is de grens. Sleep de zone-labels naar de gearceerde gebieden — na een goede plaatsing kleurt het gebied.",
      sceneW: 560,
      sceneH: 360,
      scene: <ScenePlatDak onthuld={onthuld} />,
      drops: [
        { id: "plat-I", rect: { x: 215, y: 44, w: 150, h: 66 }, expected: "Gebied I", tooltip: OVERDRUK.I },
        { id: "plat-III", rect: { x: 450, y: 152, w: 104, h: 44 }, expected: "Gebied III", tooltip: OVERDRUK.III },
      ],
      labels: ["Gebied I", "Gebied III"],
      hints: {
        "Gebied I": "Gebied I is het vrije gebied: alles vanaf 0,5 m boven het platte dak — het grote vlak bovenin.",
        "Gebied III": "Gebied III is de dunne strook tussen het dakvlak en het 0,5 m-vlak — daar wijst de 0,5 m-maat naartoe.",
      },
    },
    {
      titel: "Schuin dak (α < 23°)",
      uitleg:
        "Dezelfde vrijstaande woning, nu met een flauw hellend dak (figuur 1b) — nog steeds geen belendende bebouwing. De grens van 0,5 m volgt nu het dak als een band. Sleep de labels naar de juiste plek.",
      sceneW: 560,
      sceneH: 420,
      scene: <SceneSchuinDakB onthuld={onthuld} />,
      drops: [
        { id: "schuinb-I", rect: { x: 340, y: 32, w: 110, h: 46 }, expected: "Gebied I", tooltip: OVERDRUK.I },
        { id: "schuinb-III", rect: { x: 46, y: 227, w: 110, h: 30 }, expected: "Gebied III", tooltip: OVERDRUK.III },
      ],
      labels: ["Gebied I", "Gebied III"],
      hints: {
        "Gebied I": "Gebied I is het vrije gebied: alles boven de 0,5 m-band die het dak volgt.",
        "Gebied III": "Gebied III is de band van 0,5 m die het hele dak volgt — ook over de nok en voorbij de dakvoet.",
      },
    },
    {
      titel: "Schuin dak (α ≥ 23°)",
      uitleg:
        "Vrijstaande woning met een steil dak (figuur 1c), geen belendende bebouwing. Boven de nok geldt een minimumhoogte hmin — daaruit ontstaat een trechtervorm. Let op de twee doorvoeren: een op 0,8 m van de nok en een in de nok.",
      sceneW: 560,
      sceneH: 420,
      scene: <SceneSchuinDak onthuld={onthuld} kaal={!constructieOk} />,
      constructie: {
        vraag: "Eerst zelf construeren: waar begint het vrije gebied I bij dit steile dak? Klik op de juiste grenslijn (A, B of C).",
        kandidaten: [
          {
            id: "A",
            d: "M 158 232 L 272 120 L 422 232",
            label: { x: 140, y: 222 },
            feedback: "Dat is de 0,5 m-band van een flauw dak (α < 23°) — bij een steil dak geldt die niet meer.",
          },
          {
            id: "B",
            d: "M 175 20 L 221 86 L 221 128 L 292 128 L 367 20",
            label: { x: 316, y: 58 },
            juist: true,
            feedback:
              "Juist! Boven de nok geldt eerst de minimumhoogte hmin; daarvandaan waaiert het vrije gebied als een trechter naar boven open. Alles daarbuiten, tot op de dakvlakken, is gebied III. Sleep nu de labels.",
          },
          {
            id: "C",
            d: "M 110 140 L 460 140",
            label: { x: 96, y: 132 },
            feedback: "Op nokhoogte zelf is het nog niet vrij: er geldt eerst een minimumhoogte (hmin) boven de nok.",
          },
        ],
      },
      drops: [
        { id: "schuin-I", rect: { x: 232, y: 26, w: 96, h: 40 }, expected: "Gebied I", tooltip: OVERDRUK.I },
        { id: "schuin-III", rect: { x: 404, y: 178, w: 92, h: 44 }, expected: "Gebied III", tooltip: OVERDRUK.III },
      ],
      labels: ["Gebied I", "Gebied III"],
      hints: {
        "Gebied I": "Bij een schuin dak ≥ 23° is gebied I de 'trechter' boven de nok — binnen 0,8 m van de nok volstaat hmin boven de nok.",
        "Gebied III": "Gebied III is alles buiten de trechter, tot op de dakvlakken — hoe verder van de nok, hoe hoger de schoorsteen moet zijn.",
      },
    },
    {
      titel: "Belendende bebouwing op ≥ 15 m",
      uitleg:
        "Nu komt er wel belendende bebouwing bij: een buurgebouw op ten minste 15 m (figuur 2a). Onder de 10°-lijn verstoort het gebouw de wind; er gelden nu drie gebieden: I, II en III.",
      sceneW: 760,
      sceneH: 470,
      scene: <SceneFig2A onthuld={onthuld} kaal={!constructieOk} />,
      constructie: {
        vraag: "Eerst zelf construeren: vanaf de dakrand van het buurgebouw loopt de grens van het vrije gebied. Klik op de juiste lijn (A, B of C).",
        kandidaten: [
          {
            id: "A",
            d: "M 300 100 L 680 100",
            label: { x: 700, y: 100 },
            feedback: "De invloed van het buurgebouw neemt met de afstand af — de grens loopt met 10° omlaag, niet horizontaal.",
          },
          {
            id: "B",
            d: "M 300 100 L 680 167",
            label: { x: 700, y: 172 },
            juist: true,
            feedback:
              "Juist! Dit is de 10°-lijn: vanaf de dakrand van het buurgebouw loopt hij met 10° omlaag richting de woning. Erboven is de wind ongestoord (gebied I); eronder verstoort het buurgebouw de afvoer. Sleep nu de labels.",
          },
          {
            id: "C",
            d: "M 300 100 L 540 340",
            label: { x: 556, y: 344 },
            feedback: "Te steil: de verstoring van een gebouw reikt veel verder dan 45° — de grens daalt met maar 10°.",
          },
        ],
      },
      drops: ZONES_2A.map((z) => ({
        id: `f2a-${z.id}`,
        rect: { x: z.x, y: z.y, w: z.w, h: z.h },
        expected: `Gebied ${z.id}`,
        tooltip: OVERDRUK[z.id],
      })),
      labels: ["Gebied I", "Gebied II", "Gebied III"],
      hints: {
        "Gebied I": "Gebied I ligt boven de 10°-lijn (0 Pa).",
        "Gebied II": "Gebied II is de wig boven de nok (0 Pa), met de top op de 10°-lijn.",
        "Gebied III": "Gebied III ligt onder de 10°-lijn, aan beide kanten van de wig, tot op de dakvlakken (25/40 Pa).",
      },
    },
    {
      titel: "Belendende bebouwing op < 15 m",
      uitleg:
        "Zelfde situatie, maar het buurpand staat nu dichterbij dan 15 m (figuur 2b): de verstoring reikt hoger en de gebieden worden strenger: I, IV en V.",
      sceneW: 760,
      sceneH: 470,
      scene: <SceneFig2B onthuld={onthuld} />,
      drops: ZONES_2B.map((z) => ({
        id: `f2b-${z.id}`,
        rect: { x: z.x, y: z.y, w: z.w, h: z.h },
        expected: `Gebied ${z.id}`,
        tooltip: OVERDRUK[z.id],
      })),
      labels: ["Gebied I", "Gebied IV", "Gebied V"],
      hints: {
        "Gebied I": "Gebied I ligt nu BOVEN de 10°-lijn (0 Pa) — dichterbij betekent dat de verstoring hoger reikt.",
        "Gebied IV": "Gebied IV is alles onder de 10°-lijn langs de dakvlakken — daar is de overdruk het hoogst (37/60 Pa).",
        "Gebied V": "Gebied V is de grote omgekeerde driehoek boven de nok, onder de 10°-lijn (12/20 Pa).",
      },
    },
  ];

  const s = stappen[stap];
  const klaar = s.drops.every((d) => zones[d.id]);
  const inConstructie = !!s.constructie && !constructieOk;

  const klikKandidaat = (kd, point) => {
    if (kd.juist) {
      playSound("drop");
      addScore(5, point);
      setHint(null);
      setPopup({
        type: "correct",
        text: kd.feedback,
        next: () => {
          setPopup(null);
          setConstructieOk(true);
        },
      });
    } else {
      badDrop(point);
      setHint(kd.feedback);
    }
  };

  useEffect(() => {
    if (!klaar) return;
    const t = setTimeout(() => {
      if (stap < stappen.length - 1) {
        setPopup({
          type: "correct",
          text:
            stap === 0
              ? "Goed! Vanaf 0,5 m boven het platte dak is het gebied I (vrij). De smalle strook eronder is gebied III."
              : stap === 1
              ? "Goed! Bij een flauw dak (α < 23°) volgt gebied III het dak als een band van 0,5 m — net als bij het platte dak, maar dan meebuigend met het dak. Daarboven begint gebied I."
              : stap === 2
              ? "Goed! Bij een steil dak (α ≥ 23°) is gebied I de trechter boven de nok: binnen 0,8 m van de nok volstaat hmin boven de nok (0,5 m binnenland, 1 m kust). Buiten de trechter (gebied III) moet de schoorsteen veel hoger. Hierna komt er een buurgebouw bij — daar hoort een nieuwe grenslijn bij, en die ga je eerst zelf vinden."
              : "Goed! Op ≥ 15 m is gebied II de wig boven de nok (0 Pa); aan beide kanten van de wig, onder de 10°-lijn, ligt gebied III (25/40 Pa). Gebied I ligt boven de 10°-lijn.",
          next: () => {
            setPopup(null);
            setZones({});
            setHint(null);
            setConstructieOk(false);
            setStap(stap + 1);
          },
        });
      } else {
        setPopup({
          type: "correct",
          text:
            "Goed! Op < 15 m reikt de verstoring hoger: gebied I ligt nu boven de 10°-lijn. Daaronder zit gebied V (grote driehoek boven de nok, 12/20 Pa) en gebied IV langs de dakvlakken (37/60 Pa — de hoogste overdruk). Omdat de belemmering binnen 15 m staat, is natuurlijke afvoer in deze situatie niet meer toegestaan.",
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
        <span className="font-bold">{s.titel}.</span> {inConstructie ? s.constructie.vraag : s.uitleg}
      </p>

      <div className="overflow-x-auto max-w-full mb-3">
        <div className="relative" style={{ width: s.sceneW, height: s.sceneH }}>
          {s.scene}
          {inConstructie && (
            <svg width={s.sceneW} height={s.sceneH} viewBox={`0 0 ${s.sceneW} ${s.sceneH}`} className="absolute inset-0">
              {s.constructie.kandidaten.map((kd) => (
                <g
                  key={kd.id}
                  onClick={(e) => klikKandidaat(kd, { x: e.clientX, y: e.clientY })}
                  style={{ cursor: "pointer" }}
                >
                  <path d={kd.d} fill="none" stroke="rgba(0,0,0,0.001)" strokeWidth="20" pointerEvents="stroke" />
                  <path d={kd.d} fill="none" stroke={C.brown} strokeWidth="2.2" strokeDasharray="7,5" pointerEvents="none" />
                  <circle cx={kd.label.x} cy={kd.label.y} r="11" fill={C.bgCard} stroke={C.brown} strokeWidth="1.6" pointerEvents="none" />
                  <text x={kd.label.x} y={kd.label.y + 4} fontSize="12" fontWeight="700" fill={C.brownText} textAnchor="middle" pointerEvents="none">
                    {kd.id}
                  </text>
                </g>
              ))}
            </svg>
          )}
          {!inConstructie && s.drops.map((d) => (
            <DropTarget
              key={d.id}
              id={d.id}
              onDropItem={(payload, point) => {
                if (zones[d.id]) return undefined;
                if (payload === d.expected) {
                  playSound("drop");
                  const nieuw = { ...zones, [d.id]: payload };
                  setZones(nieuw);
                  setHint(null);
                  addScore(5, point);
                  // lesmoment stabiliserende kap zodra gebied II is gevonden (collega-feedback);
                  // niet als dit de laatste plaatsing was — dan komt de stap-popup al
                  if (payload === "Gebied II" && !s.drops.every((dr) => nieuw[dr.id])) {
                    setPopup({
                      type: "correct",
                      text:
                        "Je hebt gebied II gevonden — onthoud hier meteen de stabiliserende kap bij: een windkap op de uitmonding die de trek stabiliseert en tegendruk door windvlagen beperkt. Gebied II is drukvrij, maar een B11 mag er alleen met zo'n kap uitmonden. In ronde 2 zie je hem in actie.",
                      next: () => setPopup(null),
                    });
                  }
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
        {!inConstructie &&
          s.labels
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

// Ronde 2 gebruikt dezelfde figuren als ronde 1 (figuur 2a en 2b). De dropzones
// zijn iets ruimer dan die van ronde 1, zodat toestelcode + overdruk erin passen.
const ZONES_R2A = [
  { id: "I", x: 540, y: 104, w: 104, h: 44 },
  { id: "II", x: 522, y: 158, w: 74, h: 44 },
  { id: "III", x: 598, y: 180, w: 82, h: 52 },
];
const ZONES_R2B = [
  { id: "I", x: 546, y: 96, w: 104, h: 42 },
  { id: "V", x: 522, y: 158, w: 80, h: 46 },
  { id: "IV", x: 454, y: 162, w: 64, h: 44 },
];

// Compacte toestel-paspoortjes (collega-feedback: 'nu gok ik'): de eigenschappen
// waarop je redeneert staan permanent in beeld. Geen herles van de toestelcodes
// (die zitten in de CLV-game), alleen een geheugensteun. Naar NPR §5.2/5.3/§6.
const TOESTEL_INFO = [
  { code: "B11", info: "open, met trekonderbreker, zonder ventilator — natuurlijke trek" },
  { code: "B22", info: "open, met transportventilator, zonder trekonderbreker" },
  { code: "B23", info: "open, met transportventilator — zelfde principe als B22" },
  { code: "Type C", info: "gesloten — toevoer en afvoer via de doorvoer" },
];

// Twee stappen: eerst figuur 2a (≥ 15 m: gebieden I/II/III), daarna figuur 2b
// (< 15 m: I/IV/V — waar voor B11 alleen gebied I overblijft).
const R2_STAPPEN = [
  {
    titel: "Belendende bebouwing op ≥ 15 m",
    uitleg: "Dezelfde figuur als in ronde 1 (figuur 2a). Sleep elk toestel naar een gebied waar het mag uitmonden.",
    zones: ZONES_R2A,
    toestellen: [
      {
        code: "B11",
        allowed: ["I", "II"],
        uitlegGoed: {
          I: "B11 (open toestel, natuurlijke trek) hoort in het vrije gebied I.",
          II: "In gebied II mag B11 alleen met stabiliserende kap — kijk, die verschijnt automatisch op de nokdoorvoer!",
        },
        hintFout: "B11 werkt op natuurlijke trek en kan geen overdruk overwinnen. Alleen gebied I, of gebied II met stabiliserende kap.",
      },
      { code: "B22", allowed: ["I", "II", "III"], uitlegGoed: null, hintFout: null },
    ],
  },
  {
    titel: "Belendende bebouwing op < 15 m",
    uitleg: "Hetzelfde huis, maar het buurpand staat nu binnen 15 m (figuur 2b). Let op wat dat voor B11 betekent!",
    zones: ZONES_R2B,
    toestellen: [
      {
        code: "B11",
        allowed: ["I"],
        uitlegGoed: {
          I: "Goed gezien: binnen 15 m blijft voor B11 alleen gebied I over — de wig is nu gebied V en daar is natuurlijke afvoer niet meer toelaatbaar.",
        },
        hintFout:
          "Binnen 15 m is natuurlijke afvoer in de wig niet meer toelaatbaar — die is nu gebied V (12/20 Pa). B11 kan alleen nog in gebied I.",
      },
      { code: "B23", allowed: ["I", "IV", "V"], uitlegGoed: null, hintFout: null },
      { code: "Type C", allowed: ["I", "IV", "V"], uitlegGoed: null, hintFout: null },
    ],
  },
];

function M1R2({ onComplete, addScore, badDrop }) {
  const [stap, setStap] = useState(0); // 0 = figuur 2a (≥ 15 m), 1 = figuur 2b (< 15 m)
  const [toestelIdx, setToestelIdx] = useState(0);
  const [geplaatst, setGeplaatst] = useState({}); // zoneId -> toestelcode
  const [kapOpNok, setKapOpNok] = useState(false);
  const [hint, setHint] = useState(null);
  const [info, setInfo] = useState(null);
  const [popup, setPopup] = useState(null);

  const config = R2_STAPPEN[stap];
  const toestel = config.toestellen[toestelIdx];

  const handleDrop = (zoneId, point) => {
    if (!toestel) return undefined;
    if (geplaatst[zoneId]) {
      setHint("In dit gebied staat al een toestel — kies een ander gebied.");
      return undefined;
    }
    if (toestel.allowed.includes(zoneId)) {
      playSound("drop");
      setGeplaatst((prev) => ({ ...prev, [zoneId]: toestel.code }));
      if (toestel.code === "B11" && zoneId === "II") setKapOpNok(true);
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
      if (volgende >= config.toestellen.length) {
        if (stap === 0) {
          setTimeout(
            () =>
              setPopup({
                type: "correct",
                text: "Goed! Nu staat hetzelfde buurpand binnen 15 m (figuur 2b). De wig boven de nok is dan gebied V en langs de dakvlakken ligt gebied IV — kijk wat dat betekent voor B11.",
                buttonText: "Verder",
                next: () => {
                  setPopup(null);
                  setStap(1);
                  setToestelIdx(0);
                  setGeplaatst({});
                  setInfo(null);
                  setHint(null);
                },
              }),
            700
          );
        } else {
          setTimeout(
            () =>
              setPopup({
                type: "correct",
                text: "Alle toestellen geplaatst! B11 is de kieskeurige: gebied I, of gebied II met stabiliserende kap — en staat het buurpand binnen 15 m, dan blijft voor B11 alleen gebied I over. B22/B23 en type C mogen overal, onder voorwaarden van ventilator en fabrikant.",
                buttonText: "Naar de controlevraag",
                next: onComplete,
              }),
            700
          );
        }
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
        <b style={{ color: C.brownText }}>{config.titel}.</b> {config.uitleg}
      </p>

      {/* toestel-paspoortjes: de eigenschappen waarop je redeneert, permanent in beeld */}
      <div className="flex flex-wrap gap-2 justify-center mb-3 max-w-3xl">
        {TOESTEL_INFO.map((t) => (
          <div
            key={t.code}
            className="rounded-lg border px-2.5 py-1 text-[11px] font-medium"
            style={{
              backgroundColor: toestel && toestel.code === t.code ? C.oliveLight : C.bgCard,
              borderColor: toestel && toestel.code === t.code ? C.olive : C.beigeMid,
              color: C.brownText,
            }}
          >
            <b>{t.code}</b> — {t.info}
          </div>
        ))}
      </div>

      <div className="overflow-x-auto max-w-full mb-3">
        <div className="relative" style={{ width: 760, height: 470 }}>
          {stap === 0 ? <SceneFig2A kapOpNok={kapOpNok} /> : <SceneFig2B />}
          {config.zones.map((z) => (
            <DropTarget
              key={`${stap}-${z.id}`}
              id={`t-${stap}-${z.id}`}
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
              Sleep dit toestel ({toestelIdx + 1}/{config.toestellen.length}):
            </span>
            <Draggable key={`${stap}-${toestel.code}`} payload={toestel.code}>
              <DragCard label={toestel.code} />
            </Draggable>
          </>
        ) : (
          <span className="text-xs font-bold" style={{ color: C.green }}>
            Alle toestellen geplaatst!
          </span>
        )}
      </div>

      {popup && <FeedbackPopup type={popup.type} text={popup.text} onClose={popup.next} buttonText={popup.buttonText} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MISSIE 1 — RONDE 3: Is het naastgelegen gebouw belemmerend? (figuur 3)
// ─────────────────────────────────────────────────────────────────────────────

// Geometrie: schaal 10 px/m, maaiveld y=320, uitmonding U = (100, 250) op 7 m,
// buurpand 14 m hoog. Boven het 10°-vlak vanaf U = kandidaat-belemmerend; een
// SLANK gebouw (NPR figuur 3c) is desondanks NIET belemmerend, omdat het niet de
// hele breedte van het vlak vult (het vlak is ook 15° naar links en rechts).
// NPR §5.1.3: in dit verticale zijaanzicht geldt de diagonale 10°-hoek.
const BELEM = {
  U: { x: 100, y: 250 },
  tanBelem: Math.tan((10 * Math.PI) / 180),
  buurW: 80,
  slankW: 18,
  buurTopY: 180, // 14 m hoog (maaiveld 320)
};

function belemStatus(bx, slank = false) {
  // bx = linkerrand buurpand (px). Horizontale afstand U → gevel buurpand
  // (NPR: gemeten vanaf de uitmonding tot het dichtstbijzijnde deel van het gebouw):
  const aM = (bx - BELEM.U.x) / 10; // in m
  const hoogteVerschil = (BELEM.U.y - BELEM.buurTopY) / 10; // 7 m
  const bovenVlak = hoogteVerschil / aM > BELEM.tanBelem;
  return { bovenVlak, belemmerend: bovenVlak && !slank, dM: aM };
}

// Twee sub-scènes: eerst belemmerend ja/nee (het 10°-vlak, inclusief de
// slanke-gebouw-uitzondering van figuur 3c), daarna — gegeven belemmerend —
// de afstand ≥ 15 m vs < 15 m (de 15 m-markering).
const BELEM_SUB = [
  {
    titel: "Deel 1 — Is het buurpand belemmerend? (het 10°-vlak)",
    toon10: true,
    toon15m: false,
    opdrachten: [
      { text: "Plaats het buurpand zo dat het NIET belemmerend is.", check: (s) => !s.belemmerend, startX: 300, hint: "Schuif het buurpand verder weg: zodra de top onder het 10°-vlak vanaf de uitmonding blijft, is het niet belemmerend." },
      { text: "Plaats het buurpand nu zo dat het WEL belemmerend is.", check: (s) => s.belemmerend, startX: 600, hint: "Schuif het buurpand dichterbij: zodra de top boven het 10°-vlak uitsteekt, is het belemmerend." },
      {
        text: "Nu geen breed pand, maar een slanke toren van dezelfde hoogte. Zet hem ook zo dichtbij dat hij boven het 10°-vlak uitsteekt — en let op wat er gebeurt.",
        check: (s) => s.bovenVlak,
        startX: 600,
        slank: true,
        hint: "Schuif de toren dichterbij, tot hij boven het 10°-vlak uitsteekt — net als het brede pand zonet.",
      },
    ],
  },
  {
    titel: "Deel 2 — Het pand is belemmerend: hoe ver staat het? (de 15 m-grens)",
    toon10: false,
    toon15m: true,
    opdrachten: [
      { text: "Het buurpand is belemmerend. Zet het op ten minste 15 m van de uitmonding — dan mag een B11 nog uitmonden met stabiliserende kap.", check: (s) => s.belemmerend && s.dM >= 15, startX: 250, hint: "Schuif het pand buiten de 15 m-markering. Het blijft belemmerend, maar op ≥ 15 m mag natuurlijke afvoer met stabiliserende kap." },
      { text: "Zet het belemmerende pand nu binnen 15 m van de uitmonding.", check: (s) => s.belemmerend && s.dM < 15, startX: 350, hint: "Schuif het pand binnen de 15 m-markering. Dan is natuurlijke afvoer niet meer toelaatbaar — zoals je in ronde 1 en 2 zag: de wig wordt gebied V en langs het dak ligt gebied IV." },
    ],
  },
];

// Afsluitende beslisvraag (collega-feedback: 'wat moet de installateur doen?'):
// na het oordeel volgt de handeling. Antwoorden in vaste volgorde geschud bij mount.
const BESLIS_OPTIES = [
  {
    tekst: "Alleen een stabiliserende kap op de uitmonding plaatsen",
    goed: false,
    feedback: "De kap is de oplossing bij een belemmering op 15 m of meer. Binnen 15 m is natuurlijke afvoer niet toelaatbaar — ook niet met kap.",
  },
  {
    tekst: "Een gesloten toestel met ventilator (B22/B23/type C) toepassen, of de uitmonding verplaatsen naar vrij gebied",
    goed: true,
    feedback: "Precies! Binnen 15 m is natuurlijke afvoer niet toelaatbaar. De installateur kiest dan een toestel met ventilator (of type C), of brengt de uitmonding naar gebied I.",
  },
  {
    tekst: "Niets — de afstand maakt voor de installatie niet uit",
    goed: false,
    feedback: "De afstand bepaalt juist alles: binnen 15 m is natuurlijke afvoer niet meer toelaatbaar.",
  },
];

function M1R3A({ onDone, addScore, badDrop }) {
  const areaRef = useRef(null);
  const [subStap, setSubStap] = useState(0);
  const [opdracht, setOpdracht] = useState(0);
  const [beslis, setBeslis] = useState(false);
  const [beslisOpties] = useState(() => [...BESLIS_OPTIES].sort(() => Math.random() - 0.5));
  const subRef = useRef(0);
  const opdRef = useRef(0);
  const [pos, setPosState] = useState({ x: BELEM_SUB[0].opdrachten[0].startX, y: 0 });
  // ref naast state: de release-evaluatie moet de actuele positie zien (snelle drags)
  const posRef = useRef(pos);
  const setPos = (p) => {
    posRef.current = p;
    setPosState(p);
  };
  const [hint, setHint] = useState(null);

  const cur = BELEM_SUB[subStap];
  const curOpdr = cur.opdrachten[opdracht];
  const slank = !!curOpdr?.slank;
  const breedte = slank ? BELEM.slankW : BELEM.buurW;
  const bx = pos.x - breedte / 2;
  const status = belemStatus(bx, slank);
  const setStart = (sub, opd) => setPos({ x: BELEM_SUB[sub].opdrachten[opd].startX, y: 0 });

  const handleRelease = (point) => {
    const o = BELEM_SUB[subRef.current].opdrachten[opdRef.current];
    if (!o) return;
    const w = o.slank ? BELEM.slankW : BELEM.buurW;
    const actueel = belemStatus(posRef.current.x - w / 2, !!o.slank);
    if (o.check(actueel)) {
      addScore(5, point);
      setHint(null);
      playSound("drop");
      const s = subRef.current, od = opdRef.current;
      if (od + 1 < BELEM_SUB[s].opdrachten.length) {
        opdRef.current = od + 1;
        setOpdracht(od + 1);
        setStart(s, od + 1);
      } else if (s + 1 < BELEM_SUB.length) {
        subRef.current = s + 1;
        opdRef.current = 0;
        setSubStap(s + 1);
        setOpdracht(0);
        setStart(s + 1, 0);
      } else {
        setBeslis(true); // afsluiten met de handelingsvraag: wat doe je nu?
      }
    } else {
      badDrop(point);
      setHint(o.hint);
    }
  };

  const kiesBeslis = (optie, point) => {
    if (optie.goed) {
      addScore(5, point);
      playSound("drop");
      setHint(null);
      onDone();
    } else {
      badDrop(point);
      setHint(optie.feedback);
    }
  };

  const lijnEindX = 740;
  const lijnEindY = BELEM.U.y - (lijnEindX - BELEM.U.x) * BELEM.tanBelem;
  const verdict = cur.toon15m
    ? status.belemmerend
      ? status.dM < 15
        ? { tekst: "Belemmerend en < 15 m — natuurlijke afvoer niet toelaatbaar", kleur: C.red }
        : { tekst: "Belemmerend, maar ≥ 15 m — natuurlijke afvoer alleen met stabiliserende kap", kleur: "#B8860B" }
      : { tekst: "Niet meer belemmerend — schuif terug zodat het pand belemmerend blijft", kleur: C.brown }
    : slank
      ? status.bovenVlak
        ? { tekst: "Boven het 10°-vlak, maar toch NIET belemmerend: de toren is te slank en vult niet de hele breedte van het vlak (figuur 3c)", kleur: C.green }
        : { tekst: "De toren blijft nog onder het 10°-vlak — schuif hem dichterbij", kleur: C.brown }
      : status.belemmerend
        ? { tekst: "Belemmerend — de top steekt boven het 10°-vlak uit", kleur: "#B8860B" }
        : { tekst: "Niet belemmerend — de top blijft onder het 10°-vlak", kleur: C.green };

  return (
    <>
      <div className="text-sm font-extrabold italic mb-1 text-center" style={{ color: C.olive }}>
        {beslis ? "Tot slot — jij bent de installateur" : cur.titel}
      </div>
      {beslis ? (
        <OpdrachtKaart nr={1} totaal={1} text="Het buurpand is belemmerend en staat binnen 15 m. Wat is een juiste oplossing?" />
      ) : (
        <OpdrachtKaart nr={opdracht + 1} totaal={cur.opdrachten.length} text={curOpdr?.text ?? ""} />
      )}
      <div className="overflow-x-auto max-w-full my-3">
        <div ref={areaRef} className="relative" style={{ width: 760, height: 360 }}>
          <svg width={760} height={360} viewBox="0 0 760 360" className="absolute inset-0">
            <defs>
              <pattern id="hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke={C.beigeMid} strokeWidth="2" />
              </pattern>
            </defs>
            {/* belemmeringsvlak (10°) — alleen in deel 1 */}
            {cur.toon10 && (
              <polygon
                points={`${BELEM.U.x},${BELEM.U.y} ${lijnEindX},${lijnEindY} ${lijnEindX},10 ${BELEM.U.x},10`}
                fill="url(#hatch)"
                opacity="0.55"
              />
            )}
            {/* maaiveld */}
            <line x1="10" y1="320" x2="750" y2="320" stroke={C.brownText} strokeWidth="2.5" />
            {/* hoofdgebouw met uitmonding op 7 m */}
            <rect x="60" y="260" width="80" height="60" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2.5" />
            <rect x="92" y="250" width="14" height="10" fill={C.beigeMid} stroke={C.brownText} strokeWidth="2" />
            <circle cx={BELEM.U.x} cy={BELEM.U.y} r="4" fill={C.red} />
            <text x="36" y="246" fontSize="10" fontWeight="700" fill={C.brownText}>uitmonding</text>
            {/* 10°-belemmeringsvlak: lijn + labels — in BEIDE delen zichtbaar */}
            <line x1={BELEM.U.x} y1={BELEM.U.y} x2={lijnEindX} y2={lijnEindY} stroke={C.brown} strokeWidth="2" strokeDasharray="8,5" />
            <text x="190" y={BELEM.U.y - 22} fontSize="11" fontWeight="700" fill={C.brown}>10°</text>
            <text x="600" y="30" fontSize="10" fontWeight="700" fill={C.brown} textAnchor="end">belemmeringsvlak — 10° vanaf de uitmonding</text>
            {/* 15 m-markering — alleen in deel 2 */}
            {cur.toon15m && (
              <>
                <line x1="250" y1="320" x2="250" y2="180" stroke={C.red} strokeWidth="1.5" strokeDasharray="5,4" />
                <text x="250" y="172" fontSize="10" fontWeight="700" fill={C.red} textAnchor="middle">≥ 15 m</text>
              </>
            )}
            {/* live afstand vanaf de uitmonding tot het buurpand — in BEIDE delen zichtbaar */}
            <line x1={BELEM.U.x} y1={BELEM.U.y} x2={BELEM.U.x} y2="338" stroke={C.brown} strokeWidth="0.8" strokeDasharray="3,3" />
            <line x1={BELEM.U.x} y1="338" x2={bx} y2="338" stroke={C.brown} strokeWidth="1.2" />
            <line x1={BELEM.U.x} y1="332" x2={BELEM.U.x} y2="344" stroke={C.brown} strokeWidth="1.2" />
            <line x1={bx} y1="332" x2={bx} y2="344" stroke={C.brown} strokeWidth="1.2" />
            <text x={(BELEM.U.x + bx) / 2} y="355" fontSize="11" fontWeight="700" fill={C.brown} textAnchor="middle">
              {status.dM.toFixed(1).replace(".", ",")} m
            </text>
            {/* buurpand — of de slanke toren van figuur 3c (nooit rood: niet belemmerend) */}
            <rect
              x={bx}
              y={BELEM.buurTopY}
              width={breedte}
              height={320 - BELEM.buurTopY}
              fill={status.belemmerend ? C.redLight : C.beigeMid}
              stroke={status.belemmerend ? C.red : C.brownText}
              strokeWidth="2.5"
            />
            {slank ? (
              <text x={bx + breedte / 2} y={BELEM.buurTopY - 8} fontSize="10" fontWeight="700" textAnchor="middle" fill={status.bovenVlak ? C.green : C.brown}>
                slanke toren
              </text>
            ) : (
              <text x={bx + BELEM.buurW / 2} y={BELEM.buurTopY + 28} fontSize="10" fontWeight="700" textAnchor="middle" fill={status.belemmerend ? C.red : C.brown}>
                {status.belemmerend ? "belemmerend" : "buurpand"}
              </text>
            )}
          </svg>
          <FreeDrag
            areaRef={areaRef}
            pos={{ x: pos.x, y: 250 }}
            setPos={(p) => setPos({ x: p.x, y: 0 })}
            clamp={(p) => ({ x: Math.max(200, Math.min(640, p.x)), y: p.y })}
            onRelease={handleRelease}
            disabled={beslis}
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
      {beslis ? (
        <div className="flex flex-col gap-2 mb-2 max-w-xl w-full">
          {beslisOpties.map((o) => (
            <button
              key={o.tekst}
              onClick={(e) => kiesBeslis(o, { x: e.clientX, y: e.clientY })}
              className="rounded-xl border-2 px-4 py-2.5 text-sm font-medium text-left transition-colors hover:brightness-95"
              style={{ backgroundColor: C.bgCard, borderColor: C.brown, color: C.brownText }}
            >
              {o.tekst}
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border-2 px-4 py-2 mb-2 max-w-xl w-full text-center text-sm font-bold" style={{ backgroundColor: C.bgCard, borderColor: verdict.kleur, color: verdict.kleur }}>
          {verdict.tekst}
        </div>
      )}
      <HintBar text={hint} />
    </>
  );
}

// ── Deel 3: kust of binnenland? (NPR bijlage B, figuur B.1 — vereenvoudigd) ──
// Twee woningen met een uitmonding in gebied III: een in het kustgebied, een in
// het binnenland. De cursist sleept de juiste overdrukwaarde naar elke woning.
const KUST_DOELEN = [
  // Den Haag staat als callout in zee (verwijslijn naar de open kust-stip): op de
  // echte kaart is de kuststrook daar te smal voor huisje + sleepvak.
  { id: "kust", label: "40 Pa", huis: { x: 78, y: 303 }, stad: "Den Haag", pill: { x: 27, y: 330 } },
  { id: "binnen", label: "25 Pa", huis: { x: 367, y: 348 }, stad: "Arnhem", pill: { x: 392, y: 340 } },
];

function KustHuis({ x, y, stad }) {
  return (
    <g>
      <rect x={x - 8} y={y - 5} width={16} height={10} fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.5" />
      <polygon points={`${x - 10},${y - 5} ${x},${y - 13} ${x + 10},${y - 5}`} fill={C.beigeLight} stroke={C.brownText} strokeWidth="1.5" />
      <text x={x} y={y + 17} fontSize="8.5" fontWeight="700" fill={C.brownText} textAnchor="middle">{stad}</text>
    </g>
  );
}

function M1R3Kust({ onDone, addScore, badDrop }) {
  const [geplaatst, setGeplaatst] = useState({});
  const [hint, setHint] = useState(null);

  const handleDrop = (doelId, payload, point) => {
    if (geplaatst[doelId]) return undefined;
    const doel = KUST_DOELEN.find((d) => d.id === doelId);
    if (payload === doel.label) {
      playSound("drop");
      addScore(5, point);
      setHint(null);
      const nieuw = { ...geplaatst, [doelId]: payload };
      setGeplaatst(nieuw);
      if (Object.keys(nieuw).length === KUST_DOELEN.length) setTimeout(onDone, 600);
      return "correct";
    }
    badDrop(point);
    setHint(
      doelId === "kust"
        ? "Deze woning staat in het kustgebied — daar waait het harder, dus geldt de hogere overdrukwaarde."
        : "Deze woning staat in het binnenland — daar geldt de lagere overdrukwaarde."
    );
    return "wrong";
  };

  return (
    <>
      <div className="text-sm font-extrabold italic mb-1 text-center" style={{ color: C.olive }}>
        Deel 3 — Kust of binnenland?
      </div>
      <OpdrachtKaart nr={1} totaal={1} text="Beide woningen hebben een uitmonding in gebied III. Sleep de juiste overdrukwaarde naar elke woning." />
      <div className="overflow-x-auto max-w-full my-3">
        <div className="relative" style={{ width: KAART_B1.W, height: KAART_B1.H }}>
          <svg width={KAART_B1.W} height={KAART_B1.H} viewBox={`0 0 ${KAART_B1.W} ${KAART_B1.H}`} className="absolute inset-0">
            {/* landmassa uit echte geodata (IJsselmeer/Markermeer als gaten) */}
            <path d={KAART_B1.land} fill={C.bgCard} fillRule="evenodd" stroke="none" />
            {/* provinciegrenzen */}
            <path d={KAART_B1.binnen} fill="none" stroke={C.brownText} strokeWidth="0.6" opacity="0.45" />
            {/* kustlijn en landsgrenzen */}
            <path d={KAART_B1.land} fill="none" stroke={C.brownText} strokeWidth="1.4" />
            {/* Afsluitdijk en Houtribdijk */}
            <line x1={KAART_B1.afsluitdijk[0][0]} y1={KAART_B1.afsluitdijk[0][1]} x2={KAART_B1.afsluitdijk[1][0]} y2={KAART_B1.afsluitdijk[1][1]} stroke={C.brownText} strokeWidth="1.8" />
            <line x1={KAART_B1.houtribdijk[0][0]} y1={KAART_B1.houtribdijk[0][1]} x2={KAART_B1.houtribdijk[1][0]} y2={KAART_B1.houtribdijk[1][1]} stroke={C.brownText} strokeWidth="1.8" />
            {/* scheidingslijn kust/binnenland, twee segmenten zoals in figuur B.1 */}
            <path d={KAART_B1.lijnA} fill="none" stroke={C.brownText} strokeWidth="2.6" strokeDasharray="13 5 3 5" strokeLinecap="round" />
            <path d={KAART_B1.lijnB} fill="none" stroke={C.brownText} strokeWidth="2.6" strokeDasharray="13 5 3 5" strokeLinecap="round" />
            {/* steden: gevulde stip = de lijn loopt hierlangs, open stip = oriëntatiepunt */}
            {KAART_B1.steden.map((s) => (
              <g key={s.naam}>
                <circle cx={s.x} cy={s.y} r="3.1" fill={s.vol ? C.brownText : "#FFFFFF"} stroke={s.vol ? C.bgCard : C.brownText} strokeWidth={s.vol ? 1.2 : 1.3} />
                {s.extra && s.extra.includes("ring") && (
                  <circle cx={s.x} cy={s.y} r="6" fill="none" stroke={C.brownText} strokeWidth="1.3" />
                )}
                {s.label && (
                  <text
                    x={s.x + s.dx}
                    y={s.y + s.dy + 3}
                    fontSize="8.5"
                    fontWeight="600"
                    fill={C.brownText}
                    textAnchor={s.anchor}
                    textDecoration={s.extra && s.extra.includes("onder") ? "underline" : undefined}
                  >
                    {s.naam}
                  </text>
                )}
              </g>
            ))}
            {/* gebiedslabels met verwijslijn, zoals in figuur B.1 */}
            <circle cx={KAART_B1.strip[0]} cy={KAART_B1.strip[1]} r="1.8" fill={C.brownText} />
            <line x1="94" y1="279" x2={KAART_B1.strip[0]} y2={KAART_B1.strip[1]} stroke={C.brownText} strokeWidth="0.9" />
            <rect x="8" y="268" width="86" height="22" fill={C.bgCard} stroke={C.brownText} strokeWidth="1.4" />
            <text x="51" y="283" fontSize="11" fontWeight="700" fill={C.brownText} textAnchor="middle">kustgebied</text>
            <rect x="356" y="296" width="86" height="22" fill={C.bgCard} stroke={C.brownText} strokeWidth="1.4" />
            <text x="399" y="311" fontSize="11" fontWeight="700" fill={C.brownText} textAnchor="middle">binnenland</text>
            {/* noordpijl */}
            <line x1="70" y1="70" x2="70" y2="26" stroke={C.brownText} strokeWidth="2.4" />
            <polygon points="63,36 77,36 70,18" fill={C.brownText} />
            <text x="84" y="40" fontSize="13" fontWeight="700" fill={C.brownText}>Noord</text>
            {/* Den Haag: open kust-stip + verwijslijn naar het callout-huisje in zee */}
            <circle cx={KAART_B1.denHaagStip[0]} cy={KAART_B1.denHaagStip[1]} r="3.1" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.3" />
            <line x1={KUST_DOELEN[0].huis.x + 8} y1={KUST_DOELEN[0].huis.y + 7} x2={KAART_B1.denHaagStip[0] - 3} y2={KAART_B1.denHaagStip[1] - 1} stroke={C.brownText} strokeWidth="0.9" />
            {/* Arnhem: verwijslijntje van het huisje naar het sleepvak rechts */}
            <line x1={KUST_DOELEN[1].huis.x + 10} y1={KUST_DOELEN[1].huis.y + 4} x2={KUST_DOELEN[1].pill.x} y2={KUST_DOELEN[1].pill.y + 18} stroke={C.brown} strokeWidth="1" strokeDasharray="4,3" />
            {/* de twee woningen */}
            {KUST_DOELEN.map((d) => (
              <KustHuis key={d.id} x={d.huis.x} y={d.huis.y} stad={d.stad} />
            ))}
            <text x="140" y="612" fontSize="9" fontStyle="italic" fontWeight="600" fill={C.brown} textAnchor="middle">
              naar NPR 3378-60, bijlage B — figuur B.1
            </text>
          </svg>
          {KUST_DOELEN.map((d) => (
            <DropTarget
              key={d.id}
              id={`kust-${d.id}`}
              onDropItem={(payload, point) => handleDrop(d.id, payload, point)}
              className="absolute"
              style={{ left: d.pill.x, top: d.pill.y, width: 102, height: 36 }}
              render={({ isHover, flash }) => (
                <div
                  className="w-full h-full rounded-xl border-2 flex items-center justify-center text-center transition-all duration-200 px-1"
                  style={{
                    borderStyle: geplaatst[d.id] ? "solid" : "dashed",
                    borderColor: geplaatst[d.id] ? C.green : flash === "wrong" ? C.red : isHover ? C.olive : C.brown,
                    backgroundColor: geplaatst[d.id]
                      ? "rgba(232,245,227,0.95)"
                      : flash === "wrong"
                      ? "rgba(253,234,234,0.9)"
                      : isHover
                      ? "rgba(237,240,224,0.9)"
                      : "rgba(255,252,245,0.85)",
                  }}
                >
                  {geplaatst[d.id] ? (
                    <span className="flex items-center gap-1 text-xs font-bold" style={{ color: C.green }}>
                      <CheckCircle className="w-3.5 h-3.5" /> gebied III: {geplaatst[d.id]}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold" style={{ color: C.brown }}>gebied III: ? Pa</span>
                  )}
                </div>
              )}
            />
          ))}
        </div>
      </div>
      <HintBar text={hint} />
      <div className="flex gap-3 flex-wrap justify-center mt-3 items-center">
        {["40 Pa", "25 Pa"]
          .filter((l) => !Object.values(geplaatst).includes(l))
          .map((l) => (
            <Draggable key={l} payload={l}>
              <DragCard label={l} />
            </Draggable>
          ))}
      </div>
    </>
  );
}

// Replica van NPR 3378-60 figuur 3 (a/b/c) voor de uitlegkaart van M1R3: het
// gearceerde belemmeringsvlak (15°/15°/10°), het grijze belemmeringsgebied met
// rafelrand, en de drie situaties: breed gebouw (a) en hoog huis (b) zijn
// belemmerend, de slanke toren (c) niet.
function Fig3Huisje() {
  return (
    <g>
      <polygon points="0,6 36,24 19,37 -17,19" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.2" />
      <polygon points="19,37 36,24 53,37 53,52 19,52" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.2" />
      <polygon points="-17,19 19,37 19,52 -17,34" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.2" />
      {/* pijp staat op de nok: noklijn (0,6)-(36,24) ligt bij x=29 op y≈20,5 */}
      <rect x="26.5" y="6.5" width="5" height="14" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.1" />
      <rect x="24.5" y="3.5" width="9" height="4" rx="1" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.1" />
    </g>
  );
}

function Fig3Waaier({ hoeken, dashEind }) {
  // vier dunne lijnen naar de hoeken van het vlak + hartlijn (streep-punt)
  return (
    <g>
      {hoeken.map(([x, y], i) => (
        <line key={i} x1="49" y1="152" x2={x} y2={y} stroke={C.brownText} strokeWidth="0.7" />
      ))}
      <line x1="49" y1="152" x2={dashEind[0]} y2={dashEind[1]} stroke={C.brownText} strokeWidth="0.8" strokeDasharray="8 3 1.5 3" />
      <circle cx="98" cy="126" r="1.6" fill={C.brownText} />
      <path d="M 84 122 A 26 26 0 0 1 88 141" fill="none" stroke={C.brownText} strokeWidth="0.7" />
      <text x="70" y="118" fontSize="9" fontWeight="600" fill={C.brownText}>15°</text>
      <path d="M 104 131 A 26 26 0 0 1 96 146" fill="none" stroke={C.brownText} strokeWidth="0.7" />
      <text x="104" y="145" fontSize="9" fontWeight="600" fill={C.brownText}>15°</text>
      <path d="M 116 96 A 30 30 0 0 1 121 113" fill="none" stroke={C.brownText} strokeWidth="0.7" />
      <text x="98" y="88" fontSize="9" fontWeight="600" fill={C.brownText}>10°</text>
    </g>
  );
}

function AfbFiguur3() {
  return (
    <div className="flex flex-col items-center">
      <svg width="560" height="248" viewBox="0 0 560 248" className="max-w-full h-auto">
        <defs>
          <pattern id="f3arc" width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="5" stroke={C.brownText} strokeWidth="0.9" />
          </pattern>
        </defs>
        {/* a: hoog breed gebouw — belemmerend */}
        <g>
          <polygon points="112,54 132,42 184,68 184,92" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.6" />
          <polygon points="112,54 184,90 184,140 112,104" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.6" />
          <polygon points="134,86 162,100 162,44 160,40 156,43 150,38 144,42 138,37 134,41" fill="#ADADAD" stroke={C.brownText} strokeWidth="0.7" />
          <polygon points="134,86 162,100 162,115 134,101" fill="url(#f3arc)" stroke={C.brownText} strokeWidth="0.9" />
          <line x1="148" y1="93" x2="148" y2="108" stroke={C.brownText} strokeWidth="0.9" />
          <Fig3Waaier hoeken={[[134, 86], [162, 100], [134, 101], [162, 115]]} dashEind={[154, 104]} />
          <g transform="translate(20,150)"><Fig3Huisje /></g>
          <text x="93" y="224" fontSize="9.5" fontWeight="700" fill={C.brownText} textAnchor="middle">a — belemmerend</text>
        </g>
        {/* b: hoog huis met schuin dak — belemmerend */}
        <g transform="translate(187,0)">
          <polygon points="104,100 150,123 184,88 138,65" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.6" />
          <polygon points="150,123 184,88 186,90 186,132 150,148" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.6" />
          <polygon points="104,100 150,123 150,148 104,125" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.6" />
          <polygon points="118,94 142,106 168,44 166,38 161,42 156,35 150,39 144,32 120,90" fill="#ADADAD" stroke={C.brownText} strokeWidth="0.7" opacity="0.95" />
          <polygon points="118,94 142,106 142,119 118,107" fill="url(#f3arc)" stroke={C.brownText} strokeWidth="0.9" />
          <line x1="130" y1="100" x2="130" y2="113" stroke={C.brownText} strokeWidth="0.9" />
          <Fig3Waaier hoeken={[[118, 94], [142, 106], [118, 107], [142, 119]]} dashEind={[136, 109]} />
          <g transform="translate(20,150)"><Fig3Huisje /></g>
          <text x="93" y="224" fontSize="9.5" fontWeight="700" fill={C.brownText} textAnchor="middle">b — belemmerend</text>
        </g>
        {/* c: slanke toren — niet belemmerend */}
        <g transform="translate(374,0)">
          <polygon points="126,88 170,104 170,48 167,43 162,47 156,41 149,46 142,40 133,44 126,48" fill="#ADADAD" stroke={C.brownText} strokeWidth="0.7" />
          <polygon points="126,88 170,104 170,119 126,103" fill="url(#f3arc)" stroke={C.brownText} strokeWidth="0.9" />
          <line x1="148" y1="96" x2="148" y2="111" stroke={C.brownText} strokeWidth="0.9" />
          <polygon points="146,30 152,27 158,30 158,150 152,153 146,150" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.4" />
          <line x1="152" y1="27" x2="152" y2="153" stroke={C.brownText} strokeWidth="0.8" />
          <Fig3Waaier hoeken={[[126, 88], [170, 104], [126, 103], [170, 119]]} dashEind={[156, 106]} />
          <g transform="translate(20,150)"><Fig3Huisje /></g>
          <text x="93" y="224" fontSize="9.5" fontWeight="700" fill={C.brownText} textAnchor="middle">c — niet belemmerend</text>
        </g>
        <text x="280" y="242" fontSize="9" fontStyle="italic" fontWeight="600" fill={C.brown} textAnchor="middle">
          naar NPR 3378-60 — figuur 3: wel en niet belemmerende naastgelegen gebouwen
        </text>
      </svg>
    </div>
  );
}

function M1R3({ onComplete, addScore, badDrop }) {
  const [deel, setDeel] = useState("A");
  const [popup, setPopup] = useState(null);

  return (
    <div className="flex-1 flex flex-col items-center p-5">
      <StepBanner step={1} />
      <h2 className="text-xl font-bold italic mb-1" style={{ color: C.brownText }}>
        Ronde 3: Belemmering en het kustgebied
      </h2>
      <p className="text-sm mb-3 max-w-xl text-center font-medium" style={{ color: C.brown }}>
        {deel === "A"
          ? "Versleep het buurpand en zie wanneer het belemmerend wordt (figuur 3 uit de NPR). Het is dezelfde 10°-lijn als in ronde 1 en 2, maar van de andere kant bekeken: daar vanaf de dakrand van het buurgebouw omlaag, hier vanaf de uitmonding omhoog."
          : "Kust of binnenland? Dezelfde uitmondingsgebieden, maar andere overdrukwaarden — op de kaart zie je welke geldt."}
      </p>

      {deel === "A" ? (
        <M1R3A
          addScore={addScore}
          badDrop={badDrop}
          onDone={() =>
            setPopup({
              type: "correct",
              text: "Goed gezien! Niet belemmerend (of te slank): vrij uitmonden. Belemmerend op ≥ 15 m: alleen met stabiliserende kap. Belemmerend op < 15 m: geen natuurlijke afvoer — dan kiest de installateur een toestel met ventilator (B22/B23/type C) of verplaatst hij de uitmonding naar vrij gebied.",
              buttonText: "Verder",
              next: () => {
                setPopup(null);
                setDeel("kust");
              },
            })
          }
        />
      ) : (
        <M1R3Kust
          addScore={addScore}
          badDrop={badDrop}
          onDone={() =>
            setPopup({
              type: "correct",
              text: "Onthoud: in het kustgebied waait het harder, dus gelden hogere overdrukwaarden — gebied III: 40 i.p.v. 25 Pa (en IV: 60 i.p.v. 37, V: 20 i.p.v. 12). De kaart laat zien wat kustgebied is.",
              buttonText: "Naar de controlevraag",
              next: () => {
                setPopup(null);
                onComplete();
              },
            })
          }
        />
      )}

      {popup && <FeedbackPopup type={popup.type} text={popup.text} onClose={popup.next} buttonText={popup.buttonText} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MISSIE 2 — RONDE 1 + 2: de verdunningsfactor (verkeerslicht-sleeprondes)
// ─────────────────────────────────────────────────────────────────────────────

// Vier verschillende gebouwen. Per scène: de rekensoort (gevel/dak), het
// gebouwbeeld (layout), belasting, schaal (px/m), roosterpositie T, het
// sleepgebied en de startpositie.
const VF_SCENES = {
  woonhuis: { math: "gevel", layout: "woonhuis", B: 24, scale: 110, T: { x: 280, y: 320 }, clamp: { x0: 150, x1: 410, y0: 70, y1: 305 }, domein: { x0: 145, x1: 415, y0: 65, y1: 310 }, start: { x: 270, y: 290 }, W: 560, H: 400 },
  buren: { math: "gevel", layout: "buren", B: 30, scale: 80, T: { x: 352, y: 250 }, clamp: { x0: 84, x1: 292, y0: 70, y1: 300 }, domein: { x0: 80, x1: 300, y0: 65, y1: 305 }, start: { x: 280, y: 262 }, W: 560, H: 400 },
  dak: { math: "dak", layout: "dak", B: 36, scale: 30, T: { x: 120, y: 191 }, clamp: { x0: 155, x1: 480, y0: 122, y1: 185 }, domein: { x0: 150, x1: 484, y0: 120, y1: 190 }, start: { x: 200, y: 155 }, W: 560, H: 310 },
  // flat: B 38 en T iets lager gekozen zodat de groene zone (hoog en opzij) haalbaar
  // blijft — bij B 40 / T y=150 was hij maar ~480 px² per hoek (vrijwel onvindbaar)
  flat: { math: "gevel", layout: "flat", B: 38, scale: 110, T: { x: 280, y: 162 }, clamp: { x0: 150, x1: 410, y0: 50, y1: 330 }, domein: { x0: 145, x1: 415, y0: 45, y1: 335 }, start: { x: 330, y: 92 }, W: 560, H: 400 },
};

// Sleepopdrachten per ronde, met OPLOPENDE moeilijkheid: eerst met verkeerslicht
// en een uitmonding die meekleurt, daarna zonder — dan moet de cursist zelf de
// afgelezen f met de eis (0,01) vergelijken.
const VF_R1 = [
  {
    scene: VF_SCENES.woonhuis,
    doel: "fout",
    toonStoplicht: true,
    kleurA: true,
    text: "Zet de uitmonding (A) vlak boven het ventilatierooster (T) en laat los. Het rooster zuigt buitenlucht naar binnen — kijk wat het verkeerslicht zegt.",
    popupNa: (r) =>
      `Rood licht! Zo dicht bij het rooster is f = ${fFormat(r.f)} — veel meer dan 0,01. Het rookgas komt hier veel te geconcentreerd bij de luchttoevoer aan. Nu ga jij het oplossen.`,
  },
  {
    scene: VF_SCENES.woonhuis,
    doel: "goed",
    toonStoplicht: true,
    kleurA: true,
    text: "Versleep de uitmonding nu tot het rookgas het rooster pas sterk verdund bereikt: f onder 0,01 → groen licht.",
  },
];
const VF_R2 = [
  {
    scene: VF_SCENES.buren,
    doel: "goed",
    toonStoplicht: true,
    kleurA: true,
    text: "Nu zit het rooster op het buurpand (ketel van 30 kW). Sleep jouw uitmonding zo dat het rookgas daar sterk verdund aankomt: f onder 0,01.",
  },
  {
    scene: VF_SCENES.dak,
    doel: "goed",
    toonStoplicht: false,
    kleurA: false,
    text: "Plat dak, 36 kW — nu zonder verkeerslicht. Kies een plek, laat los en lees de verdunningsfactor af; vergelijk zelf met de eis. Verder weg en hoger zetten helpt.",
  },
  {
    scene: VF_SCENES.flat,
    doel: "goed",
    toonStoplicht: false,
    kleurA: false,
    text: "Jouw woning zit boven die van de onderburen — hun verse-luchtrooster (T) zit net onder jouw geveldeel, en jouw ketel is zwaar (38 kW). Geen hulp meer: hang de doorvoer zo dat de verdunningsfactor voldoet.",
  },
];

// Berekening per scène — achter de schermen (NPR §9.2 formule 3:
// f = √B / (C₁·l + C₂·Δh)); de cursist ziet alleen f (en soms het verkeerslicht).
function berekenF(scene, pos) {
  const S = scene.scale || 30;
  const T = scene.T;
  if (scene.math === "gevel") {
    const dx = (pos.x - T.x) / S;
    const dy = (T.y - pos.y) / S; // positief = A hoger dan T
    const l = Math.hypot(dx, dy);
    const c2 = dy >= 0 ? 0 : -325; // een uitmonding lager dan het rooster werkt tegen de verdunning
    const noemer = 500 * l + c2 * Math.abs(dy);
    return { f: noemer > 0 ? Math.sqrt(scene.B) / noemer : Infinity, l, dh: Math.abs(dy) };
  }
  // plat dak
  const dx = (pos.x - T.x) / S;
  const dh = (T.y - pos.y) / S;
  const l = Math.hypot(dx, dh);
  const noemer = 80 * l + 80 * dh;
  return { f: Math.sqrt(scene.B) / noemer, l, dh };
}

function fFormat(f) {
  if (!isFinite(f)) return "∞";
  if (f < 0.0001) return "< 0,0001";
  return f.toFixed(4).replace(".", ",");
}

// Bouwkundige breuklijn: markeert dat het gebouw buiten het beeld doorloopt
// (uitsnede-conventie uit technisch tekenen — de gevelscenes zijn ingezoomd).
function BreukRand({ x1, x2, y }) {
  const pts = [];
  for (let x = x1, i = 0; x <= x2; x += 14, i++) pts.push(`${x},${y + (i % 2 === 0 ? -2.5 : 2.5)}`);
  return <polyline points={pts.join(" ")} fill="none" stroke={C.brown} strokeWidth="1.2" opacity="0.45" />;
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
        <div className="text-[10px] font-bold" style={{ color: C.brown }}>eis: f &lt; 0,01 (gasgestookt)</div>
      </div>
    </div>
  );
}

// Neutrale f-kaart voor de opdrachten zonder verkeerslicht: alleen het getal,
// geen kleur — de cursist beoordeelt zelf of het voldoet. Tijdens het slepen is
// de waarde verborgen (collega-feedback): pas bij het loslaten lees je f af.
function FWaarde({ f, verborgen = false }) {
  return (
    <div className="rounded-2xl border-2 p-4 w-44 flex flex-col items-center gap-1" style={{ backgroundColor: C.bgCard, borderColor: C.brownText }}>
      <div className="text-[10px] font-bold uppercase" style={{ color: C.brown }}>verdunningsfactor</div>
      <div className="text-2xl font-bold" style={{ color: verborgen ? C.beigeMid : C.brownText }}>
        {verborgen ? "f = ?" : `f = ${fFormat(f)}`}
      </div>
      <div className="text-[10px] italic text-center" style={{ color: C.brown }}>
        {verborgen ? "kies een plek en laat los om f af te lezen" : "voldoet dit? beoordeel het zelf"}
      </div>
    </div>
  );
}

function VerdunningsRonde({ titel, intro, opdrachten, eindTekst, onComplete, addScore, badDrop }) {
  const areaRef = useRef(null);
  const [idx, setIdx] = useState(0);
  const [pos, setPosState] = useState(opdrachten[0].scene.start); // start vlak bij het rooster
  const posRef = useRef(pos);
  const setPos = (p) => {
    posRef.current = p;
    setPosState(p);
    setFZichtbaar(false); // zodra er weer gesleept wordt, verdwijnt de afgelezen f
  };
  const [hint, setHint] = useState(null);
  const [popup, setPopup] = useState(null);
  const [toonZone, setToonZone] = useState(false); // rood verboden-gebied pas tonen na een foute plaatsing
  const [fZichtbaar, setFZichtbaar] = useState(false); // kale opdrachten: f pas tonen na loslaten

  const cur = opdrachten[idx];
  const scene = cur.scene;
  const res = berekenF(scene, pos);
  const ok = res.f < 0.01;

  const domein = scene.domein;

  const clamp = (p) => ({
    x: Math.max(scene.clamp.x0, Math.min(scene.clamp.x1, p.x)),
    y: Math.max(scene.clamp.y0, Math.min(scene.clamp.y1, p.y)),
  });

  const handleRelease = (point) => {
    setFZichtbaar(true); // loslaten = aflezen
    const actueel = berekenF(scene, posRef.current);
    const behaald = cur.doel === "fout" ? actueel.f >= 0.01 : actueel.f < 0.01;
    if (behaald) {
      addScore(5, point);
      playSound("drop");
      setHint(null);
      const gaVerder = () => {
        const volgende = opdrachten[idx + 1];
        setIdx(idx + 1);
        if (volgende.scene !== scene) setPos(volgende.scene.start);
        setToonZone(false); // nieuwe opdracht: rood weer verbergen
      };
      if (idx + 1 >= opdrachten.length) {
        setPopup({ type: "correct", text: eindTekst, next: onComplete });
      } else if (cur.popupNa) {
        setPopup({ type: "correct", text: cur.popupNa(actueel), buttonText: "Nu oplossen", next: () => { setPopup(null); gaVerder(); } });
      } else {
        gaVerder();
      }
    } else if (cur.doel === "fout") {
      // geen strafpunten: de opdracht vraagt bewust om een 'foute' plek
      setHint("Zet de uitmonding juist dicht bij het rooster — we willen eerst zien wanneer het misgaat.");
    } else {
      badDrop(point);
      setToonZone(true); // foute plaatsing: nu het rode gebied tonen als hulp
      setHint(
        (scene.math === "gevel"
          ? "Te dicht bij het rooster — vergroot de afstand en hang de uitmonding hoger dan het rooster (lager hangen werkt juist tegen)."
          : "Te dicht bij de aanzuigopening — schuif de uitmonding verder over het dak (hoger zetten helpt mee).") +
          (cur.toonStoplicht ? "" : " Vergelijk de afgelezen f met de eis: kleiner dan 0,01.")
      );
    }
  };

  const sceneW = scene.W;
  const sceneH = scene.H;

  return (
    <div className="flex-1 flex flex-col items-center p-5">
      <StepBanner step={1} />
      <h2 className="text-xl font-bold italic mb-1" style={{ color: C.brownText }}>
        {titel}
      </h2>
      <p className="text-sm mb-3 max-w-xl text-center font-medium" style={{ color: C.brown }}>
        {intro}
      </p>

      <OpdrachtKaart nr={idx + 1} totaal={opdrachten.length} text={cur.text} />

      <div className="flex flex-wrap gap-4 justify-center items-start mt-3">
        <div className="overflow-x-auto max-w-full">
          <div ref={areaRef} className="relative" style={{ width: sceneW, height: sceneH }}>
            <svg width={sceneW} height={sceneH} viewBox={`0 0 ${sceneW} ${sceneH}`} className="absolute inset-0">
              <defs>
                <ZonePatroon id="vz-rood" kleur={ZONE_KLEUR.IV} />
                {/* metselwerk: lintvoegen op lagenmaat (2 lagen per voeglijn), heel subtiel
                    zodat maatlijnen en het rode raster visueel blijven winnen */}
                <pattern id="metsel110" width="10" height="14" patternUnits="userSpaceOnUse">
                  <rect width="10" height="14" fill={C.beigeLight} />
                  <line x1="0" y1="13.5" x2="10" y2="13.5" stroke={C.brown} strokeWidth="0.9" opacity="0.13" />
                </pattern>
                <pattern id="metsel80" width="10" height="10" patternUnits="userSpaceOnUse">
                  <rect width="10" height="10" fill={C.beigeLight} />
                  <line x1="0" y1="9.5" x2="10" y2="9.5" stroke={C.brown} strokeWidth="0.9" opacity="0.13" />
                </pattern>
                <pattern id="metsel80warm" width="10" height="10" patternUnits="userSpaceOnUse">
                  <rect width="10" height="10" fill="#F0E4CA" />
                  <line x1="0" y1="9.5" x2="10" y2="9.5" stroke={C.brown} strokeWidth="0.9" opacity="0.13" />
                </pattern>
              </defs>
              {scene.layout === "woonhuis" && (
                <>
                  {/* ingezoomd gevelfragment (5,1 × 3,6 m) — de woning loopt aan alle kanten
                      buiten beeld door; op deze schaal (110 px/m) past geen heel huis in beeld */}
                  <rect x="0" y="0" width="560" height="400" fill="url(#metsel110)" />
                  {/* woonkamerkozijn, door de onderrand gesneden; het rooster zit in het bovenlicht */}
                  <rect x="192" y="291" width="176" height="9" fill="#E5DCC8" stroke={C.brownText} strokeWidth="1.2" />
                  {Array.from({ length: 21 }, (_, i) => 196 + i * 8).map((x) => (
                    <line key={x} x1={x} y1="292" x2={x} y2="299" stroke={C.brown} strokeWidth="0.7" opacity="0.5" />
                  ))}
                  <rect x="200" y="300" width="160" height="100" fill="#FFFFFF" stroke={C.brownText} strokeWidth="2.2" />
                  <rect x="200" y="330" width="160" height="8" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.4" />
                  <rect x="206" y="344" width="70" height="56" fill="#FAF7EF" stroke={C.brownText} strokeWidth="1.2" />
                  <rect x="284" y="344" width="70" height="56" fill="#FAF7EF" stroke={C.brownText} strokeWidth="1.2" />
                  <line x1="216" y1="352" x2="256" y2="392" stroke={C.brown} strokeWidth="0.8" opacity="0.25" />
                  <line x1="294" y1="352" x2="334" y2="392" stroke={C.brown} strokeWidth="0.8" opacity="0.25" />
                  {/* context: raam van de buren rechts (zelfde peil als jouw kozijn) + hemelwaterafvoer */}
                  <rect x="490" y="124" width="70" height="176" fill="#FAF7EF" stroke={C.brownText} strokeWidth="1.8" />
                  <rect x="484" y="300" width="76" height="8" fill="#E5DCC8" stroke={C.brownText} strokeWidth="1" />
                  <rect x="462" y="0" width="9" height="400" fill="#E8DFC9" stroke={C.brownText} strokeWidth="1.3" />
                  {[56, 166, 276, 366].map((y) => (
                    <rect key={y} x="459" y={y} width="15" height="5" fill="#E8DFC9" stroke={C.brownText} strokeWidth="1" />
                  ))}
                  {/* schaalbalk + breuklijn: dit is een uitsnede */}
                  <line x1="30" y1="378" x2="140" y2="378" stroke={C.brownText} strokeWidth="2" />
                  <line x1="30" y1="373" x2="30" y2="383" stroke={C.brownText} strokeWidth="2" />
                  <line x1="140" y1="373" x2="140" y2="383" stroke={C.brownText} strokeWidth="2" />
                  <text x="85" y="371" fontSize="10" fontWeight="700" fill={C.brown} textAnchor="middle">1 m</text>
                  <BreukRand x1={4} x2={556} y={396} />
                  <rect x="88" y="22" width="384" height="24" rx="5" fill={C.bgCard} stroke={C.brown} strokeWidth="1" />
                  <text x="280" y="38" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">
                    ingezoomd op de gevel van jouw woning — het rooster (T) is de luchttoevoer
                  </text>
                  {toonZone && <VerbodenZone scene={scene} domein={domein} />}
                  {/* ventilatierooster T in het bovenlicht van de pui */}
                  <g>
                    <rect x="240" y="308" width="80" height="18" fill="#2E86C1" stroke={C.brownText} strokeWidth="1.6" rx="2" />
                    {[313, 317, 321].map((y) => (
                      <line key={y} x1="246" y1={y} x2="314" y2={y} stroke="white" strokeWidth="1.6" />
                    ))}
                    <rect x="412" y="308" width="142" height="20" rx="4" fill={C.bgCard} opacity="0.92" stroke={C.brown} strokeWidth="1" />
                    <text x="483" y="322" fontSize="10" fontWeight="700" fill="#2E86C1" textAnchor="middle">T — luchttoevoer woning</text>
                    <line x1="412" y1="318" x2="324" y2="317" stroke={C.brown} strokeWidth="1" opacity="0.5" />
                  </g>
                  {/* maatlijn l (kortste afstand A–T) */}
                  <line x1="280" y1="320" x2={pos.x} y2={pos.y} stroke={C.brown} strokeWidth="1.5" strokeDasharray="5,4" />
                  <text x={(280 + pos.x) / 2 + 8} y={(320 + pos.y) / 2} fontSize="10" fontWeight="700" fill={C.brown} stroke={C.bgCard} strokeWidth="3.5" paintOrder="stroke" strokeLinejoin="round">
                    l = {res.l.toFixed(1).replace(".", ",")} m
                  </text>
                  {/* Δh-maat links, zoals in de NPR-figuren */}
                  {Math.abs(320 - pos.y) > 16 && (
                    <g>
                      <line x1={pos.x - 14} y1={pos.y} x2="96" y2={pos.y} stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
                      <line x1="234" y1="320" x2="96" y2="320" stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
                      <line x1="102" y1={pos.y} x2="102" y2="320" stroke={C.brownText} strokeWidth="1" />
                      <polygon points={`99,${Math.min(pos.y, 320) + 7} 105,${Math.min(pos.y, 320) + 7} 102,${Math.min(pos.y, 320) + 1}`} fill={C.brownText} />
                      <polygon points={`99,${Math.max(pos.y, 320) - 7} 105,${Math.max(pos.y, 320) - 7} 102,${Math.max(pos.y, 320) - 1}`} fill={C.brownText} />
                      <text x="78" y={(pos.y + 320) / 2 + 4} fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brownText}>Δh</text>
                    </g>
                  )}
                </>
              )}
              {scene.layout === "dak" && (
                <>
                  {/* compleet plat dak van de flat (18,7 m in beeld, 30 px/m); het gebouw
                      loopt links, rechts en onder buiten beeld door */}
                  <rect x="0" y="200" width="560" height="10" fill="#E5DCC8" stroke={C.brownText} strokeWidth="1.2" />
                  <line x1="0" y1="200" x2="560" y2="200" stroke={C.brownText} strokeWidth="2.4" />
                  <rect x="0" y="210" width="560" height="100" fill={C.beigeLight} />
                  {[30, 120, 210, 300, 390, 480].map((x) => (
                    <g key={x}>
                      <rect x={x} y="230" width="44" height="38" fill="#FAF7EF" stroke={C.brownText} strokeWidth="1.5" />
                      <rect x={x - 3} y="268" width="50" height="6" fill="#E5DCC8" stroke={C.brownText} strokeWidth="0.8" />
                    </g>
                  ))}
                  <rect x="0" y="294" width="560" height="12" fill="#E0D5BC" stroke={C.brown} strokeWidth="0.8" />
                  <text x="280" y="303.5" fontSize="9" fontStyle="italic" fontWeight="600" fill={C.brownText} textAnchor="middle">
                    de flat loopt hieronder door
                  </text>
                  {/* liftopbouw links (buiten het sleepgebied), zonnepanelen rechts */}
                  <rect x="0" y="120" width="56" height="8" fill="#E5DCC8" stroke={C.brownText} strokeWidth="1.2" />
                  <rect x="0" y="128" width="52" height="72" fill={C.beigeLight} stroke={C.brownText} strokeWidth="2" />
                  <rect x="12" y="144" width="24" height="56" fill={C.brown} opacity="0.35" />
                  <polygon points="462,200 504,182 514,182 472,200" fill="#D9CDB8" stroke={C.brownText} strokeWidth="1.4" />
                  <polygon points="518,200 560,182 560,188 530,200" fill="#D9CDB8" stroke={C.brownText} strokeWidth="1.4" />
                  {/* schaalbalk (3 m) in de lucht */}
                  <line x1="440" y1="66" x2="530" y2="66" stroke={C.brownText} strokeWidth="2" />
                  <line x1="440" y1="61" x2="440" y2="71" stroke={C.brownText} strokeWidth="2" />
                  <line x1="530" y1="61" x2="530" y2="71" stroke={C.brownText} strokeWidth="2" />
                  <text x="485" y="58" fontSize="10" fontWeight="700" fill={C.brown} textAnchor="middle">3 m</text>
                  <rect x="42" y="20" width="476" height="24" rx="5" fill={C.bgCard} stroke={C.brown} strokeWidth="1" />
                  <text x="280" y="36" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">
                    het platte dak van de flat — de aanzuigopening (T) zuigt verse lucht voor de woningen aan
                  </text>
                  {toonZone && <VerbodenZone scene={scene} domein={domein} />}
                  {/* aanzuigkap T van de ventilatie (0,3 m boven het dak) */}
                  <rect x="114" y="184" width="12" height="16" fill={C.beigeLight} stroke={C.brownText} strokeWidth="1.8" />
                  <rect x="108" y="178" width="24" height="6" fill={C.brownText} />
                  {[188, 192, 196].map((y) => (
                    <line key={y} x1="116" y1={y} x2="124" y2={y} stroke="#2E86C1" strokeWidth="1.5" />
                  ))}
                  <text x="103" y="186" fontSize="11" fontWeight="700" fill="#2E86C1" textAnchor="end">T</text>
                  <rect x="10" y="56" width="216" height="20" rx="4" fill={C.bgCard} stroke={C.brown} strokeWidth="1" />
                  <text x="118" y="70" fontSize="10" fontWeight="700" fill="#2E86C1" textAnchor="middle">T — aanzuiging ventilatie (toevoer)</text>
                  <line x1="118" y1="76" x2="119" y2="176" stroke={C.brown} strokeWidth="0.8" opacity="0.5" />
                  {/* afvoerpijp van het dak omhoog tot de uitmonding — sleep verticaal om Δh te veranderen */}
                  <line x1={pos.x} y1={pos.y} x2={pos.x} y2="200" stroke={C.brownText} strokeWidth="3" />
                  {/* Δh-maat links (volgt de hoogte van de uitmonding) */}
                  <line x1={pos.x} y1={pos.y} x2="64" y2={pos.y} stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="112" y1="191" x2="64" y2="191" stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="70" y1={pos.y} x2="70" y2="191" stroke={C.brownText} strokeWidth="1" />
                  <polygon points={`67,${(pos.y + 6).toFixed(0)} 73,${(pos.y + 6).toFixed(0)} 70,${pos.y.toFixed(0)}`} fill={C.brownText} />
                  <polygon points="67,185 73,185 70,191" fill={C.brownText} />
                  <text x="46" y={(pos.y + 191) / 2 + 4} fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brownText} stroke={C.bgCard} strokeWidth="3.5" paintOrder="stroke" strokeLinejoin="round">Δh</text>
                  {/* maatlijn l (volgt de uitmonding) */}
                  <line x1="120" y1="191" x2={pos.x} y2={pos.y} stroke={C.brown} strokeWidth="1.5" strokeDasharray="5,4" />
                  <text x={(120 + pos.x) / 2} y={(191 + pos.y) / 2 - 6} fontSize="10" fontWeight="700" fill={C.brown} stroke={C.bgCard} strokeWidth="3.5" paintOrder="stroke" strokeLinejoin="round">
                    l = {res.l.toFixed(1).replace(".", ",")} m
                  </text>
                </>
              )}
              {scene.layout === "buren" && (
                <>
                  {/* straatwand op ooghoogte (7,0 × 5,0 m, 80 px/m): links jouw blinde kopgevel,
                      rechts tegen de bouwmuur het buurpand — beide lopen boven het beeld door */}
                  <rect x="0" y="0" width="306" height="378" fill="url(#metsel80)" />
                  <rect x="306" y="0" width="254" height="378" fill="url(#metsel80warm)" />
                  <rect x="0" y="332" width="306" height="46" fill="#E2D5BB" stroke={C.brown} strokeWidth="0.8" />
                  <rect x="306" y="0" width="8" height="378" fill={C.brown} opacity="0.18" />
                  <line x1="306" y1="0" x2="306" y2="378" stroke={C.brownText} strokeWidth="2.2" />
                  {/* stoep */}
                  <rect x="0" y="378" width="560" height="22" fill="#EAE0CC" />
                  <line x1="0" y1="378" x2="560" y2="378" stroke={C.brownText} strokeWidth="2.4" />
                  {Array.from({ length: 14 }, (_, i) => 20 + i * 40).map((x) => (
                    <line key={x} x1={x} y1="378" x2={x} y2="388" stroke={C.brown} strokeWidth="0.8" opacity="0.35" />
                  ))}
                  {/* buurpand: betonband, raam 1e verdieping (boven afgesneden) en portiekentree */}
                  <rect x="306" y="130" width="254" height="16" fill="#E5DCC8" stroke={C.brownText} strokeWidth="1.2" />
                  <rect x="380" y="0" width="96" height="58" fill="#FAF7EF" stroke={C.brownText} strokeWidth="1.8" />
                  <rect x="374" y="58" width="108" height="7" fill="#E5DCC8" stroke={C.brownText} strokeWidth="0.8" />
                  <rect x="428" y="178" width="132" height="10" fill="#E5DCC8" stroke={C.brownText} strokeWidth="1.2" />
                  <rect x="430" y="188" width="130" height="4" fill={C.brown} opacity="0.25" />
                  <rect x="452" y="192" width="76" height="186" fill="#FFFFFF" stroke={C.brownText} strokeWidth="2" />
                  <rect x="458" y="194" width="56" height="184" fill="#F0E9DA" stroke={C.brownText} strokeWidth="1" />
                  <rect x="514" y="194" width="14" height="184" fill="#FAF7EF" stroke={C.brownText} strokeWidth="1" />
                  <circle cx="508" cy="288" r="2.5" fill={C.brownText} />
                  <rect x="432" y="200" width="16" height="14" rx="2" fill={C.bgCard} stroke={C.brown} strokeWidth="1" />
                  <text x="440" y="210.5" fontSize="8" fontWeight="700" fill={C.brownText} textAnchor="middle">12</text>
                  {/* hemelwaterafvoer op jouw kopgevel, tot aan de stoep */}
                  <rect x="16" y="0" width="9" height="378" fill="#E8DFC9" stroke={C.brownText} strokeWidth="1.3" />
                  {[40, 150, 260, 350].map((y) => (
                    <rect key={y} x="13" y={y} width="15" height="5" fill="#E8DFC9" stroke={C.brownText} strokeWidth="1" />
                  ))}
                  {/* labels en schaal */}
                  <rect x="66" y="342" width="152" height="17" rx="4" fill={C.bgCard} stroke={C.brown} strokeWidth="1" />
                  <text x="142" y="354" fontSize="9" fontWeight="700" fill={C.brown} textAnchor="middle">jouw gebouw — kopgevel</text>
                  <rect x="440" y="156" width="104" height="17" rx="4" fill={C.bgCard} stroke={C.brown} strokeWidth="1" />
                  <text x="492" y="168" fontSize="9" fontWeight="700" fill={C.brown} textAnchor="middle">het buurpand</text>
                  <line x1="20" y1="392" x2="100" y2="392" stroke={C.brownText} strokeWidth="2" />
                  <line x1="20" y1="388" x2="20" y2="396" stroke={C.brownText} strokeWidth="2" />
                  <line x1="100" y1="388" x2="100" y2="396" stroke={C.brownText} strokeWidth="2" />
                  <text x="60" y="388" fontSize="8" fontWeight="700" fill={C.brown} textAnchor="middle" stroke="#EAE0CC" strokeWidth="3" paintOrder="stroke" strokeLinejoin="round">1 m</text>
                  <BreukRand x1={4} x2={296} y={5} />
                  <BreukRand x1={318} x2={556} y={5} />
                  <rect x="70" y="22" width="420" height="24" rx="5" fill={C.bgCard} stroke={C.brown} strokeWidth="1" />
                  <text x="280" y="38" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">
                    het rooster (T) zit op het buurpand — daar komt hun verse lucht binnen
                  </text>
                  {toonZone && <VerbodenZone scene={scene} domein={domein} />}
                  {/* rooster T op de gevel van het buurpand, 1,6 m boven de stoep */}
                  <rect x="340" y="242" width="24" height="16" fill="#2E86C1" stroke={C.brownText} strokeWidth="2" rx="2" />
                  {[246, 250, 254].map((y) => (
                    <line key={y} x1="344" y1={y} x2="360" y2={y} stroke="white" strokeWidth="1.5" />
                  ))}
                  <rect x="308" y="262" width="96" height="28" rx="3" fill={C.bgCard} opacity="0.92" stroke={C.brown} strokeWidth="1" />
                  <text x="356" y="273" fontSize="10" fontWeight="700" fill="#2E86C1" textAnchor="middle">T</text>
                  <text x="356" y="284" fontSize="7.5" fontWeight="600" fill="#2E86C1" textAnchor="middle">luchttoevoer buurpand</text>
                  {/* maatlijn l — label wijst van het rooster af (eind-anker) zodat het er nooit achter valt */}
                  <line x1="352" y1="250" x2={pos.x} y2={pos.y} stroke={C.brown} strokeWidth="1.5" strokeDasharray="5,4" />
                  <text x={(352 + pos.x) / 2 - 6} y={(250 + pos.y) / 2 - 8} fontSize="10" fontWeight="700" fill={C.brown} textAnchor="end" stroke={C.bgCard} strokeWidth="3.5" paintOrder="stroke" strokeLinejoin="round">
                    l = {res.l.toFixed(1).replace(".", ",")} m
                  </text>
                </>
              )}
              {scene.layout === "flat" && (
                <>
                  {/* flatgevel over de woningscheidende vloer heen (5,1 × 3,6 m, 110 px/m):
                      boven de band woon jij, eronder de onderburen met hun rooster */}
                  <rect x="0" y="0" width="560" height="400" fill="url(#metsel110)" />
                  <rect x="0" y="0" width="560" height="96" fill={C.brown} opacity="0.04" />
                  {/* woningscheidende vloer (0,22 m) — daarboven is de gevel van jouw woning */}
                  <rect x="0" y="96" width="560" height="24" fill="#E0D5BC" stroke={C.brown} strokeWidth="0.9" />
                  <text x="12" y="111" fontSize="8" fontStyle="italic" fontWeight="600" fill={C.brown} textAnchor="start">verdiepingsvloer</text>
                  <text x="280" y="58" fontSize="9" fontStyle="italic" fontWeight="700" fill={C.brown} textAnchor="middle" stroke={C.beigeLight} strokeWidth="3" paintOrder="stroke" strokeLinejoin="round">jouw woning</text>
                  {/* kozijn van de onderburen met het rooster in het bovenlicht */}
                  <rect x="224" y="146" width="112" height="154" fill="#FAF7EF" stroke={C.brownText} strokeWidth="2" />
                  <rect x="224" y="174" width="112" height="7" fill="#FFFFFF" stroke={C.brownText} strokeWidth="1.2" />
                  <line x1="240" y1="200" x2="298" y2="284" stroke={C.brown} strokeWidth="0.8" opacity="0.2" />
                  <rect x="218" y="300" width="124" height="8" fill="#E5DCC8" stroke={C.brownText} strokeWidth="0.8" />
                  {/* kozijnen van de buurwoningen, door de zijranden gesneden */}
                  <rect x="-8" y="146" width="86" height="154" fill="#FAF7EF" stroke={C.brownText} strokeWidth="1.8" />
                  <rect x="-8" y="300" width="92" height="8" fill="#E5DCC8" stroke={C.brownText} strokeWidth="0.8" />
                  <rect x="482" y="146" width="86" height="154" fill="#FAF7EF" stroke={C.brownText} strokeWidth="1.8" />
                  <rect x="478" y="300" width="90" height="8" fill="#E5DCC8" stroke={C.brownText} strokeWidth="0.8" />
                  {/* schaalbalk + breuklijn */}
                  <line x1="30" y1="378" x2="140" y2="378" stroke={C.brownText} strokeWidth="2" />
                  <line x1="30" y1="373" x2="30" y2="383" stroke={C.brownText} strokeWidth="2" />
                  <line x1="140" y1="373" x2="140" y2="383" stroke={C.brownText} strokeWidth="2" />
                  <text x="85" y="371" fontSize="10" fontWeight="700" fill={C.brown} textAnchor="middle">1 m</text>
                  <BreukRand x1={4} x2={556} y={396} />
                  <rect x="60" y="8" width="440" height="24" rx="5" fill={C.bgCard} stroke={C.brown} strokeWidth="1" />
                  <text x="280" y="24" fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brown} textAnchor="middle">
                    flatgevel — het rooster (T) is van de onderburen; jouw woning zit erboven
                  </text>
                  {toonZone && <VerbodenZone scene={scene} domein={domein} />}
                  {/* rooster T in het bovenlicht van de onderburen (0,55 m breed) */}
                  <rect x="250" y="154" width="60" height="16" fill="#2E86C1" stroke={C.brownText} strokeWidth="2" rx="2" />
                  {[158, 162, 166].map((y) => (
                    <line key={y} x1="256" y1={y} x2="304" y2={y} stroke="white" strokeWidth="1.5" />
                  ))}
                  <rect x="298" y="176" width="118" height="28" rx="3" fill={C.bgCard} opacity="0.92" stroke={C.brown} strokeWidth="1" />
                  <text x="306" y="188" fontSize="10" fontWeight="700" fill="#2E86C1" textAnchor="start">T — rooster</text>
                  <text x="306" y="199" fontSize="7.5" fontWeight="600" fill="#2E86C1" textAnchor="start">van de onderburen</text>
                  <line x1="312" y1="176" x2="300" y2="171" stroke={C.brown} strokeWidth="0.9" opacity="0.5" />
                  {/* Δh-maat links — in deze scène telt het hoogteverschil dubbel */}
                  {Math.abs(162 - pos.y) > 16 && (
                    <g>
                      <line x1={pos.x - 14} y1={pos.y} x2="116" y2={pos.y} stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
                      <line x1="246" y1="162" x2="116" y2="162" stroke={C.brownText} strokeWidth="1" strokeDasharray="3,3" />
                      <line x1="122" y1={pos.y} x2="122" y2="162" stroke={C.brownText} strokeWidth="1" />
                      <polygon points={`119,${Math.min(pos.y, 162) + 7} 125,${Math.min(pos.y, 162) + 7} 122,${Math.min(pos.y, 162) + 1}`} fill={C.brownText} />
                      <polygon points={`119,${Math.max(pos.y, 162) - 7} 125,${Math.max(pos.y, 162) - 7} 122,${Math.max(pos.y, 162) - 1}`} fill={C.brownText} />
                      <text x="98" y={(pos.y + 162) / 2 + 4} fontSize="11" fontWeight="700" fontStyle="italic" fill={C.brownText} stroke={C.bgCard} strokeWidth="3.5" paintOrder="stroke" strokeLinejoin="round">Δh</text>
                    </g>
                  )}
                  {/* maatlijn l */}
                  <line x1="280" y1="162" x2={pos.x} y2={pos.y} stroke={C.brown} strokeWidth="1.5" strokeDasharray="5,4" />
                  <text x={(280 + pos.x) / 2 + 8} y={(162 + pos.y) / 2} fontSize="10" fontWeight="700" fill={C.brown} stroke={C.bgCard} strokeWidth="3.5" paintOrder="stroke" strokeLinejoin="round">
                    l = {res.l.toFixed(1).replace(".", ",")} m
                  </text>
                </>
              )}
            </svg>
            <FreeDrag areaRef={areaRef} pos={pos} setPos={setPos} clamp={clamp} onRelease={handleRelease}>
              <div className="flex flex-col items-center select-none">
                <div
                  className="rounded-lg border-2 shadow-md px-2 py-1 text-xs font-bold"
                  style={{ backgroundColor: cur.kleurA ? (ok ? C.green : C.red) : C.olive, color: "white", borderColor: C.brownText }}
                >
                  A
                </div>
                {/* afvoerpijp wordt nu in de SVG getekend (verbonden met het dak) */}
              </div>
            </FreeDrag>
          </div>
        </div>

        <div className="flex flex-col gap-3 items-center">
          {cur.toonStoplicht ? <Verkeerslicht ok={ok} f={res.f} /> : <FWaarde f={res.f} verborgen={!fZichtbaar} />}
          <div className="rounded-xl border-2 px-3 py-2 w-44 text-center" style={{ backgroundColor: C.bgCard, borderColor: C.beigeMid }}>
            <div className="text-[10px] font-bold" style={{ color: C.brown }}>belasting</div>
            <div className="text-xl font-bold" style={{ color: C.brownText }}>B = {scene.B} kW</div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <HintBar text={hint} />
      </div>

      {popup && <FeedbackPopup type={popup.type} text={popup.text} onClose={popup.next} buttonText={popup.buttonText || "Naar de controlevraag"} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MISSIE 2 — RONDE 3: Combiketel-belasting (50%-regel)
// ─────────────────────────────────────────────────────────────────────────────

// Drie combiketels met afbouwende hulp: bij de eerste staat de berekening
// voorgedaan, bij de tweede alleen het stappenplan, de derde is zonder hulp.
// De berekening gaat in twee stappen (collega-feedback: reken de formule echt
// uit): eerst zelf 50% van de tapbelasting bepalen, dan de leidende belasting
// naar de rekenkaart slepen.
const COMBIS = [
  {
    cv: 24,
    tap: 32,
    correct: "24 kW",
    halveerOpties: ["16 kW", "32 kW", "12 kW"],
    opties: ["24 kW", "32 kW", "16 kW"],
    hulp: "vol",
    reden: "50% van tap = 0,5 × 32 = 16 kW. De CV-belasting (24 kW) is hoger → reken met 24 kW.",
  },
  {
    cv: 12,
    tap: 36,
    correct: "18 kW",
    halveerOpties: ["36 kW", "18 kW", "6 kW"],
    opties: ["12 kW", "36 kW", "18 kW"],
    hulp: "stappen",
    reden: "50% van tap = 0,5 × 36 = 18 kW. Dat is hoger dan de CV-belasting (12 kW) → reken met 18 kW.",
  },
  {
    cv: 30,
    tap: 24,
    correct: "30 kW",
    halveerOpties: ["15 kW", "12 kW", "24 kW"],
    opties: ["30 kW", "12 kW", "24 kW"],
    hulp: null,
    reden: "50% van tap = 0,5 × 24 = 12 kW. De CV-belasting (30 kW) is hoger → reken met 30 kW.",
  },
];

function M2R3({ onComplete, addScore, badDrop }) {
  const [combiIdx, setCombiIdx] = useState(0);
  const [hint, setHint] = useState(null);
  const [reden, setReden] = useState(null);
  const [halveerOk, setHalveerOk] = useState(false); // stap 1: 50% van tap zelf bepaald
  const [combiKlaar, setCombiKlaar] = useState(false);
  const [popup, setPopup] = useState(null);

  const combi = COMBIS[combiIdx];

  const kiesHalveer = (optie, point) => {
    if (!combi || halveerOk || combiKlaar) return;
    if (optie === `${combi.tap / 2} kW`) {
      addScore(5, point);
      playSound("drop");
      setHint(null);
      setHalveerOk(true);
    } else {
      badDrop(point);
      setHint(`Halveer de tapbelasting: ${combi.tap} ÷ 2. De CV-belasting laat je in deze stap nog buiten beschouwing.`);
    }
  };

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
    setHalveerOk(false);
    setReden(null);
    if (combiIdx + 1 >= COMBIS.length) {
      setPopup({
        type: "correct",
        text: "De 50%-regel zit erin: reken met het maximum van de CV-belasting of 50% van de tapbelasting — nooit optellen. Die belasting vul je in als B bij de verdunningsfactor.",
        next: onComplete,
      });
    } else {
      setCombiIdx((i) => i + 1);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center p-5">
      <StepBanner step={1} />
      <h2 className="text-xl font-bold italic mb-1" style={{ color: C.brownText }}>
        Ronde 3: Combiketel — met welke belasting reken je?
      </h2>

      {combi && (
        <>
          <p className="text-sm mb-3 max-w-xl text-center font-medium" style={{ color: C.brown }}>
            Een combiketel heeft twee belastingen: een voor verwarming (CV) en een voor warm water (tap). Voor de
            verdunningsfactor reken je met een waarde — bepaal per ketel welke, en sleep die naar de rekenkaart.
          </p>
          <OpdrachtKaart
            nr={combiIdx + 1}
            totaal={3}
            text={
              !halveerOk && !combiKlaar
                ? "Stap 1 — bepaal eerst hoeveel de tapfunctie meetelt: klik op 50% van de tapbelasting."
                : "Stap 2 — vergelijk met de CV-belasting en sleep de leidende belasting naar de rekenkaart."
            }
          />
          {combi.hulp && !combiKlaar && (
            <div className="rounded-xl border-2 px-4 py-2.5 max-w-xl w-full text-sm mt-3" style={{ backgroundColor: C.beigeLight, borderColor: C.beigeMid, color: C.brownText }}>
              <div className="font-bold mb-0.5">Zo pak je het aan:</div>
              {combi.hulp === "vol" ? (
                <div>
                  1. Halveer de tapbelasting: {combi.tap} ÷ 2 = <b>{combi.tap / 2} kW</b>. &nbsp;2. Vergelijk met de CV-belasting: <b>{combi.cv} kW</b>.
                  &nbsp;3. De hoogste van die twee is je rekenwaarde — sleep die naar de rekenkaart.
                </div>
              ) : (
                <div>1. Halveer de tapbelasting. &nbsp;2. Vergelijk met de CV-belasting. &nbsp;3. Sleep de hoogste van de twee naar de rekenkaart.</div>
              )}
            </div>
          )}

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
                    B voor de verdunningsfactor:
                  </div>
                  <div className="text-2xl font-bold" style={{ color: combiKlaar ? C.green : C.beigeMid }}>
                    {combiKlaar ? combi.correct : "?"}
                  </div>
                </div>
              )}
            />
          </div>

          {halveerOk && !combiKlaar && (
            <div className="rounded-xl border-2 px-4 py-2.5 max-w-xl w-full text-sm font-medium italic mb-2" style={{ backgroundColor: C.greenLight, borderColor: C.green, color: C.brownText }}>
              50% van tap = 0,5 × {combi.tap} = <b>{combi.tap / 2} kW</b>. Is dat meer of minder dan de CV-belasting ({combi.cv} kW)? De hoogste wint.
            </div>
          )}
          {reden && (
            <div className="rounded-xl border-2 px-4 py-2.5 max-w-xl w-full text-sm font-medium italic mb-2" style={{ backgroundColor: C.greenLight, borderColor: C.green, color: C.brownText }}>
              {reden}
            </div>
          )}
          <HintBar text={hint} />

          <div className="flex gap-3 flex-wrap justify-center mt-3 items-center">
            {combiKlaar ? (
              <GameButton onClick={handleCombiVolgende} variant="green">
                {combiIdx + 1 >= COMBIS.length ? "Afronden" : "Volgende toestel"}
                <ArrowRight className="w-4 h-4" />
              </GameButton>
            ) : !halveerOk ? (
              <>
                <span className="text-xs font-bold" style={{ color: C.brown }}>50% van {combi.tap} kW tap =</span>
                {combi.halveerOpties.map((o) => (
                  <button
                    key={o}
                    onClick={(e) => kiesHalveer(o, { x: e.clientX, y: e.clientY })}
                    className="rounded-xl border-2 px-4 py-2 text-sm font-bold transition-colors hover:brightness-95"
                    style={{ backgroundColor: C.bgCard, borderColor: C.brown, color: C.brownText }}
                  >
                    {o}
                  </button>
                ))}
              </>
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

      

      {popup && <FeedbackPopup type={popup.type} text={popup.text} onClose={popup.next} buttonText="Naar de controlevraag" />}
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
  const M1_MAX = 165; // 135 interactiepunten (12+5+7 drops + 2 constructiekliks + 1 beslisvraag, × 5) + 3 MC's × 10
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

const MAX_SCORE = 250; // 190 interactiepunten ((12+5+7+2+3+3 drops + 2 constructiekliks + 1 beslisvraag + 3 halveerstappen) × 5) + 6 MC's × 10

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
                "Rond het dak zijn 5 gebieden (I t/m V). I en II zijn vrij: 0 Pa. Vanaf III is er overdruk — aan de kust gelden hogere waarden dan in het binnenland (dat oefen je in ronde 3).",
                "Het overzicht hieronder kom je stap voor stap tegen: eerst zonder buurgebouw, daarna met een buurgebouw op ≥ 15 m en op < 15 m.",
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
                "Niet elk toestel kan tegen overdruk. B11 heeft geen ventilator: alleen gebied I, of gebied II met een stabiliserende kap.",
                "B22, B23 en type C kunnen overdruk wel aan. Je krijgt de twee figuren uit ronde 1: eerst het buurpand op ≥ 15 m, daarna op < 15 m.",
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
              titel="Ronde 3: Belemmering en het kustgebied"
              regels={[
                "Vanaf de uitmonding teken je het belemmeringsvlak: 15° naar links en rechts, en 10° schuin omhoog (het gearceerde vlak hieronder). Steekt het buurpand over de hele breedte boven dat vlak uit — het grijze gebied — dan is het belemmerend (a en b). Een slank gebouw is nooit belemmerend (c).",
                "Dit speelt alleen bij B11-toestellen (natuurlijke afvoer). Is een gebouw belemmerend, dan geldt: op ≥ 15 m mag een B11 alleen nog uitmonden met stabiliserende kap, binnen 15 m helemaal niet meer.",
              ]}
              figuur={<AfbFiguur3 />}
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
              title="Missie 2: De verdunningsfactor"
              buttonText="Aan de slag"
              onNext={next}
              text={
                "De plek is goed. Maar rookgas kan alsnog een raam of ventilatierooster bereiken —\n" +
                "ook van de buren. Rookgas dat als verse lucht naar binnen wordt gezogen is gevaarlijk.\n" +
                "Het moet daar zo verdund zijn dat het geen kwaad kan. Dat meet de verdunningsfactor."
              }
            />
          )}

          {screen === "m2r1" && (
            <RondeMetUitleg
              titel="Ronde 1: Waarom de verdunningsfactor?"
              regels={[
                "Rookgas uit een ketel verdwijnt niet zomaar — de wind kan het naar een raam of ventilatierooster blazen, ook van een ander gebouw. Daar wordt buitenlucht naar binnen gezogen.",
                "Dat mag alleen als het rookgas daar al sterk verdund is. De verdunningsfactor f is daarvoor de maat: hoe kleiner, hoe beter verdund.",
                "Het getal dat je onthoudt: f moet altijd kleiner zijn dan 0,01.",
              ]}
            >
              <VerdunningsRonde
                titel="Ronde 1: Waarom de verdunningsfactor?"
                intro="Versleep de uitmonding (A) en kijk wat het rookgas bij het rooster (T) doet. Alleen het loslaten telt!"
                opdrachten={VF_R1}
                eindTekst="Dat is waar de verdunningsfactor voor bestaat: rookgas mag een raam of rooster pas bereiken als het genoeg verdund is. De maat daarvoor is f — en de eis is altijd f < 0,01."
                onComplete={next}
                addScore={addScore}
                badDrop={badDrop}
              />
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
              titel="Ronde 2: De eis: f < 0,01"
              regels={[
                "Meer afstand tot het rooster = meer verdunning = kleinere f. Een groter hoogteverschil helpt ook; een zwaardere ketel heeft juist meer afstand nodig.",
                "Drie gebouwen, steeds minder hulp: eerst helpt het verkeerslicht je nog, daarna lees je f zelf af en vergelijk je met de eis — kleiner dan 0,01.",
              ]}
            >
              <VerdunningsRonde
                titel="Ronde 2: De eis: f < 0,01"
                intro="Versleep de uitmonding (A) en laat los — per gebouw krijg je minder hulp. Alleen het loslaten telt!"
                opdrachten={VF_R2}
                eindTekst="Meer vermogen vraagt meer afstand; hoogte helpt ook. En je hebt het net zonder verkeerslicht gedaan — het getal dat je onthoudt: f moet altijd onder 0,01 blijven."
                onComplete={next}
                addScore={addScore}
                badDrop={badDrop}
              />
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
              titel="Ronde 3: Combiketel — met welke belasting reken je?"
              regels={[
                "Een combiketel verwarmt en maakt warm water, maar nooit allebei tegelijk op vol vermogen. Tappen is bovendien een korte piek: warm water vraagt even veel vermogen, nooit lang achter elkaar.",
                "Daarom telt de tapbelasting maar voor de helft mee (dat mag volgens NEN 2757-1, zolang de tapbelasting onder 40 kW blijft). Reken met het hoogste van: de volledige CV-belasting of 50% van de tapbelasting. Nooit optellen.",
                "Je krijgt drie combiketels. Bij de eerste staat de berekening voorgedaan, bij de tweede alleen het stappenplan — de derde doe je helemaal zelf.",
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
              text="Je kunt nu een uitmonding veilig plaatsen: je kent de uitmondingsgebieden (en de hogere kustwaarden), je weet dat een B11 kritisch is en een C-toestel bijna overal mag, dat de verdunningsfactor altijd onder 0,01 moet blijven — en met welk vermogen je rekent bij een combiketel."
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
