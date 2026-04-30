# Coparentalite Reponse

Application web statique qui aide a rediger une reponse calme, factuelle et centree sur l'enfant apres reception d'un message de coparentalite.

## Fonctionnement

- Coller le message recu dans le champ texte.
- Choisir le tutoiement ou le vouvoiement.
- Ajouter le prenom de l'enfant si utile.
- L'application analyse localement le message et propose plusieurs reponses copiables.

L'analyse est heuristique et entierement cote navigateur. Aucun message n'est envoye a un serveur.

## Developpement local

Le projet ne depend d'aucun framework et n'a pas besoin de build.

```bash
npm test
```

Pour tester dans le navigateur, ouvrir directement `app.html`.

## Integration dans un site vitrine existant

Si le repository contient deja un `index.html` servant de site vitrine, il faut le conserver.
L'application peut vivre dans `app.html`, sans lien depuis la page d'accueil.
Les styles de l'application sont isoles dans `app.css` pour eviter d'ecraser le CSS du site vitrine.

Sur Vercel, avec `cleanUrls: true`, la page de test sera disponible a:

- `/app`
- `/app.html`

La racine `/` continuera a servir le `index.html` du site vitrine.

## Deploiement Vercel

Configuration recommandee:

- Source: repository GitHub.
- Framework preset: Other.
- Build command: laisser vide.
- Output directory: `.`.
- Production branch: `main`.

Une fois le projet Vercel relie au repository GitHub:

- chaque push sur `main` declenche un deploiement production;
- chaque pull request peut recevoir un preview deployment;
- le workflow GitHub Actions verifie la syntaxe JavaScript avant fusion.

## Mise a jour automatisee

Le flux conseille est:

1. Modifier l'application dans une branche GitHub.
2. Ouvrir une pull request.
3. Verifier le preview Vercel.
4. Fusionner dans `main`.
5. Vercel publie automatiquement la nouvelle version.

Pour une automatisation plus avancee, il sera possible de sortir les regles d'analyse dans un fichier de configuration versionne, afin de mettre a jour les scenarios sans toucher a l'interface.
