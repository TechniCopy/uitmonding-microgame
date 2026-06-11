# Uitmondingen & Verdunningsafstand — microgame

Speelbare microgame voor MBO-studenten installatie-/CV-techniek (Vakmanschap CO, **Leerdoel 15**).
Gebaseerd op **NPR 3378-60:2022**. Eén game, twee missies, drie rondes per missie — elke ronde volgt
het patroon **interactie → MC-controle**.

## Inhoud

| Missie | Ronde | Interactie | NPR-bron |
|---|---|---|---|
| 1 — De juiste plek | 1 | Zone-labels slepen: uitmondingsgebieden I–V (plat dak, schuin dak, belendende bebouwing) | Figuur 1 + 2, § 5.1 |
| | 2 | Toesteltypes (B11, B22, B23, C) naar toegestane gebieden; B11 in gebied II → stabiliserende kap-animatie | § 5.2, § 5.3, § 6 |
| | 3 | Buurpand verslepen (belemmeringsvlak 15°, 15 m-regel) + geveldoorvoer t.o.v. perceelgrens (1 m / 2 m) | Figuur 3 + 10, § 5.1.3, § 8.2 |
| 2 — Verdunningsfactor | 1 | A/T plaatsen → modelsituatie-paspoort (situaties 1/3/4/5 met C₁/C₂) | Bijlage A, tabel 2 |
| | 2 | Uitmonding verslepen met verkeerslicht: live f = B / (C₁·l² + C₂·Δh²), eis f < 0,01 | § 9.2, § 9.3 |
| | 3 | 50%-regel combitoestellen + RGA/LTV-combinaties (B11, B22/B23, C42, C82) | § 9.2, § 7 |

## Spelregels

- Goede sleepactie **+5**, foute sleepactie **-5** (rood + terugveren + hint).
- MC-controle: per ronde een pool van 3 vragen, willekeurig gekozen; antwoordopties altijd
  Fisher-Yates-geshuffeld. Goed bij 1e poging **+10**, 2e poging **+5**, fout **-1 leven**.
- Bij een goed MC-antwoord toont de game de NPR-bronverwijzing (olijfgroen); bij fout niet.
- 5 levens; alles kwijt = game over (missie 2 blijft dan vergrendeld).
- Maximale score 225; eindscherm met 1–3 sterren.

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
