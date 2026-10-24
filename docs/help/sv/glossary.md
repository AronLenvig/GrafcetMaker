# Ordlista

De standardiserade GRAFCET-termerna (IEC 60848, SS-EN 60848) som de används i GrafcetMaker.

| Term                           | Betydelse                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Aktion**                     | Det systemet gör i samband med ett steg; ritas i en rektangel till höger om steget.                          |
| **Aktivt steg**                | Ett steg som ingår i den aktuella situationen; det har en markör i simuleringen.                             |
| **Delgrafcet**                 | En av grafcetarna i ett projekt; alla körs tillsammans.                                                      |
| **ELLER-förgrening**           | Enkel linje efter ett steg som följs av flera övergångar; en väg väljs.                                      |
| **ELLER-sammanföring**         | Enkel linje där alternativa grenar möts igen.                                                                |
| **Expansion**                  | Grafceten som ritas för ett makrosteg, från dess ingångssteg E till dess utgångssteg S.                      |
| **Flank**                      | Momentan ändring av en signal: stigande flank ↑a (falskt → sant), fallande flank ↓a (sant → falskt).         |
| **Händelse**                   | En flank eller ett annat momentant villkor som utlöser en lagrad aktion vid händelse.                        |
| **Initialsteg**                | Steg som är aktivt vid start; ritas som en dubbel kvadrat.                                                   |
| **Kontinuerlig aktion**        | Utgång som är sann medan dess steg är aktivt (och dess villkor är sant).                                     |
| **Käll- / sänkövergång**       | En övergång utan steg ovanför / nedanför.                                                                    |
| **Lagrad aktion**              | Aktion som utförs en gång – vid aktivering, vid avaktivering eller vid en händelse – och vars verkan består. |
| **Makrosteg**                  | Steg som står för en expansion som ritas på ett eget blad.                                                   |
| **Möjliggjord övergång**       | En övergång vars föregående steg alla är aktiva.                                                             |
| **OCH-förgrening**             | Dubbel linje efter en övergång som aktiverar flera steg på en gång (parallella grenar).                      |
| **OCH-sammanföring**           | Dubbel linje där parallella grenar slutar; nästa övergång väntar på alla.                                    |
| **Omslutande steg**            | Steg som innehåller en omsluten grafcet, som bara körs medan steget är aktivt.                               |
| **Passera (en övergång)**      | Gå igenom den: aktivera stegen nedanför, avaktivera stegen ovanför.                                          |
| **Passerbar**                  | Möjliggjord och med ett sant övergångsvillkor: övergången kommer att passeras.                               |
| **Situation**                  | Mängden aktiva steg vid ett givet ögonblick.                                                                 |
| **Steg**                       | En stabil situation i systemet; ritas som en numrerad kvadrat.                                               |
| **Stegvariabel**               | `Xn`: sann medan steg n är aktivt.                                                                           |
| **Sökning efter stabilitet**   | Att upprepa utvecklingsreglerna efter en ändring av ingångarna tills ingen övergång kan passeras.            |
| **Tidsfördröjning**            | `t/c`: sann en tid t efter att villkoret c blev sant, t.ex. `5s/X2`.                                         |
| **Tilldelningsvillkor**        | Villkor för en kontinuerlig aktion: utgången är sann bara medan även villkoret gäller.                       |
| **Transient (instabilt) steg** | Steg som aktiveras och avaktiveras under en och samma sökning efter stabilitet.                              |
| **Tvångsstyrning**             | Aktion som påtvingar en annan delgrafcet en situation, t.ex. `G2{8}`.                                        |
| **Övergång**                   | Streck mellan steg; grafceten utvecklas genom att övergångar passeras.                                       |
| **Övergångsvillkor**           | Villkoret som skrivs bredvid en övergång.                                                                    |
