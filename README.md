# Study Buddy: frontend

Interface React + TypeScript (Vite) pour le backend `bootcamp-chatbot-backend`.

Après une erreur, le texte est restauré et le bouton « Réessayer » renvoie le même message avec le même modèle. Pendant la génération, « Stop » appelle la route d’annulation du backend, qui ferme le flux vers le fournisseur : le texte partiel est retiré et n’est pas enregistré. Les tokens consommés s’affichent sous la réponse lorsque le fournisseur renvoie les statistiques d’usage.

## Lancer en local

1. Démarrer le backend (port 8000) depuis `bootcamp-chatbot-backend` :

```bash
uv run fastapi dev main.py
```

2. Démarrer le frontend depuis ce dossier :

```bash
npm install
npm run dev
```

3. Ouvrir http://localhost:5173.

Les appels vers `/api/*` sont redirigés vers `http://localhost:8000` par le proxy de Vite (`vite.config.ts`), donc pas besoin de configurer CORS côté backend.

## Endpoints utilisés

| Méthode | Route | Usage |
| --- | --- | --- |
| `GET` | `/conversations` | Historique des conversations (barre latérale) |
| `POST` | `/conversations` | Bouton « Nouvelle conversation » |
| `GET` | `/conversations/{id}/messages` | Messages d'une conversation |
| `POST` | `/chat` | Envoi d'un message |
