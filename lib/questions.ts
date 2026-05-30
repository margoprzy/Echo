export const QUESTIONS: string[] = [
  "Co dzisiaj sprawiło, że przez chwilę zapomniałeś o telefonie?",
  "Co najlepszego zjadłeś dzisiaj?",
  "Z czego jesteś dziś choć trochę dumny?",
  "Kto dzisiaj Cię uśmiechnął?",
  "Co chciałeś zrobić dzisiaj, ale nie zdążyłeś?",
  "Opisz jeden moment z dziś, który chcesz zapamiętać.",
  "Co sprawiło Ci dziś radość, nawet jeśli to coś małego?",
  "Co by powiedzieł Twój przyjaciel, gdyby widział Twój dzień z zewnątrz?",
  "Czy był dziś moment, kiedy poczułeś, że wszystko gra?",
  "Co Cię dzisiaj zaskoczyło?",
  "Gdybyś mógł cofnąć jeden moment z dziś, który by to był?",
  "Czego nauczyłeś się dziś — o sobie albo o świecie?",
  "Co chciałbyś jutro zrobić inaczej?",
  "Jakie słowo najlepiej opisuje dzisiejszy dzień?",
  "Z kim rozmawiałeś dziś najchętniej i o czym?",
  "Co Cię dziś irytowało, ale śmiejesz się z tego teraz?",
  "Opisz miejsce, w którym byłeś dziś najdłużej.",
  "Co byś powiedział swojemu poranemu ja, gdybyś mógł?",
  "Jaką decyzję podjąłeś dziś — małą lub dużą?",
  "Co oglądałeś, słuchałeś lub czytałeś dziś i co o tym myślisz?",
  "Czy był dziś moment ciszy? Co w nim czułeś?",
  "Czego dziś potrzebowałeś, a nie dostałeś?",
  "Co Ci dziś pomogło iść dalej?",
  "Gdybyś miał opowiedzieć ten dzień w trzech zdaniach, jak by brzmiały?",
  "Czy zrobiłeś dziś coś dla kogoś innego? Jak się z tym czujesz?",
  "Co jest w Twoim życiu teraz, za co jesteś wdzięczny?",
  "Jaka myśl kręciła się w Twojej głowie przez cały dzień?",
  "Gdybyś mógł dodać jedną godzinę do dziś, na co byś ją poświęcił?",
  "Co lubisz w swoim życiu teraz, czego rok temu nie miałeś?",
  "Opisz swój nastrój kolorami — jakie by to były?",
  "Co sprawiłoby, że jutro byłby lepszy dzień niż dziś?",
];

export function getRandomQuestion(exclude?: string): string {
  const pool = exclude
    ? QUESTIONS.filter((q) => q !== exclude)
    : QUESTIONS;
  return pool[Math.floor(Math.random() * pool.length)];
}
