# Apollon Documentation

## Writing Documentation

We are using [Sphinx](http://www.sphinx-doc.org/en/stable/) to generate the documentation. The documentation is written in Markdown format.

### Installation

Optional: Create a virtual environment

```bash
python3 -m venv venv
```

Activate the virtual environment:

```bash
# Unix:
source venv/bin/activate
# Windows:
.\venv\Scripts\activate
```

Install the required packages

```bash
pip install -r requirements.txt
```

### Live Preview

To preview the documentation, run the following command:

```bash
make livehtml
```

### Building the Documentation

To build the documentation, run the following command:

```bash
make html
```

The generated documentation will be in the `_build/html` directory.
