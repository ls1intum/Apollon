# Setup Instructions

Follow these steps to set up the Apollon monorepo on your local machine.

## Initial Setup

1. **Clone the repository:**

   ```bash
   git clone git@github.com:ls1intum/Apollon.git
   cd Apollon
   ```

2. **Use the correct Node.js version:**

   ```bash
   nvm install
   nvm use
   ```

3. **Install dependencies for all packages:**

   ```bash
   npm install
   ```

4. **Build all packages:**

   ```bash
   npm run build
   ```

5. **Start development with hot reload** (requires Docker for Redis):

   ```bash
   npm run dev
   ```

   This starts the library (build watch), server, webapp, and the local Redis dependency used by the server. If the default local ports are already in use, the command selects free ports automatically and prints the chosen URLs in the terminal output.

No `.env` files are needed — all defaults match the local setup. See `standalone/server/.env.example` and `standalone/webapp/.env.example` if you need to override defaults.
