/* GIST: an owl that gives you the TL;DR. Click it and it skims your article, eyes
 * darting along the lines, then puts on its reading glasses and hands you the key points.
 * If the browser has its own AI summarizer ready (Chrome's built-in Summarizer), Gist uses
 * it, on the device. Otherwise it picks the sentences that say the most.
 *
 *   <article>
 *     <piix-pal pal="gist"></piix-pal>
 *     …
 *   </article>
 *
 *   points="3"         how many points
 *   button="#tldr"     a real button that asks for the summary
 *   el.ctl.summarize()    Event: piix:gist { points, source: "ai" | "pick" } */

