/* toy box: things you can throw around the page (do="toss") */
(() => {
  const K = '#17121f';
  /* DICE: lands on a random face. Every throw is a decision. */
  const pips = {
    1: [[3, 3]], 2: [[1, 1], [5, 5]], 3: [[1, 1], [3, 3], [5, 5]], 4: [[1, 1], [5, 1], [1, 5], [5, 5]],
    5: [[1, 1], [5, 1], [3, 3], [1, 5], [5, 5]], 6: [[1, 1], [5, 1], [1, 3], [5, 3], [1, 5], [5, 5]]
  };
  const blank = ['.kkkkkkk.', 'kwwwwwwwk', 'kwwwwwwwk', 'kwwwwwwwk', 'kwwwwwwwk', 'kwwwwwwwk', 'kwwwwwwwk', 'kwwwwwwwk', '.kkkkkkk.'];
  const face = n => pips[n].reduce((rows, [x, y]) => art.put(rows, x + 1, y + 1, [n === 1 ? 'r' : 'k']), blank);
  const faces = {};
  for (let n = 1; n <= 6; n++) faces['f' + n] = [face(n)];
  defineSprite('dice', {
    w: 9, h: 9, scale: 4, does: 'toss',
    toss: { bounce: .38, friction: 6, faces: true },
    palette: { k: K, w: '#ffffff', r: '#ff4d6d' },
    frames: { ...faces, roll: [face(1), face(4), face(2), face(6), face(3), face(5)] },
    fps: { roll: 14 }
  });
})();
