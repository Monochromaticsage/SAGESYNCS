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

The form on the Contact page sends messages from the visitor's browser to
[FormSubmit](https://formsubmit.co), which emails them to
sage1webdev@gmail.com. It needs no account, no key and no Railway variables.

**One-time step:** the first message sent after deploying triggers an
email from FormSubmit to sage1webdev@gmail.com with an **Activate Form**
button. Click it once. Messages after that go straight to the inbox (check
Spam the first time and mark it "Not spam").

To change the receiving address, edit the `formsubmit.co/ajax/...` URL in
`public/js/main.js` and activate again.

## Checking what is live

The small version label in the footer (for example `v10`) and
`/health` show which release Railway is serving. If the label is older than
the latest commit, Railway has not deployed it yet.
