# Simulering

Simulatorn kör din grafcet exakt enligt reglerna i IEC 60848, så att du kan testa den innan den
hamnar i ett PLC-system.

## Starta och stoppa {#start-and-stop}

Tryck på <kbd>F5</kbd> (eller **Simulera › Starta simulering**). Diagrammet låses,
simuleringskontrollerna ersätter verktygen överst, panelen **Simulering** visas till vänster (fäll
ihop den med dess vinkelpil för att se mer av diagrammet) och klockan börjar gå.
<kbd>Shift+F5</kbd> stoppar och går tillbaka till redigeringen.

## Ändra ingångar {#change-inputs}

Panelen **Simulering** listar ingångarna:

- **BOOL**-ingångar har en strömbrytare och en knapp **Håll** för ett momentant tryck (som en
  tryckknapp; med tangentbordet håller du ned <kbd>Space</kbd> på den).
- **INT**-, **REAL**- och **TIME**-ingångar har ett värdefält.

Du kan också **klicka på en BOOL-ingång där den står** i ett övergångsvillkor eller ett villkor i
diagrammet (tryck på den med fingret): den slås på eller av. Grafceten utvecklas så snart en ingång
ändras.

Under simuleringen visar varje **INT**-, **REAL**- eller **TIME**-variabel som står i ett
övergångsvillkor eller ett villkor sitt aktuella värde i en liten ruta ovanför namnet, och en
lagrad aktion visar under sin ruta värdet på variabeln den skriver. **Klicka på ett värde** (eller
tryck på det) för att skriva ett nytt och tryck på <kbd>Enter</kbd> (<kbd>Escape</kbd> avbryter).
Det gäller både ingångar och interna variabler och utgångar, till exempel för att prova en räknare
nära sin gräns.

**Peka på en övergång** (eller tryck på den) för att se vad den väntar på: de steg som först måste
vara aktiva, eller de termer i dess övergångsvillkor som fortfarande är falska, med den tid som
återstår för en tidsfördröjning som `10s/X0`. En flank som `↑start` listas alltid: den är bara sann
i det ögonblick dess ingång ändras.

## Tid {#time}

Tiden i simulatorn är virtuell och deterministisk.

- <kbd>F5</kbd> pausar klockan och startar den igen. Tidsfördröjningar (`5s/X2`) löper bara medan
  klockan går.
- Hastigheten går från ×0.25 till ×10. **Snabb** hoppar direkt från en tidsfördröjnings utgång till
  nästa.
- <kbd>F10</kbd> hoppar till nästa gång en tidsfördröjning löper ut och kör den cykeln.
- **⟲** startar om från initialsituationen.

Fältet visar tiden, cykelnumret och när nästa tidsfördröjning löper ut. Standardhastigheten finns
under **Inställningar › Simulering**.

## Det du ser i diagrammet {#what-you-see-on-the-diagram}

- **Aktiva steg** är ifyllda och har en markörprick, med tiden de har varit aktiva under sig.
- **Möjliggjorda övergångar** har en ▶-markering; övergångar blinkar när de passeras.
- **Sanna signaler** är gröna, feta och understrukna i övergångsvillkor och aktionsvillkor: en
  variabel som är på, ett aktivt steg `Xn`, en jämförelse som gäller. Det som inte är grönt är det
  som övergången fortfarande väntar på. Under ett ICKE-streck visar färgen själva signalen: i `/a`
  är `a` grön när `a` är på.
- **Kontinuerliga aktioner** som utförs visar en ✓; **lagrade aktioner** visar det aktuella värdet
  på sin variabel.

## Utvecklingslogg {#evolution-log}

Loggen i panelen Simulering (hopfälld: klicka på **Utvecklingslogg** för att öppna den) listar
varje cykel med vad som utlöste den och varje iteration av sökningen efter stabilitet: passerade
övergångar, aktiverade och avaktiverade steg. Transienta utvecklingar (steg som passeras utan att
stanna) syns där. Klicka på en cykel för att se diagrammet som det såg ut i det ögonblicket.

## Följa flera grafcetar {#watching-several-grafcets}

I en delad vy (<kbd>Ctrl+\</kbd>) visar båda rutorna simuleringen live: följ en produktionsgrafcet
och dess säkerhetsgrafcet, eller ett makrosteg och dess expansion, sida vid sida.

## Tidsdiagram {#chronogram}

Panelen **Tidsdiagram** (dess knapp finns nere till höger) ritar varje variabel och stegen i den
öppna grafceten över tid. Klicka eller dra i den för att gå bakåt i tiden: diagrammet följer med. **Tillbaka till live** återgår till nuet.

## Scenarier {#scenarios}

För att upprepa ett test exakt spelar du in det:

1. Klicka på **Spela in**: simuleringen startar om och registrerar varje ändring av en ingång med
   sin tidpunkt.
2. Kör ditt test, stoppa sedan inspelningen och namnge scenariot. Det sparas i projektet.
3. **Spela upp** startar om simuleringen och spelar upp scenariot.

## När grafceten aldrig stabiliseras {#when-the-grafcet-never-settles}

Om övergångar fortsätter att passera varandra (till exempel en återgång där varje övergångsvillkor
är sant) blir utvecklingen aldrig stabil. Simulatorn stoppar efter 1000 iterationer och rapporterar
en **transient slinga** under Problem. Lägg till ett villkor (ofta en flank `↑a`) så att slingan
inte kan pågå för evigt. Se [Felsökning](troubleshooting.md).
