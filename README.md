# Uitmondingen & Verdunningsafstand — microgame

Speelbare microgame voor MBO-studenten installatie-/CV-techniek (Vakmanschap CO, **Leerdoel 15**).
Gebaseerd op **NPR 3378-60:2022**. Eén game, twee missies, drie rondes per missie — elke ronde volgt
het patroon **interactie → MC-controle**.

## Inhoud

| Missie | Ronde | Interactie | NPR-bron |
|---|---|---|---|
| 1 — De juiste plek | 1 | Zone-labels slepen: uitmondingsgebieden I–V in vijf NPR-figuren (plat dak, schuin dak < 23°, schuin dak ≥ 23°, belendende bebouwing op ≥ 15 m en op < 15 m) | Figuur 1a/1b/1c + 2a/2b, § 5.1 |
| | 2 | Toesteltypes (B11, B22, B23, C) naar toegestane gebieden, in dezelfde twee figuur 2-situaties; B11 in gebied II → stabiliserende kap-animatie, en bij < 15 m mag B11 alleen nog in gebied I | § 5.1.3, § 5.2, § 5.3, § 6 |
| | 3 | Buurpand verslepen: het belemmeringsvlak (15° horizontaal, 10° diagonaal), de slanke-toren-uitzondering en de 15 m-regel | Figuur 3, § 5.1.3 |
| 2 — Verdunningsfactor | 1 | A/T plaatsen → modelsituatie-paspoort (situaties 1/3/4/5 met C₁/C₂) | Bijlage A, tabel 2 |
| | 2 | Uitmonding verslepen met verkeerslicht: live f = √B / (C₁·l + C₂·Δh), eis f < 0,01 | § 9.2, § 9.3 |
| | 3 | 50%-regel combitoestellen + RGA/LTV-combinaties (B11, B22/B23, C42, C82) | § 9.2, § 7 |

## Spelregels

- Goede sleepactie **+5**, foute sleepactie **-5** (rood + terugveren + hint).
- MC-controle: per ronde een pool van 3 vragen, willekeurig gekozen; antwoordopties altijd
  Fisher-Yates-geshuffeld. Goed bij 1e poging **+10**, 2e poging **+5**, fout **-1 leven**.
- Bij een goed MC-antwoord toont de game de NPR-bronverwijzing (olijfgroen); bij fout niet.
- 5 levens; alles kwijt = game over (missie 2 blijft dan vergrendeld).
- Maximale score 245; eindscherm met 1–3 sterren.

## Bediening voor beheerders

- **Ctrl+D** (Cmd+D op Mac) of `?debug=1` opent het controlemenu: spring direct naar elke
  missie/ronde/MC/scherm. Score en levens worden gereset bij een sprong. Esc sluit het menu.

## Tech

React + Vite + Tailwind + lucide-react, geen backend. Drag & drop via custom pointer events
(desktop én tablet, inclusief tik-om-te-plaatsen). Alle tekeningen zijn SVG-in-code, nagebouwd
volgens de figuren uit NPR 3378-60:2022.

```bash
npm install
npm run dev      # ontwikkelserver
npm run build    # productie-build in dist/
```

---
Studium B.V. — Vakmanschap CO · Leerdoel 15
