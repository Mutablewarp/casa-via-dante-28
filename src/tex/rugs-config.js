/** Tavolozze e struttura dei motivi persiani (stile Liberty). Solo dati. */

/**
 * Per ogni motivo:
 * pal = field campo, dark scuro, main colore principale, ivory avorio, gold oro/accento, band fondo della greca,
 * guard guardia interna, outline contorni, m1 e m2 colori della greca, fl = colori dei fiori del campo.
 * greca = hook | vine | kufic | stripes; medal = stepped | oval | lozenge | round | repeat | none;
 * fill = sparse | flowers | lattice | vines | gul | plain; bw = larghezza del bordo rispetto al lato corto.
 */
export const PERSIAN = {
  heriz: {
    pal: { field: '#a8452f', dark: '#1f2f55', main: '#c4603f', ivory: '#e8dcbc', gold: '#d4a24a', band: '#233862', guard: '#8a3524', outline: '#16203d', m1: '#e8dcbc', m2: '#b24a30', fl: ['#1f2f55', '#e8dcbc', '#d4a24a'] },
    greca: 'hook', medal: 'stepped', fill: 'sparse', bw: 0.15, corners: true,
  },
  tabriz: {
    pal: { field: '#9b1f35', dark: '#2a3f73', main: '#cf9f45', ivory: '#ead9ab', gold: '#cf9f45', band: '#d9c38a', guard: '#7a1a2c', outline: '#3a1620', m1: '#9b1f35', m2: '#2a3f73', fl: ['#2a3f73', '#cf9f45', '#ead9ab', '#c9566b'] },
    greca: 'vine', medal: 'oval', fill: 'flowers', bw: 0.13, corners: true,
  },
  kashan: {
    pal: { field: '#1b2a52', dark: '#101a38', main: '#a02a2f', ivory: '#e6d9b8', gold: '#c99a4a', band: '#8e2429', guard: '#14204a', outline: '#0e1630', m1: '#e6d9b8', m2: '#1b2a52', fl: ['#a02a2f', '#e6d9b8', '#c99a4a'] },
    greca: 'kufic', medal: 'lozenge', fill: 'lattice', bw: 0.18, corners: true,
  },
  isfahan_chiaro: {
    pal: { field: '#ece3cc', dark: '#5f86a6', main: '#8fb4cf', ivory: '#f4ecd8', gold: '#c9aa66', band: '#bcd2e0', guard: '#d9cfb4', outline: '#7d96a8', m1: '#c78f95', m2: '#5f86a6', fl: ['#8fb4cf', '#c78f95', '#c9aa66'] },
    greca: 'vine', medal: 'round', fill: 'vines', bw: 0.12, corners: true,
  },
  isfahan_seta: {
    pal: { field: '#efe6d2', dark: '#6f93ad', main: '#a3c4d8', ivory: '#f6eedb', gold: '#c9aa66', band: '#e6d3c0', guard: '#dcd0b6', outline: '#8a9aa6', m1: '#cf9aa0', m2: '#6f93ad', fl: ['#a3c4d8', '#cf9aa0', '#c9aa66'] },
    greca: 'vine', medal: 'round', fill: 'vines', bw: 0.12, corners: true,
  },
  bukhara: {
    pal: { field: '#6e1a1f', dark: '#1e1614', main: '#8e2a28', ivory: '#d9ccaa', gold: '#b8923e', band: '#3a1214', guard: '#4e1418', outline: '#140c0b', m1: '#d9ccaa', m2: '#8e2a28', fl: ['#1e1614', '#d9ccaa', '#8e2a28'] },
    greca: 'kufic', medal: 'none', fill: 'gul', bw: 0.1, corners: false,
  },
  passatoia: {
    pal: { field: '#9a2a2c', dark: '#243b66', main: '#c04a40', ivory: '#e4d8b8', gold: '#c99a4a', band: '#243b66', guard: '#7c2022', outline: '#141f38', m1: '#e4d8b8', m2: '#9a2a2c', fl: ['#243b66', '#e4d8b8', '#c99a4a'] },
    greca: 'hook', medal: 'repeat', fill: 'sparse', bw: 0.17, corners: false,
  },
  bagno: {
    pal: { field: '#f0e8d6', dark: '#7fa8c4', main: '#9ec3da', ivory: '#f6f0e2', gold: '#d8c9a4', band: '#f0e8d6', guard: '#e4dac2', outline: '#7fa8c4', m1: '#9ec3da', m2: '#9ec3da', fl: ['#9ec3da', '#c4dae8'] },
    greca: 'stripes', medal: 'none', fill: 'plain', bw: 0.12, corners: false,
  },
}

/** Nomi dei motivi persiani (i tappeti `heriz_grande` usano il disegno `heriz`). */
export const RUG_ALIAS = { heriz_grande: 'heriz' }
