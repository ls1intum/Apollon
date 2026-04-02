# How to Update Documentation

This guide explains how to update and maintain the documentation. Our documentation is built using Sphinx and hosted on Read the Docs.

## Prerequisites

Before you start, make sure you have:

1. Python 3.8 or higher installed
2. Git installed and [repository](https://github.com/ls1intum/apollon) cloned locally.

## Local Setup

1. Navigate to the docs directory:

   ```bash
   cd docs
   ```

2. Create and activate a Python virtual environment:

   ```bash
   python -m venv .venv # use python3 if needed
   source .venv/bin/activate  # On Windows, use: .venv\Scripts\activate
   ```

3. Install documentation dependencies:
   ```bash
   pip install -r requirements.txt # use pip3 if needed
   ```

## Writing Documentation

Our documentation uses Markdown files with MyST Parser extensions. Key points:

1. Documentation files are located in the `/docs` directory
2. Use `.md` extension for documentation files
3. Follow the existing directory structure
4. Include new pages in the appropriate section in `index.md`

### Supported Features

- Regular Markdown syntax
- Mermaid diagrams (for flowcharts and sequences)
- PlantUML diagrams
- Cross-references between pages
- Code blocks with syntax highlighting

## Building Documentation Locally

1. To build the documentation:

   ```bash
   make html
   ```

2. To view the built documentation:

   - Open `_build/html/index.html` in your web browser
   - Or use Python's built-in server:
     ```bash
     python3 -m http.server --directory _build/html
     ```

3. For automatic rebuilding during development:
   ```bash
   sphinx-autobuild . _build/html
   ```

## Deployment

Our documentation is automatically deployed through Read the Docs when changes are pushed to the main branch. To view the deployed documentation:

1. Visit [Read the Docs](https://app.readthedocs.org/)
2. Login with your account (create one if needed)
3. You can view build status and logs in the Apollon project dashboard

## Contributing to Documentation

### Workflow

1. Create a new branch for documentation changes:

   ```bash
   git checkout -b docs/your-documentation-update
   ```

2. Make your changes following our documentation structure
3. Build and test new documents locally
4. Commit your changes with a descriptive message:

   ```bash
   git commit -m "docs: update [section] with [details]"
   ```

5. Push your changes and create a pull request
6. Address any review feedback
7. Once approved, your changes will be merged and automatically deployed

### Best Practices

1. Keep documentation up to date with code changes
2. Write clear, concise, and grammatically correct content
3. Include examples and code snippets where appropriate
4. Test your documentation locally before committing
5. Use appropriate headers and maintain consistent formatting
6. Add cross-references to related documentation sections
7. Follow these style guidelines:
   - Use American English
   - Write in present tense
   - Use active voice
   - Keep paragraphs focused and concise
   - Include code examples for technical features
   - Add screenshots for UI-related documentation

## Read the Docs Configuration

Our documentation is built and hosted on Read the Docs. Here's how the integration works:

1. The documentation configuration is controlled by:

   - `docs/conf.py`: Sphinx configuration
   - `.readthedocs.yaml`: Read the Docs build configuration
   - `docs/requirements.txt`: Python dependencies for documentation

2. Build Process:

   - Read the Docs automatically detects new commits
   - Builds are triggered on:
     - Push to main branch
     - Pull request updates (for preview builds)
     - Manual build triggers in Read the Docs dashboard

3. Version Management:

   - Main branch is built as 'latest'
   - Tagged releases create versioned documentation
   - You can manage versions in the Read the Docs dashboard

4. Troubleshooting Builds:
   - Check build logs in Read the Docs dashboard
   - Common issues:
     - Missing dependencies
     - Syntax errors in documentation
     - Configuration file issues
   - Local build errors usually indicate what will fail on Read the Docs

## Need Help?

If you need assistance or have questions:

1. Check existing documentation in the `/docs` directory
2. Open an issue on GitHub
3. Contact the maintainers
