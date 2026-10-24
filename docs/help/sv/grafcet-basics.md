# Grunderna i GRAFCET

GRAFCET (IEC 60848, i Sverige SS-EN 60848) beskriver beteendet hos ett sekventiellt system – en
maskin, en process, ett trafikljus – som en serie **steg** förbundna med **övergångar**. Det är
specifikationsspråket bakom språket SFC i PLC-system (IEC 61131-3).

<!-- figure: anatomy | Delarna i en grafcet -->

## Steg {#steps}

Ett **steg** är en stabil situation i systemet: _väntar_, _fyller_, _borrar_. Det ritas som en
kvadrat med sitt nummer. I varje ögonblick är ett steg antingen **aktivt** eller **inaktivt**;
mängden aktiva steg är grafcetens **situation**.

- Ett **initialsteg** (dubbel kvadrat) är aktivt när systemet startar. En grafcet behöver minst
  ett.
- Variabeln `X3` är sann medan steg 3 är aktivt. Du kan använda den i övergångsvillkor och villkor.

## Övergångar och övergångsvillkor {#transitions-and-receptivities}

En **övergång** (kort vågrätt streck) förbinder steg. Dess **övergångsvillkor**, som skrivs bredvid
den, är villkoret för att gå vidare: en ingång (`start`), en kombination (`start * /door`), en flank
(`↑b`), en tidsfördröjning (`5s/X2`) eller en jämförelse (`level >= 80`). Övergångsvillkoret `1` är
alltid sant.

- En övergång är **möjliggjord** när alla steg direkt ovanför den är aktiva.
- En möjliggjord övergång **passeras** så snart dess övergångsvillkor är sant.

## Aktioner {#actions}

Rektanglarna till höger om ett steg är dess **aktioner**: det systemet gör medan steget är aktivt,
t.ex. _kör pumpen_. En **kontinuerlig aktion** anger en utgång som är sann medan steget är aktivt.
Lagrade aktioner ändrar ett värde en gång, när ett steg aktiveras eller avaktiveras eller när en
händelse inträffar. Se [Aktioner](actions.md).

## De fem utvecklingsreglerna {#the-five-evolution-rules}

De här reglerna, från IEC 60848, avgör hur en grafcet utvecklas. Simulatorn tillämpar dem exakt.

1. **Initialsituation**: vid start är initialstegen aktiva.
2. **Villkor för passering**: en övergång passeras när den är möjliggjord och dess övergångsvillkor
   är sant.
3. **Passering**: när en övergång passeras aktiveras alla steg direkt nedanför den och avaktiveras
   alla steg direkt ovanför den.
4. **Samtidig passering**: alla övergångar som kan passeras samtidigt passeras samtidigt.
5. **Aktiverat och avaktiverat på en gång**: ett steg som aktiveras och avaktiveras samtidigt
   förblir aktivt.

Efter en ändring av ingångarna tillämpas reglerna om och om igen tills ingen övergång kan passeras:
det är **sökningen efter stabilitet**. Steg som aktiveras och lämnas igen under sökningen är
**instabila** (transienta): deras kontinuerliga aktioner utförs inte, men deras lagrade aktioner
utförs.

## Välja mellan vägar: ELLER {#choosing-between-paths-or}

När ett steg följs av flera övergångar tar grafceten den väg vars övergångsvillkor är sant: en
**alternativ förgrening**, ritad med en enkel vågrät linje (**ELLER-förgrening**). Vägarna möts
igen på en enkel linje (**ELLER-sammanföring**).

<!-- figure: or | ELLER-förgrening och ELLER-sammanföring -->

Gör övergångsvillkoren **ömsesidigt uteslutande** (de kan aldrig vara sanna samtidigt), här `a` och
`/a * b`. Annars skulle båda vägarna tas på en gång. GrafcetMaker varnar dig när den inte kan bevisa
att alternativa övergångsvillkor är uteslutande, och erbjuder att ge en gren företräde.

## Göra saker samtidigt: OCH {#doing-things-at-the-same-time-and}

När en övergång följs av flera steg aktiveras de alla tillsammans: **parallella grenar**, ritade
med en dubbel linje (**OCH-förgrening**). Grenarna slutar också på en dubbel linje
(**OCH-sammanföring**): övergången nedanför den är möjliggjord först när det sista steget i varje
gren är aktivt, så den väntar tills alla grenar är klara.

<!-- figure: and | OCH-förgrening och OCH-sammanföring -->

## Återgångar {#loops}

En länk som går uppåt, ritad med en pil, återvänder till ett tidigare steg: det vanliga sättet att
upprepa en cykel. Tryck på <kbd>L</kbd> på ett steg och klicka sedan på steget att gå tillbaka
till.

## Större tillämpningar {#bigger-applications}

- Ett projekt kan innehålla flera **delgrafcetar** som körs tillsammans, t.ex. en för cykeln och en
  för säkerheten. De ser varandras steg genom `Xn`.
- Ett **makrosteg** står för en detaljerad sekvens som ritas på ett eget blad, dess **expansion**.
- Ett **omslutande steg** innehåller en hel grafcet som bara körs medan steget är aktivt.
- En **tvångsstyrning** påtvingar en annan grafcet en situation, t.ex. vid ett nödstopp.

Se [Makrosteg, omslutande steg och tvångsstyrning](hierarchy.md).

## Läs mer {#learn-more}

- [Skriva övergångsvillkor](expressions.md) – den fullständiga syntaxen för uttryck.
- [Ordlista](glossary.md) – alla standardtermer på ett ställe.
- Den exakta tolkningen av varje regel i GrafcetMaker beskrivs i `docs/semantics.md` i
  källkodsförrådet.
