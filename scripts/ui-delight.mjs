// Pixel UI docs: delight. Small website moments: a scratch card, a zipper, a receipt printer.
const SOUND = ['sound', 'make sounds even without <code>&lt;piix-chiptune&gt;</code>; <code>off</code> keeps it silent', ''];
const COUPON = 'padding:26px 32px;background:#fbf8f1;box-shadow:inset 0 0 0 3px #17121f;text-align:center;color:#17121f';

export const DELIGHT_PAGES = [
  { slug: 'scratch', name: 'Scratch card', section: 'Delight', tag: 'piix-scratch', file: 'scratch',
    brief: 'A scratch-off card: pixel foil over your content. Scratch it away.',
    about: 'Whatever is inside sits under a sheet of pixel foil with a sheen, a pattern and a label. Drag over it with a mouse, finger or pen and the foil comes off in pixel blocks, curling away as shavings that fall. Once most of it is gone, the rest flakes off by itself. Until then the content inside cannot be tabbed into; keyboard and screen-reader users get a real button that reveals it at once.',
    demo: `<piix-scratch>
  <div style="${COUPON}">
    <h3 style="margin:0 0 6px">You won 20% off</h3>
    <code style="font-size:28px;letter-spacing:.1em">PIXEL20</code>
  </div>
</piix-scratch>`,
    stage: { h: 300, light: true, hint: 'Scratch the foil' },
    controls: [['foil', 'Foil', 'seg', ['silver', 'gold', 'holo', 'ink'], 'silver'], ['grain', 'Grain', 'seg', ['4', '6', '9'], '6']],
    examples: [
      { name: 'Gold, for the big prize', demo: `<piix-scratch foil="gold" label="Prize!" brush="34">\n  <div style="${COUPON};width:260px">\n    <b style="font-size:40px">FREE</b><br>shipping, forever\n  </div>\n</piix-scratch>`, stage: { h: 280, light: true } },
      { name: 'React to the reveal', note: 'Listen for <code>reveal</code>, or <code>scratch</code> to follow the progress.',
        demo: `<piix-scratch id="tix" foil="holo" label="Your ticket">\n  <div style="${COUPON}">Seat <b>14C</b></div>\n</piix-scratch>\n<p id="tixOut">Scratch to find your seat.</p>\n\n<script>\n  tix.addEventListener('reveal', () => tixOut.textContent = 'Enjoy the show!');\n</script>`, stage: { h: 280, light: true } }
    ],
    props: [['foil', '<code>silver</code> <code>gold</code> <code>holo</code> <code>ink</code>', 'silver'], ['label', 'the text printed on the foil', 'SCRATCH ME'], ['grain', 'the size of one foil pixel, in px', '6'], ['brush', 'how wide you scratch, in px', '22'], ['reveal', 'how much must be scratched before it all comes off, 0 to 1', '.55'], SOUND],
    events: [['scratch', 'foil came off: <code>detail.progress</code>, 0 to 1'], ['reveal', 'it is all off']],
    methods: [['reveal()', 'take all the foil off now'], ['reset()', 'put fresh foil back on']],
    a11y: ['Until it is revealed, the content is inert: nothing under the foil can be focused by accident.', 'A real button sits on the card for keyboards and screen readers; Enter or Space reveals it.', 'With reduced motion the foil comes off at once instead of flaking.'] },

  { slug: 'zipper', name: 'Zipper', section: 'Delight', tag: 'piix-zipper', file: 'zipper',
    brief: 'A zipped-up panel of pixel fabric over your content. Pull it open.',
    about: 'A panel of fabric with a zip down the middle covers whatever is inside. Grab the pull and drag it down: the teeth come apart and the halves part in a V that widens above the pull, like a real zip. Let go halfway and it stays halfway. Pull it nearly to the bottom and it gives way: the halves fall aside and the content is yours. The pull is a real slider for keyboards.',
    demo: `<piix-zipper>
  <div style="height:280px;padding:32px;background:#6b4cff;color:#fff">
    <h2 style="margin:0 0 8px;font-size:40px">Something new.</h2>
    <p>Hidden until you unzip it.</p>
  </div>
</piix-zipper>`,
    stage: { light: true, block: true, pad: 40, hint: 'Drag the pull down' },
    controls: [['fabric', 'Fabric', 'seg', ['denim', 'leather', 'lime', 'ink'], 'denim'], ['teeth', 'Teeth', 'seg', ['brass', 'silver', 'lime'], 'brass']],
    examples: [
      { name: 'A leather wallet', demo: `<piix-zipper fabric="leather" teeth="silver" style="width:320px">\n  <div style="height:200px;padding:24px;background:#fbf8f1;color:#17121f">\n    <b>Balance</b>\n    <div style="font-size:44px;font-weight:800">$1,280</div>\n  </div>\n</piix-zipper>`, stage: { h: 300, light: true } },
      { name: 'Open it from code', note: '<code>open()</code> unzips all the way, <code>close()</code> zips it back up.',
        demo: `<piix-zipper id="bag" fabric="ink" teeth="lime" style="width:320px">\n  <div style="height:180px;padding:24px;background:#c6f432;color:#17121f"><b>Surprise!</b></div>\n</piix-zipper>\n<piix-button tone="ink" size="sm" onclick="bag.open()">Open</piix-button>\n<piix-button tone="lime" size="sm" onclick="bag.close()">Close</piix-button>`, stage: { h: 300, light: true } }
    ],
    props: [['fabric', '<code>denim</code> <code>leather</code> <code>lime</code> <code>ink</code>', 'denim'], ['teeth', '<code>brass</code> <code>silver</code> <code>lime</code>', 'brass'], ['pixel', 'size of one pixel, in px', '3'], SOUND],
    events: [['pull', 'the pull moved: <code>detail.progress</code>, 0 at the top to 1 at the bottom'], ['open', 'it gave way and the content is uncovered']],
    methods: [['open()', 'unzip all the way'], ['close()', 'zip it back up']],
    a11y: ['The pull is a slider: arrow keys move it, Enter or End opens it all, Home closes it.', 'Until it is open, the content is inert, so it cannot be tabbed into behind the fabric.', 'With reduced motion the halves are gone at once instead of falling.'] },

  { slug: 'receipt', name: 'Receipt printer', section: 'Delight', tag: 'piix-receipt', file: 'receipt',
    brief: 'A little thermal printer that prints your content, line by line.',
    about: 'When it scrolls into view the printer wakes up, its light blinks and the paper feeds out one line at a time, each one swept on by the print head. Headings print as big pixel titles, <code>&lt;hr&gt;</code> as a dashed rule, and anything with <code>data-price</code> gets a dotted leader out to its price. When it is done, TEAR rips it off along a zigzag. Your markup stays real the whole time: readable, selectable and searchable.',
    demo: `<piix-receipt width="300px">
  <h3>Piixpal Store</h3>
  <p data-center>#0042 · 19 Oct 2026</p>
  <hr>
  <p data-price="$12.00">Pixel pal (kitty)</p>
  <p data-price="$4.00">Extra pats</p>
  <hr>
  <p data-price="$16.00" data-total>Total</p>
  <p data-center>Thanks for shopping!</p>
</piix-receipt>`,
    stage: { h: 480, light: true, replay: true },
    examples: [
      { name: 'Your year, printed', note: 'Anything goes on the paper: here, a year-end summary.',
        demo: `<piix-receipt width="280px" speed="5">\n  <h3>2026 Wrapped</h3>\n  <p data-price="1,412">Commits</p>\n  <p data-price="38">Pals shipped</p>\n  <p data-price="∞">Pats given</p>\n  <hr>\n  <p data-center>See you in 2027</p>\n</piix-receipt>`, stage: { h: 400, light: true } },
      { name: 'Print on demand', note: 'With <code>start="manual"</code> it waits for <code>print()</code>.',
        demo: `<piix-receipt id="order" start="manual" width="260px">\n  <h3>Order #77</h3>\n  <p data-price="$9.00">Pixel tee</p>\n  <p data-price="$9.00" data-total>Total</p>\n</piix-receipt>\n<piix-button tone="ink" size="sm" onclick="order.print()">Checkout</piix-button>`, stage: { h: 360, light: true } }
    ],
    props: [['width', 'the paper width', '320px'], ['speed', 'lines a second', '7'], ['start', '<code>view</code>: print when it scrolls into view. <code>manual</code>: wait for <code>print()</code>', 'view'], SOUND,
      ['data-price', 'on a line inside: a dotted leader out to this price', ''], ['data-total', 'on a line inside: bold and a little bigger', ''], ['data-center', 'on a line inside: centred', '']],
    events: [['printed', 'the last line is out'], ['tear', 'it was torn off']],
    methods: [['print()', 'print it (again)'], ['tear()', 'tear it off'], ['reset()', 'back into the printer']],
    a11y: ['The paper is your own markup, readable by screen readers from the start, not only once printed.', 'TEAR is a real button.', 'With reduced motion it prints all at once.'] }
];
export const DELIGHT_THUMBS = {
  'scratch': '<piix-scratch label="Scratch" grain="5"><div style="padding:18px 26px;background:#fbf8f1;box-shadow:inset 0 0 0 3px #17121f;font:800 24px Bricolage Grotesque,system-ui;color:#17121f">20% OFF</div></piix-scratch>',
  'zipper': '<piix-zipper style="width:70%;pointer-events:none"><div style="height:110px;background:#6b4cff"></div></piix-zipper>',
  'receipt': '<piix-receipt width="150px" speed="12" style="font-size:9px;pointer-events:none"><h3>Receipt</h3><p data-price="$12">Pal</p><p data-price="$12" data-total>Total</p></piix-receipt>'
};
