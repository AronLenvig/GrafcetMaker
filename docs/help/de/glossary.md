# Glossar

Die genormten GRAFCET-Begriffe (IEC 60848, DIN EN 60848), wie GrafcetMaker sie verwendet.

| Begriff                                      | Bedeutung                                                                                                                            |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Aktion**                                   | Was das System in Bezug auf einen Schritt tut; gezeichnet in einem Rechteck rechts neben dem Schritt.                                |
| **Aktiver Schritt**                          | Ein Schritt, der zur aktuellen Situation gehört; in der Simulation trägt er eine Marke.                                              |
| **Anfangsschritt**                           | Schritt, der beim Start aktiv ist; gezeichnet als Doppelquadrat.                                                                     |
| **Einschließender Schritt**                  | Schritt, der einen eingeschlossenen Grafcet enthält, der nur läuft, solange der Schritt aktiv ist.                                   |
| **Ereignis**                                 | Eine Flanke oder eine andere Bedingung eines Augenblicks, die eine speichernd wirkende Aktion bei Ereignis auslöst.                  |
| **Expansion**                                | Der Grafcet, der für einen Makroschritt gezeichnet ist, von seinem Eingangsschritt E bis zum Ausgangsschritt S.                      |
| **Flanke**                                   | Augenblickliche Änderung eines Signals: steigende Flanke ↑a (falsch → wahr), fallende Flanke ↓a (wahr → falsch).                     |
| **Freigegebene Transition**                  | Eine Transition, deren vorangehende Schritte alle aktiv sind.                                                                        |
| **Instabiler (transienter) Schritt**         | Schritt, der während einer einzigen Suche nach Stabilität aktiviert und deaktiviert wird.                                            |
| **Kontinuierlich wirkende Aktion**           | Ausgang, der wahr ist, solange sein Schritt aktiv ist (und seine Bedingung wahr ist).                                                |
| **Makroschritt**                             | Schritt, der für eine auf einem eigenen Blatt gezeichnete Expansion steht.                                                           |
| **ODER-Verzweigung** (Alternativverzweigung) | Einfache Linie nach einem Schritt, auf den mehrere Transitionen folgen; ein Weg wird gewählt.                                        |
| **ODER-Zusammenführung**                     | Einfache Linie, an der sich Alternativzweige wieder treffen.                                                                         |
| **Quell- / Senkentransition**                | Eine Transition ohne Schritt darüber / darunter.                                                                                     |
| **Schalten (einer Transition)**              | Die Transition überschreiten: die Schritte darunter aktivieren, die Schritte darüber deaktivieren.                                   |
| **Schaltfähig**                              | Freigegeben und mit wahrer Transitionsbedingung: Die Transition wird schalten.                                                       |
| **Schritt**                                  | Ein stabiler Zustand des Systems; gezeichnet als nummeriertes Quadrat.                                                               |
| **Schrittvariable**                          | `Xn`: wahr, solange Schritt n aktiv ist.                                                                                             |
| **Situation**                                | Die Menge der aktiven Schritte zu einem bestimmten Zeitpunkt.                                                                        |
| **Speichernd wirkende Aktion**               | Aktion, die einmal ausgeführt wird – bei Aktivierung, bei Deaktivierung oder bei einem Ereignis – und deren Wirkung erhalten bleibt. |
| **Suche nach Stabilität**                    | Wiederholen der Ablaufregeln nach einer Änderung eines Eingangs, bis keine Transition mehr schalten kann.                            |
| **Teil-Grafcet**                             | Einer der Grafcets eines Projekts; alle laufen gemeinsam.                                                                            |
| **Transition**                               | Strich zwischen Schritten; der Grafcet entwickelt sich, indem Transitionen schalten.                                                 |
| **Transitionsbedingung**                     | Die Bedingung, die neben einer Transition steht.                                                                                     |
| **UND-Verzweigung** (Parallelverzweigung)    | Doppellinie nach einer Transition, die mehrere Schritte gleichzeitig aktiviert (Parallelzweige).                                     |
| **UND-Zusammenführung**                      | Doppellinie, an der Parallelzweige enden; die nächste Transition wartet auf alle.                                                    |
| **Zeitglied**                                | `t/c`: wahr eine Zeit t, nachdem die Bedingung c wahr geworden ist, z. B. `5s/X2`.                                                   |
| **Zuweisungsbedingung**                      | Bedingung einer kontinuierlich wirkenden Aktion: Der Ausgang ist nur wahr, solange auch die Bedingung erfüllt ist.                   |
| **Zwangssteuerung**                          | Aktion, die einem anderen Teil-Grafcet eine Situation vorgibt, z. B. `G2{8}`.                                                        |
