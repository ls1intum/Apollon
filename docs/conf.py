# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

import os

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

project = 'Apollon'
copyright = '2025, Technical University of Munich, Chair for Applied Software Engineering'
author = 'Applied Education Technologies, Technical University of Munich'

# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

master_doc = "index"

extensions = [
    "sphinx_rtd_theme",
    "myst_parser",
    "sphinx.ext.autodoc",
    'sphinxcontrib.plantuml',
    'sphinxcontrib.mermaid',
]

myst_enable_extensions = [
    "attrs_inline"
]

# Enable mermaid code blocks in markdown
myst_fence_as_directive = ["mermaid"]

# Mermaid configuration
mermaid_output_format = 'raw'
mermaid_version = "11.6.0"
mermaid_init_js = "mermaid.initialize({startOnLoad:true});"
# For PDF generation on Read the Docs
mermaid_params = ['-p', 'puppeteer-config.json']

exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store', 'venv', '.venv', 'README.md']

source_suffix = {
    '.rst': 'restructuredtext',
    '.md': 'markdown',
}

autodoc_mock_imports = [
    'sqlalchemy',
    'uvicorn',
    'dotenv',
    'fastapi',
    'pydantic',
    'httpx',
]

suppress_warnings = ["myst.header"]
myst_heading_anchors = 4

plantuml_output_format='svg'

# java = 'JAVA_HOME' in os.environ and f"{os.environ['JAVA_HOME']}/bin/java" or 'java'
local_plantuml_path = os.path.join(os.path.dirname(__file__), 'bin/plantuml.jar')
plantuml = f'java -jar {local_plantuml_path}'

# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = 'sphinx_rtd_theme'
html_context = {
    "display_github": True,
    "github_user": "ls1intum",
    "github_repo": "Apollon",
    "github_version": "develop",
    "conf_py_path": "/docs/",
}
html_logo = "images/logo.png"
html_theme_options = {
    'logo_only': True,
    'style_nav_header_background': '#3b82f6',
}
html_style = 'css/style.css'

html_static_path = ['_static']
