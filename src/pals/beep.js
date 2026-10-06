/* BEEP: a small robot with a big secret, guarding your "I'm not a robot" checkbox.
 * Job: sweats nervously when your cursor nears the checkbox. Tick it and Beep panics
 * and runs off; it creeps back a few seconds later, embarrassed. */
(() => {
  const body = [
    '....kk....',
    '....rk....',
    '..kkkkkk..',
    '.kmmmmmmk.',
    '.kmwkmwkm'.padEnd(10, 'k').slice(0, 10),
    '.kmmmmmmk.',
    '.kmmkkmmk.',
    '..kkkkkk..',
    '.kmmmmmmk.',
    '.kmmmmmmk.'
  ];
  const legs = { a: ['..k....k..'], b: ['...k..k...'], stand: ['..k....k..'] };
  const r = (rows, l, light) => art.put(rows, 4, 1, [light ? 'g' : 'r']).concat(legs[l]);
  const nervous = art.compose(body, [3, 4, ['wwkww'.slice(0, 5)]], [3, 6, ['kmmk'.replace('mm', 'kk')]]);
  defineSprite('beep', {
    w: 10, h: 11, scale: 3, does: 'captcha',
    palette: { k: '#17121f', m: '#c9d3ea', w: '#ffffff', r: '#ff4d6d', g: '#c6f432' },
    frames: {
      idle: [r(body, 'stand'), r(body, 'stand', true)],
      nervous: [r(nervous, 'stand'), r(art.shift(nervous, 1).map(x => x.slice(0, 10)), 'stand')],
      run: [r(nervous, 'a'), r(nervous, 'b')],
      shy: [r(art.put(body, 3, 4, ['kmmkm'.replace(/m/g, 'm')]), 'stand')]
    },
    fps: { idle: 1.5, nervous: 10, run: 12 }
  });
})();
