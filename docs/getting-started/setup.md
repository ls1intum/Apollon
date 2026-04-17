# Setup

```sh
git clone git@github.com:ls1intum/Apollon.git
cd Apollon
nvm install && nvm use      # pins Node.js to .nvmrc
npm install
npm run dev
```

`npm run dev` starts the library (build watch), server, webapp, and a local Redis container (requires Docker). If the default ports are taken, it picks free ports and prints the URLs.

No `.env` files are required — defaults match the local setup. Override via `standalone/server/.env.example` or `standalone/webapp/.env.example` if needed.
