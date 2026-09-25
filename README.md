# SageSyncs

Website for SageSyncs: AI automation for real estate agents and small
brokerages.

Plain HTML, CSS and JavaScript. No framework, no build step, no
dependencies. A tiny Node server (`server.js`) serves the `public/`
folder so Railway can host it.

## Preview on your computer

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
git clone https://github.com/Monochromaticsage/SAGESYNCS.git
cd SAGESYNCS
npm start
```

Then open **http://localhost:3000**.

No `npm install` needed: there are no dependencies. Stop the server with
`Ctrl + C`.

## Deploy on Railway

1. Go to [railway.com](https://railway.com) and sign in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → choose **SAGESYNCS**.
3. Railway detects Node from `package.json` and runs `npm start`. The
   server listens on the `PORT` Railway provides.
4. Open the service → **Settings** → **Networking** → **Generate Domain**.
   That gives you a public `*.up.railway.app` link.
5. Every push to `main` redeploys automatically.

To use your own domain later, add it in the same Networking panel and
point your DNS at the target Railway shows you.

## Structure

```
public/
  index.html        Home
  services.html     Services
  results.html      Results
  about.html        About
  contact.html      Contact (Calendly embed + message form)
  404.html          Not found page
  css/style.css     All styles and animations
  js/main.js        Cursor, scroll reveals, network backgrounds, carousel, form
  assets/           Photo and favicon
server.js           Static server for Railway
```

## Editing

- **Copy:** edit the text directly in the `.html` files. The nav and footer
  are repeated in each page, so change them in all six files.
- **Colours:** the variables at the top of `public/css/style.css`
  (`--cyan`, `--sun`, `--violet` and the rest).
- **Motion:** everything respects the visitor's "reduce motion" setting.
  The mouse dot only appears on devices with a mouse.

## Contact form

The form opens the visitor's own email app with their message filled in,
addressed to sage1webdev@gmail.com. It needs no backend. To receive
messages without the visitor's email app, connect a form service later.
