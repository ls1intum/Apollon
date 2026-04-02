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

5. **Start Redis** (requires Docker):

   ```bash
   npm run start:localdb
   ```

6. **Start development with hot reload:**

   ```bash
   npm run dev
   ```

   This starts the library (build watch), server (http://localhost:8000), and webapp (http://localhost:5173) with hot reload.

No `.env` files are needed — all defaults match the local setup. See `standalone/server/.env.example` and `standalone/webapp/.env.example` if you need to override defaults.
