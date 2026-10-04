/** Linkuri de referință pentru ghidul de semne (deschise în fila browserului, nu copiate). */

const SIGNASL_SLUG: Record<string, string> = {
  TV: "tv",
  callonphone: "call",
  thankyou: "thank-you",
  frenchfries: "french-fries",
  icecream: "ice-cream",
  glasswindow: "window",
  haveto: "have-to",
  hesheit: "he",
  minemy: "my",
  weus: "we",
  owie: "hurt",
  shhh: "quiet",
};

/** Video ASL pe SignASL.org (dicționar public de semne ASL). */
export function aslReferenceUrl(gloss: string) {
  return `https://www.signasl.org/sign/${SIGNASL_SLUG[gloss] ?? gloss.toLowerCase()}`;
}

/** Căutarea cuvântului în DLMG — dicționarul limbajului mimico-gestual românesc. */
export function dlmgSearchUrl(word: string) {
  return `https://dlmg.ro/?s=${encodeURIComponent(word.toLowerCase())}`;
}
