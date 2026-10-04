import type { SignDef } from "../signs";
import type { SemaforState } from "../types";

/**
 * Glosarul ASL → română pentru cele 250 de semne ale modelului (Google ISLR / PopSign).
 * Semnele recunoscute sunt semne ASL (limbajul american); aici traducem doar cuvântul.
 */
export const ASL_RO: Record<string, string> = {
  TV: "televizor", after: "după", airplane: "avion", all: "tot", alligator: "aligator", animal: "animal",
  another: "altul", any: "oricare", apple: "măr", arm: "braț", aunt: "mătușă", awake: "treaz",
  backyard: "curte", bad: "rău", balloon: "balon", bath: "baie", because: "pentru că", bed: "pat",
  bedroom: "dormitor", bee: "albină", before: "înainte", beside: "lângă", better: "mai bine", bird: "pasăre",
  black: "negru", blow: "a sufla", blue: "albastru", boat: "barcă", book: "carte", boy: "băiat",
  brother: "frate", brown: "maro", bug: "gândac", bye: "la revedere", callonphone: "a suna la telefon",
  can: "a putea", car: "mașină", carrot: "morcov", cat: "pisică", cereal: "cereale", chair: "scaun",
  cheek: "obraz", child: "copil", chin: "bărbie", chocolate: "ciocolată", clean: "curat", close: "a închide",
  closet: "dulap", cloud: "nor", clown: "clovn", cow: "vacă", cowboy: "cowboy", cry: "a plânge", cut: "a tăia",
  cute: "drăguț", dad: "tata", dance: "a dansa", dirty: "murdar", dog: "câine", doll: "păpușă",
  donkey: "măgar", down: "jos", drawer: "sertar", drink: "a bea", drop: "a scăpa", dry: "uscat",
  dryer: "uscător", duck: "rață", ear: "ureche", elephant: "elefant", empty: "gol", every: "fiecare",
  eye: "ochi", face: "față", fall: "a cădea", farm: "fermă", fast: "repede", feet: "picioare", find: "a găsi",
  fine: "bine", finger: "deget", finish: "gata", fireman: "pompier", first: "primul", fish: "pește",
  flag: "steag", flower: "floare", food: "mâncare", for: "pentru", frenchfries: "cartofi prăjiți",
  frog: "broască", garbage: "gunoi", gift: "cadou", giraffe: "girafă", girl: "fată", give: "a da",
  glasswindow: "fereastră", go: "a merge", goose: "gâscă", grandma: "bunica", grandpa: "bunicul",
  grass: "iarbă", green: "verde", gum: "gumă de mestecat", hair: "păr", happy: "fericit", hat: "pălărie",
  hate: "a urî", have: "a avea", haveto: "trebuie", head: "cap", hear: "a auzi", helicopter: "elicopter",
  hello: "bună", hen: "găină", hesheit: "el / ea", hide: "a ascunde", high: "sus", home: "acasă",
  horse: "cal", hot: "fierbinte", hungry: "flămând", icecream: "înghețată", if: "dacă", into: "în",
  jacket: "geacă", jeans: "blugi", jump: "a sări", kiss: "pupic", kitty: "pisicuță", lamp: "lampă",
  later: "mai târziu", like: "a plăcea", lion: "leu", lips: "buze", listen: "a asculta", look: "a privi",
  loud: "tare", mad: "supărat", make: "a face", man: "bărbat", many: "mulți", milk: "lapte",
  minemy: "al meu", mitten: "mănușă", mom: "mama", moon: "lună", morning: "dimineață", mouse: "șoarece",
  mouth: "gură", nap: "somn scurt", napkin: "șervețel", night: "noapte", no: "nu", noisy: "gălăgios",
  nose: "nas", not: "nu", now: "acum", nuts: "nuci", old: "bătrân", on: "pe", open: "a deschide",
  orange: "portocaliu", outside: "afară", owie: "doare", owl: "bufniță", pajamas: "pijama", pen: "pix",
  pencil: "creion", penny: "bănuț", person: "persoană", pig: "porc", pizza: "pizza", please: "te rog",
  police: "poliție", pool: "piscină", potty: "toaletă", pretend: "a se preface", pretty: "frumos",
  puppy: "cățel", puzzle: "puzzle", quiet: "liniște", radio: "radio", rain: "ploaie", read: "a citi",
  red: "roșu", refrigerator: "frigider", ride: "a merge cu", room: "cameră", sad: "trist", same: "la fel",
  say: "a spune", scissors: "foarfecă", see: "a vedea", shhh: "șșș", shirt: "cămașă", shoe: "pantof",
  shower: "duș", sick: "bolnav", sleep: "a dormi", sleepy: "somnoros", smile: "zâmbet", snack: "gustare",
  snow: "zăpadă", stairs: "scări", stay: "a rămâne", sticky: "lipicios", store: "magazin", story: "poveste",
  stuck: "blocat", sun: "soare", table: "masă", talk: "a vorbi", taste: "gust", thankyou: "mulțumesc",
  that: "acela", there: "acolo", think: "a gândi", thirsty: "însetat", tiger: "tigru", time: "timp",
  tomorrow: "mâine", tongue: "limbă", tooth: "dinte", toothbrush: "periuță de dinți", touch: "a atinge",
  toy: "jucărie", tree: "copac", uncle: "unchi", underwear: "lenjerie", up: "sus", vacuum: "aspirator",
  wait: "așteaptă", wake: "a se trezi", water: "apă", wet: "ud", weus: "noi", where: "unde", white: "alb",
  who: "cine", why: "de ce", will: "voi", wolf: "lup", yellow: "galben", yes: "da", yesterday: "ieri",
  yourself: "tu însuți", yucky: "scârbos", zebra: "zebră", zipper: "fermoar",
};

/** Semnele ASL cu sens în clasă: frază, semafor și alertă pentru profesor. */
const CLASSROOM: Record<string, { phrase: string; state: SemaforState | null; alert: boolean }> = {
  yes: { phrase: "Da.", state: "inteles", alert: false },
  no: { phrase: "Nu.", state: null, alert: false },
  not: { phrase: "Nu.", state: null, alert: false },
  finish: { phrase: "Am terminat.", state: "inteles", alert: false },
  thankyou: { phrase: "Mulțumesc!", state: "inteles", alert: false },
  please: { phrase: "Vă rog.", state: null, alert: false },
  hello: { phrase: "Bună!", state: null, alert: false },
  bye: { phrase: "La revedere!", state: null, alert: false },
  fine: { phrase: "Sunt bine.", state: "inteles", alert: false },
  same: { phrase: "La fel.", state: null, alert: false },
  think: { phrase: "Mă gândesc.", state: null, alert: false },
  wait: { phrase: "Așteptați, vă rog!", state: "intrebare", alert: true },
  why: { phrase: "De ce?", state: "intrebare", alert: true },
  who: { phrase: "Cine?", state: "intrebare", alert: true },
  where: { phrase: "Unde?", state: "intrebare", alert: true },
  stuck: { phrase: "M-am blocat.", state: "neinteles", alert: true },
  potty: { phrase: "Pot să merg la toaletă?", state: "intrebare", alert: true },
  sick: { phrase: "Mă simt rău.", state: "neinteles", alert: true },
  owie: { phrase: "Mă doare.", state: "neinteles", alert: true },
  thirsty: { phrase: "Mi-e sete.", state: null, alert: false },
  hungry: { phrase: "Mi-e foame.", state: null, alert: false },
  quiet: { phrase: "Liniște, vă rog.", state: null, alert: false },
  later: { phrase: "Mai târziu.", state: null, alert: false },
  now: { phrase: "Acum.", state: null, alert: false },
};

export const ASL_SIGN_COUNT = Object.keys(ASL_RO).length;

function sentence(word: string) {
  return word[0].toUpperCase() + word.slice(1) + ".";
}

/** Semnul ASL recunoscut, ca intrare de dicționar (cuvântul românesc + glosa ASL). */
export function aslToSign(gloss: string): SignDef {
  const ro = ASL_RO[gloss] ?? gloss;
  const cls = CLASSROOM[gloss];
  return {
    id: `asl_${gloss}`,
    word: ro.toUpperCase(),
    phrase: cls?.phrase ?? sentence(ro),
    state: cls?.state ?? null,
    alert: cls?.alert ?? false,
    category: "asl",
    hint: `ASL: ${gloss}`,
  };
}

/** Semnele ASL utile în clasă, pentru ghidul de semne. */
export const ASL_CLASSROOM_GLOSSES = Object.keys(CLASSROOM);

export const ASL_CREDIT = {
  model: "ASL Realtime Transformer",
  author: "Ceyda Akın",
  modelLicense: "CC BY 4.0",
  codeLicense: "MIT",
  dataset: "Google – Isolated Sign Language Recognition (Deaf Professional Arts Network, Georgia Tech), CC BY 4.0",
  modelUrl: "https://www.kaggle.com/models/ceydaakin2004/asl-realtime-transformer",
  codeUrl: "https://github.com/ceydaakin/asl-realtime",
  datasetUrl: "https://www.kaggle.com/competitions/asl-signs",
};
