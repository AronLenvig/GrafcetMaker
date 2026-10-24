# Makrosteg, omslutande steg och tvångsstyrning

Stora tillämpningar blir lättare att läsa när de delas upp. GRAFCET erbjuder tre verktyg, och alla
finns i GrafcetMaker.

## Flera delgrafcetar {#several-partial-grafcets}

Ett projekt kan innehålla flera **delgrafcetar**, en per flik längst ned i fönstret, t.ex. _G1_ för
produktionscykeln och _G2_ för säkerhetslogiken. Alla körs samtidigt och kan följa varandra genom
stegvariabler (`X21` i G1 är sant medan steg 21 i G2 är aktivt).

- Klicka på **+** bredvid flikarna för att lägga till en. Dess stegnummer börjar på nästa lediga
  tiotal (20, 30…), så att `Xn`-referenser förblir entydiga.
- Dubbelklicka på en flik (eller tryck på <kbd>F2</kbd> på den) för att byta namn på den; dra den
  åt sidan för att ändra ordningen; tryck på <kbd>Del</kbd> på den för att ta bort den.
  <kbd>Ctrl</kbd>+klick eller <kbd>Shift</kbd>+klick väljer flera flikar för att ta bort dem
  tillsammans. Högerklicka på en flik för fler alternativ. Många flikar rullas med mushjulet eller
  knapparna ‹ ›.

## Makrosteg {#macro-steps}

Ett **makrosteg** står för en detaljerad sekvens som ritas på ett eget blad, dess **expansion**. Det
ritas som ett steg med två vågräta linjer.

<!-- figure: macro | Ett makrosteg i huvudsekvensen -->

1. Markera ett steg och ställ in dess **Typ** till _Makrosteg_ i panelen Egenskaper (eller
   **Redigera › Gör till makrosteg**).
2. En ny flik öppnas med expansionen: ett ingångssteg **E** och ett utgångssteg **S** förbundna med
   en övergång. Rita den detaljerade sekvensen mellan dem.
3. Dubbelklicka på makrosteget (eller tryck på <kbd>Alt+↓</kbd>) för att öppna dess expansion;
   <kbd>Alt+↑</kbd> går tillbaka till makrosteget.

När makrosteget aktiveras blir dess ingångssteg aktivt; övergången efter makrosteget är möjliggjord
först när utgångssteget är aktivt. Makrosteget räknas som aktivt så länge något steg i dess
expansion är det.

## Omslutande steg {#enclosing-steps}

Ett **omslutande steg** innehåller en hel grafcet, den **omslutna grafceten**, som bara körs medan
det omslutande steget är aktivt. Använd det för driftlägen: _automatik_, _manuell_, _inställning_.
Det ritas som ett steg med två lodräta linjer.

1. Ställ in stegets **Typ** till _Omslutande steg_ (eller **Redigera › Gör till omslutande steg**).
2. En ny flik innehåller den omslutna grafceten. Steg som där är markerade med `*` blir aktiva när
   det omslutande steget aktiveras.
3. När det omslutande steget lämnas avaktiveras alla steg i den omslutna grafceten.

Flikar för expansioner och omslutna grafcetar har en etikett **M** eller **E**.

## Tvångsstyrningar {#forcing-orders}

En **tvångsstyrning** är en aktion som påtvingar en annan delgrafcet en situation medan dess steg är
aktivt. Den tvångsstyrda grafceten utvecklas inte under tiden.

| Tvångsstyrning | Verkan på G2                       |
| -------------- | ---------------------------------- |
| `G2{8}`        | bara steg 8 är aktivt              |
| `G2{8, 9}`     | bara stegen 8 och 9 är aktiva      |
| `G2{*}`        | fryst i sin aktuella situation     |
| `G2{}`         | inget steg är aktivt               |
| `G2{INIT}`     | tillbaka till sin initialsituation |

Tvångsstyrning är standardsättet att beskriva nödstopp och byten av driftläge: en säkerhetsgrafcet
tvångsstyr till exempel produktionsgrafceten till dess initialsituation. En grafcet kan inte
tvångsstyra sig själv, och två grafcetar kan inte tvångsstyra varandra.

## Kontroller {#checks}

GrafcetMaker kontrollerar att varje makrosteg och omslutande steg har en egen undergrafcet av rätt
typ, att expansioner har ett ingångssteg och ett utgångssteg, och att tvångsstyrningar pekar på
grafcetar och steg som finns.
