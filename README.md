# Attico Liberty · Via Dante 28, Palermo

Tour 3D nel browser di un attico Liberty al settimo piano di via Dante 28, a Palermo.
Un solo file `index.html`, senza richieste di rete: si apre con un doppio clic.

## Come si apre

Apri `index.html` in Chrome, Safari o Firefox. Aggiungendo `?debug` all'indirizzo si attiva il registro
e l'oggetto `CASA.debug.ctx`.

## Come si ricostruisce

```
npm install
npm run build        # scrive index.html nella radice (massimo 2,0 MB)
npm test             # build, test di logica, test nel browser (serve Chrome)
npm run shots -- fase1   # screenshot in out/shots/fase1/
```

`npm run build -- --out out/prova/index.html` costruisce una copia senza toccare `index.html`.

## Struttura

- `spec/`: planimetria, arredi, stili, luce e tour in JSON, più i documenti di progetto.
- `src/`: moduli ES2020 (`core`, `mat`, `tex`, `arch`, `furn`, `light`, `nav`, `tour`, `audio`, `ui`).
- `tools/build.mjs`: unisce `src/main.js` in `index.html` con esbuild.
- `tests/`: test di logica (`unit.mjs`) e nel browser (`smoke.mjs`, `shots.mjs`).

Proposta d'arredo. Misure indicative ricavate dalla planimetria catastale.
