"use client";

/** iPhone / iPad (iPadOS se prezintă ca „Mac”, dar are ecran tactil). */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Pe iOS, Chrome / Firefox / Edge nu au recunoaștere vocală: doar Safari o are. */
export function isIOSNonSafari(): boolean {
  return isIOS() && /CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
}

/** Ce trebuie făcut ca să meargă microfonul, pe platforma curentă. */
export function micHelp(reason: "denied" | "dictation" | "unsupported"): string {
  if (isIOS()) {
    if (reason === "unsupported" || isIOSNonSafari())
      return "Pe iPhone, recunoașterea vocală merge doar în Safari. Deschide lecția în Safari sau scrie mesajele mai jos.";
    if (reason === "dictation")
      return "Pe iPhone, Safari folosește dictarea Apple: Setări → General → Tastatură → activează „Dictare”. Apoi încearcă din nou.";
    return "Pe iPhone: în Safari apasă „aA” din bara de adrese → Setări site web → Microfon → Permite. Dacă tot nu merge: Setări → Safari → Microfon → Permite, și Setări → General → Tastatură → „Dictare” pornită.";
  }
  if (reason === "unsupported") return "Browserul acesta nu are recunoaștere vocală. Folosește Chrome sau Edge, sau scrie mai jos.";
  return "Accesul la microfon a fost refuzat. Apasă pe lacătul din bara de adrese → Microfon → Permite, apoi încearcă din nou.";
}
