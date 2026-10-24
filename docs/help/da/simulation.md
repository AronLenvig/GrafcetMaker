# Simulering

Simulatoren kører din grafcet nøjagtigt efter reglerne i IEC 60848, så du kan teste den, før den
når frem til en PLC.

## Start og stop {#start-and-stop}

Tryk på <kbd>F5</kbd> (eller **Simuler › Start simulering**). Diagrammet låses,
simuleringsknapperne erstatter værktøjerne øverst, panelet **Simulering** vises til venstre (fold
det sammen med dets vinkeltegn for at se mere af diagrammet), og uret begynder at gå.
<kbd>Shift+F5</kbd> stopper og vender tilbage til redigering.

## Skift indgange {#change-inputs}

Panelet **Simulering** viser indgangene:

- **BOOL**-indgange har en kontakt og en knap **Hold** til et kortvarigt tryk (som en trykknap; med
  tastaturet holder du <kbd>Space</kbd> nede på den).
- **INT**-, **REAL**- og **TIME**-indgange har et værdifelt.

Du kan også **klikke på en BOOL-indgang, der hvor den står** i en transitionsbetingelse eller en
betingelse på diagrammet (tryk på den med en finger): den slås til eller fra. Grafcetten udvikler
sig, så snart en indgang ændres.

**Peg på en transition** (eller tryk på den) for at se, hvad den venter på: de trin, der først skal
være aktive, eller de led i dens transitionsbetingelse, der stadig er falske, med den resterende tid
på en timer som `10s/X0`. En flanke som `↑start` vises altid: den er kun sand i det øjeblik, dens
indgang ændres.

## Tid {#time}

Tiden i simulatoren er virtuel og deterministisk.

- <kbd>F5</kbd> sætter uret på pause og starter det igen. Timere (`5s/X2`) tæller kun, mens det går.
- Hastigheden går fra ×0.25 til ×10. **Hurtig** springer direkte fra det ene timerudløb til det
  næste.
- <kbd>F10</kbd> springer til næste timerudløb og kører den cyklus.
- **⟲** genstarter fra initialsituationen.

Linjen viser tiden, cyklusnummeret og hvornår den næste timer udløber. Standardhastigheden findes
under **Indstillinger › Simulering**.

## Det ser du på diagrammet {#what-you-see-on-the-diagram}

- **Aktive trin** er udfyldte og har en mærkeprik, med den tid, de har været aktive, nedenunder.
- **Frigivne transitioner** har en ▶-markering; transitioner blinker, når de skifter.
- **Sande signaler** er grønne, fede og understregede i transitionsbetingelser og betingelser for
  aktioner: en variabel, der er slået til, et aktivt trin `Xn`, en sammenligning, der er opfyldt.
  Det, der ikke er grønt, er det, transitionen stadig venter på. Under en IKKE-streg viser farven
  selve signalet: i `/a` er `a` grøn, når `a` er slået til.
- **Kontinuerlige aktioner**, der udføres, viser et ✓; **lagrede aktioner** viser den aktuelle værdi
  af deres variabel.

## Udviklingslog {#evolution-log}

Loggen i panelet Simulering (foldet sammen: klik på **Udviklingslog** for at åbne den) viser hver
cyklus med det, der udløste den, og hver iteration af søgningen efter stabilitet: transitioner, der
skiftede, og trin, der blev aktiveret og deaktiveret. Ustabile udviklinger (trin, der passeres uden
at standse) kan ses der. Klik på en cyklus for at se diagrammet, som det var i det øjeblik.

## Følg flere grafcets {#watching-several-grafcets}

I en delt visning (<kbd>Ctrl+\</kbd>) viser begge ruder simuleringen live: følg en
produktionsgrafcet og dens sikkerhedsgrafcet, eller et makrotrin og dets ekspansion, side om side.

## Tidsdiagram {#chronogram}

Panelet **Tidsdiagram** (dets knap sidder nederst til højre) tegner alle variabler og trinnene i
den åbne grafcet over tid. Klik eller træk
i det for at gå tilbage i tiden: diagrammet følger med. **Tilbage til live** vender tilbage til nu.

## Scenarier {#scenarios}

For at gentage en test nøjagtigt skal du optage den:

1. Klik på **Optag**: simuleringen genstarter og registrerer hver ændring af en indgang med dens
   tidspunkt.
2. Udfør din test, stop derefter optagelsen, og giv scenariet et navn. Det gemmes i projektet.
3. **Afspil** genstarter simuleringen og afspiller scenariet.

## Når grafcetten aldrig falder til ro {#when-the-grafcet-never-settles}

Hvis transitioner bliver ved med at få hinanden til at skifte (f.eks. en løkke, hvor alle
transitionsbetingelser er sande), bliver udviklingen aldrig stabil. Simulatoren stopper efter 1000
iterationer og melder en **ustabil løkke** i Problemer. Tilføj en betingelse (ofte en flanke `↑a`),
så løkken ikke kan køre i det uendelige. Se [Fejlfinding](troubleshooting.md).
