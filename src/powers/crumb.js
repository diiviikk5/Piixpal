/* CRUMB: a mouse that eats your cookie banner. It sits on the banner sniffing at it;
 * the moment a visitor clicks Accept or Reject, Crumb tucks in and eats the whole thing,
 * bite by bite, crumbs flying, then pats its belly and waddles off.
 *
 *   <div id="cookie-banner"> … <button>Accept</button> <button>Reject</button>
 *     <piix-pal pal="crumb"></piix-pal>
 *   </div>
 *
 * Your banner's own buttons still do their job: Crumb eats a stand-in copy, so your code
 * can hide or remove the real one straight away.   Event: piix:eaten */

