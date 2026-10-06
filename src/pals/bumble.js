/* BUMBLE: a fuzzy little bee who naps on your element.
 * Job: wakes up when your cursor comes by, follows you around the page, and flies
 * home for another nap when you stop moving. Poke it for a loop-the-loop. */
(() => {
  const up = [
    '.kk........kk.',
    'kwwk......kwwk',
    'kwwwk....kwwwk',
    '.kwwkkkkkkwwk.'
  ];
  const down = [
    '..............',
    '..............',
    '.kkk......kkk.',
    'kwwwkkkkkkwwwk'
  ];
  const body = (eyes) => [
    '...kyyyyyyk...',
    '..kyY' + 'yyyyyyk..'.slice(0, 9),
    ...eyes,
    '..kkkkkkkkkk..',
    '..kyyyyyyyyk..',
    '..kkkkkkkkkk..',
    '...kyyyyyyk...',
    '....kkkkkk....',
    '......kk......'
  ];
  const EYES = {
    open: ['..kywwyywwyk..', '..kywkyywkyk..'],
    shut: ['..kyyyyyyyyk..', '..kykkyykkyk..'],
    happy: ['..kykkyykkyk..', '..kkyykkyyk...'.slice(0, 14).padEnd(14, '.')]
  };
  /* wings on top of a body (the body's first row overlaps the wing base) */
  const bee = (wings, eyes = 'open') => wings.concat(body(EYES[eyes]));

  defineSprite('bumble', {
    w: 14, h: 15, scale: 3,
    does: 'follow',
    palette: { k: '#17121f', y: '#ffd23f', Y: '#fff2a8', w: '#e4f6ff' },
    frames: {
      fly: [bee(up), bee(down)],
      happy: [bee(up, 'happy'), bee(down, 'happy')],
      sleep: [bee(down, 'shut')],
      perch: [bee(down), bee(down), bee(down), bee(down, 'shut')]
    },
    fps: { fly: 20, happy: 22, sleep: 1, perch: 3 }
  });
})();
