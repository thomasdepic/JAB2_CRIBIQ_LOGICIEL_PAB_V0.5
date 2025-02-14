# JAB2_CRIBIQ_LOGICIEL_PAB_V0.5

Fonctionnalites :
  - definir sur la carte un polygone editable represenant un etang, affiche la longueur des cotes et l'aire
  - definir et editer une profondeur et une pente
  - calcule et affichage de la ligne de mi-niveau d'eau et du fond en fonction des deux cree une grille permettant de quadriller la zone en fonction d'une taille de maillage           editable
  - La grille peut etre rotate. Par default, elle est allignée avec le plus grand cote. Un curseur permet aussi de modifier manuellement l'angle de rotation.
  - filtrage des points de la grille. Ne pas tracer seux qui sont trop proches.
  - trace les zones de mesure situant :
      - Sur les lignes de niveau au points d'intersections avec la grille
      - Sur les sommets de la grille se trouvant au fond.
  - Systeme de sauvegarde :
      - Sauvegarde les variables avec dans un fichier json
      - charge un fichier json


À corriger :
  - L'alignement de la grille et du polygon n'est pas exacte.

A ameliorer :
  - Gestion de l'angle. Actuellement on peut jouer sur un delta d'angle, il faudrait que ça soit l'angle complet.
  - Tri des points: optimiser en les differenciants afin de limiter les passages intutiles. Trouver une distance optimal.

Prochaines fonctionnalités a  ajouter :
  - Ameliorer l'interfasse
  -  meilleure gestion des courseurs en introduisants de nouvelles facons de les modifiers :
      - boutons plus et moins
      - valeur rentrable manuellement (au clavier)
