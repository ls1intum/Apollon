# Contributing

We welcome contributions to the Apollon project! Please follow the steps below to contribute.

## How to Contribute

1. **Fork the repository**

   Create a fork of the repository on GitHub.

2. **Create a feature branch**

   Create a new branch for your feature or bug fix:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**

   - Follow the existing code style and conventions
   - Add tests for new functionality
   - Update documentation if needed

4. **Test your changes**

   Make sure all tests pass:

   ```bash
   npm run lint
   npm run build
   ```

5. **Commit your changes**

   Follow the commit message conventions defined in `commitlint.config.mjs`:

   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

6. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Submit a pull request**

   Create a pull request from your feature branch to the main repository.

## Code Style

- Follow the existing TypeScript and React conventions
- Use Prettier for code formatting (configured in `.prettierrc`)
- Ensure ESLint checks pass
- Write meaningful commit messages following conventional commits

## Development Workflow

1. Install dependencies: `npm install`
2. Start development: `npm run start`
3. Check linting: `npm run lint`
4. Format code: `npm run format`

Thank you for contributing to Apollon!
