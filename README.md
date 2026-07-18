# Uitmondingen & Verdunningsafstand — microgame

Speelbare microgame voor MBO-studenten installatie-/CV-techniek (Vakmanschap CO, **Leerdoel 15**).
Gebaseerd op **NPR 3378-60:2022**. Een game, twee missies, drie rondes per missie — elke ronde volgt
het patroon **interactie → MC-controle**.

## Inhoud

| Missie | Ronde | Interactie | NPR-bron |
|---|---|---|---|
| 1 — De juiste plek | 1 | Zone-labels slepen in vijf NPR-figuren (plat dak, schuin dak < 23°, schuin dak ≥ 23°, belendende bebouwing op ≥ 15 m en < 15 m). Zones zijn neutraal gearceerd tot een goede plaatsing (spelen op inzicht, niet op kleur); bij 1c en 2a construeert de cursist eerst zelf de grenslijn (trechter/hmin, 10°-lijn); lesmoment stabiliserende kap bij gebied II | Figuur 1a/1b/1c + 2a/2b, § 5.1 |
| | 2 | Kust of binnenland: op de kaart van Nederland (replica figuur B.1 uit echte geodata) de juiste overdrukwaarden naar twee woningen slepen, met referentietabel — twee delen dekken gebied III, IV en V voor kust en binnenland, met instinkers uit de verkeerde kolom | § 5.1.2, bijlage B |
| | 3 | Toesteltypes (B11, B22, B23, C) naar toegestane gebieden, met toestel-paspoortjes permanent in beeld; B11 in gebied II → stabiliserende kap-animatie met label, en bij < 15 m mag B11 alleen nog in gebied I | § 5.1.3, § 5.2, § 5.3, § 6 |
| | 4 | Buurpand verslepen: het belemmeringsvlak, de slanke-toren-uitzondering en de 15 m-regel; daarna drie situaties zelf beoordelen zonder kleurhulp, en een afsluitende beslisvraag (wat doet de installateur bij belemmering < 15 m?) | Figuur 3, § 5.1.3 |
| 2 — Verdunningsfactor | 1 | Waarom: zet de uitmonding bij het rooster (rood licht) en sleep hem vrij (groen) — f als maat voor verdunning bij een raam/rooster; ingezoomd gevelfragment van jouw woning | § 9.1, § 9.2 |
| | 2 | Drie realistische flat-situaties (rooster op het buurpand, plat flatdak, rooster van de onderburen in dezelfde gevel) met afbouwende hulp: eerst verkeerslicht, daarna is f tijdens het slepen verborgen — pas bij loslaten lees je af en vergelijk je met 0,01 | § 9.2 |
| | 3 | Combiketel (50%-regel, incl. het waarom uit NEN 2757-1) in twee actieve rekenstappen: eerst zelf 50% van de tapbelasting bepalen, dan de leidende belasting slepen; afbouwende hulp | § 9.2 |

## Spelregels

- Goede sleep- of klikactie **+5**, foute actie **-5** (rood + terugveren + hint).
- MC-controle: per ronde een pool van 3 vragen, willekeurig gekozen; antwoordopties altijd
  Fisher-Yates-geshuffeld. Goed bij 1e poging **+10**, 2e poging **+5**, fout **-1 leven**.
- Bij een goed MC-antwoord toont de game de NPR-bronverwijzing (olijfgroen); bij fout niet.
- 5 levens; alles kwijt = game over (missie 2 blijft dan vergrendeld).
- Maximale score 285; eindscherm met 1–3 sterren.

## Bediening voor beheerders

- **Ctrl+D** (Cmd+D op Mac) of `?debug=1` opent het controlemenu: spring direct naar elke
  missie/ronde/MC/scherm. Score en levens worden gereset bij een sprong. Esc sluit het menu.

## Tech

React + Vite + Tailwind + lucide-react, geen backend. Drag & drop via custom pointer events
(desktop en tablet, inclusief tik-om-te-plaatsen). Alle tekeningen zijn SVG-in-code, nagebouwd
volgens de figuren uit NPR 3378-60:2022.

```bash
npm install
npm run dev      # ontwikkelserver
npm run build    # productie-build in dist/
```

---
Studium B.V. — Vakmanschap CO · Leerdoel 15
