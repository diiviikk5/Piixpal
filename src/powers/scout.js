/* SCOUT: an onboarding tour guide. Scout hops from element to element, stands on each
 * one and holds up its flag while a spotlight and a card explain what it's for.
 *
 *   <button data-tour="Start a new project here">New</button>   mark the stops…
 *   <input data-tour="Search everything" data-tour-step="2">     (ordered by data-tour-step, then the page)
 *   <piix-pal pal="scout"></piix-pal>                             …and click Scout to begin
 *
 *   steps="#new: Start here | #search: Find anything"   or list the stops on the tag
 *   start="auto"     begin by itself, once per visitor
 *   el.ctl.start([{ el, text, title }])   el.ctl.end()
 *   Keyboard: → next, ← back, Esc ends. Events: piix:tour-step { index, total }, piix:tour-end { done } */

