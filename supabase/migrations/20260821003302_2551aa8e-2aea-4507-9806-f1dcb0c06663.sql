UPDATE quotes
SET scope_of_work = 'JOB SITE / WORK LOCATION: 400 King Street, Market Mall, Estevan, SK

PROJECT
Sub Express Kiosk Buildout
Trade: Drywall mudding and taping — labour only
Praetoria Group is acting as subcontractor. General contractor supplies all materials; Praetoria Group supplies labour only.
' || split_part(scope_of_work, 'SCOPE OF WORK (Labour Only)', 2)
WHERE quote_number = 'PQ-00102';

UPDATE quotes
SET scope_of_work = 'JOB SITE / WORK LOCATION: 400 King Street, Market Mall, Estevan, SK

' || regexp_replace(scope_of_work, ' at the Sub Express kiosk buildout, 400 King Street, Market Mall, Estevan, SK\.', ' at the Sub Express kiosk buildout.')
WHERE quote_number = 'PQ-00103';