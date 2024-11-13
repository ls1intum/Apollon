from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import FileResponse
from besser.BUML.metamodel.structural import Class, Property, Method, DomainModel, PrimitiveDataType, \
    Enumeration, EnumerationLiteral, BinaryAssociation, Generalization, Multiplicity, UNLIMITED_MAX_MULTIPLICITY
from besser.generators.django import DjangoGenerator
from besser.generators.python_classes import PythonGenerator
from besser.generators.java_classes import JavaGenerator
from besser.generators.pydantic_classes import PydanticGenerator
from besser.generators.sql_alchemy import SQLAlchemyGenerator
from besser.generators.sql import SQLGenerator

import json
import os

app = FastAPI()

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins, or specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Allows all headers
)

# Define mappings for attribute types and visibility symbols
VALID_PRIMITIVE_TYPES = {
    "str": "str",
    "string": "str",
    "int": "int",
    "integer": "int",
    "float": "float",
    "double": "float",
    "bool": "bool",
    "boolean": "bool",
    "date": "date",
    "datetime": "datetime"
}

VISIBILITY_MAP = {
    "+": "public",
    "-": "private",
    "#": "protected",
    "~": "package"
}

# Sample request body model
class ClassDiagramInput(BaseModel):
    elements: dict
    generator: str

def parse_attribute(attribute_name):
    """Parse an attribute string to extract visibility, name, and type, removing any colons."""
    parts = attribute_name.replace(":", "").split()  # Remove colons from the attribute name
    if len(parts) == 1:
        visibility = "public"
        name = parts[0]
        attr_type = "str"
    else:
        visibility_symbol = parts[0] if parts[0] in VISIBILITY_MAP else "+"
        visibility = VISIBILITY_MAP.get(visibility_symbol, "public")  # Default to "public"
        name = parts[1] if len(parts) > 1 else "Unnamed"
        attr_type = parts[2] if len(parts) > 2 else "str"  # Default to "str" if no type specified
        attr_type = VALID_PRIMITIVE_TYPES.get(attr_type.lower(), "str")  # Ensure valid type
    return visibility, name, attr_type

def parse_method(method_name):
    """Parse a method string to extract visibility and method name."""
    parts = method_name.replace(":", "").split()  # Remove colons from method name if present
    visibility_symbol = parts[0] if parts[0] in VISIBILITY_MAP else "+"
    visibility = VISIBILITY_MAP.get(visibility_symbol, "public")  # Default to "public"
    name = parts[1] if len(parts) > 1 else "UnnamedMethod"
    return visibility, name

def parse_multiplicity(multiplicity_str):
    """Parse a multiplicity string and return a Multiplicity object with defaults."""
    if not multiplicity_str:
        return Multiplicity(min_multiplicity=1, max_multiplicity=1)
    
    parts = multiplicity_str.split("..")
    min_multiplicity = int(parts[0]) if parts[0] else 1
    max_multiplicity = (
        int(parts[1]) if len(parts) > 1 and parts[1] and parts[1] != "*" else UNLIMITED_MAX_MULTIPLICITY
    )
    return Multiplicity(min_multiplicity=min_multiplicity, max_multiplicity=max_multiplicity)

def json_to_buml(json_data):
    """Convert JSON data to a BUML DomainModel object."""
    domain_model = DomainModel("Enhanced Domain Model")
    elements = json_data.get("elements", {}).get("elements", {})
    relationships = json_data.get("elements", {}).get("relationships", {})

    # Processing classes and enumerations
    for element_id, element in elements.items():
        element_type = element.get("type")
        element_name = element.get("name")

        if element_type == "Class":
            cls = Class(name=element_name)

            # Add attributes
            for attr_id in element.get("attributes", []):
                attr = elements.get(attr_id)
                if attr:
                    visibility, name, attr_type = parse_attribute(attr.get("name", ""))
                    property = Property(name=name, type=PrimitiveDataType(attr_type), visibility=visibility)
                    cls.attributes.add(property)

            # Add methods
            for method_id in element.get("methods", []):
                method = elements.get(method_id)
                if method:
                    visibility, name = parse_method(method.get("name", ""))
                    method_obj = Method(name=name, visibility=visibility)
                    cls.methods.add(method_obj)

            domain_model.types.add(cls)

        elif element_type == "Enumeration":
            literals = set()
            for literal_id in element.get("attributes", []):
                literal = elements.get(literal_id)
                if literal:
                    literal_obj = EnumerationLiteral(name=literal.get("name", ""))
                    literals.add(literal_obj)

            enum = Enumeration(name=element_name, literals=literals)
            domain_model.types.add(enum)

    # Processing relationships (Associations, Generalizations, and Compositions)
    for rel_id, relationship in relationships.items():
        print(f"Processing relationship ID: {rel_id} with data: {relationship}")

        rel_type = relationship.get("type")
        source = relationship.get("source")
        target = relationship.get("target")

        if not rel_type or not source or not target:
            print(f"Skipping relationship {rel_id} due to missing data.")
            continue

        # Retrieve source and target elements
        source_element = elements.get(source.get("element"))
        target_element = elements.get(target.get("element"))

        if not source_element or not target_element:
            print(f"Skipping relationship {rel_id} due to missing elements.")
            continue

        source_class = domain_model.get_class_by_name(source_element.get("name", ""))
        target_class = domain_model.get_class_by_name(target_element.get("name", ""))

        if not source_class or not target_class:
            print(f"Skipping relationship {rel_id} because classes are missing in the domain model.")
            continue

        # Handle each type of relationship
        if rel_type == "ClassBidirectional" or rel_type == "ClassUnidirectional" or rel_type == "ClassComposition":
            is_composite = rel_type == "ClassComposition"
            source_navigable = rel_type != "ClassUnidirectional"
            target_navigable = True

            source_multiplicity = parse_multiplicity(source.get("multiplicity", "1"))
            target_multiplicity = parse_multiplicity(target.get("multiplicity", "1"))

            source_property = Property(
                name=source.get("role", ""),
                type=target_class,
                multiplicity=source_multiplicity,
                is_navigable=source_navigable,
                is_composite=is_composite
            )
            target_property = Property(
                name=target.get("role", ""),
                type=source_class,
                multiplicity=target_multiplicity,
                is_navigable=target_navigable
            )

            association = BinaryAssociation(
                name=f"{source_class.name}-{target_class.name} association",
                ends={source_property, target_property}
            )
            domain_model.associations.add(association)

        elif rel_type == "ClassInheritance":
            generalization = Generalization(general=source_class, specific=target_class)
            domain_model.generalizations.add(generalization)

    return domain_model



@app.post("/generate-output")
async def generate_output(input_data: ClassDiagramInput):
    try:
        # Convert JSON input to a BUML domain model
        json_data = input_data.dict()
        print("Input data received:", json_data)
        buml_model = json_to_buml(json_data)
        print("BUML model created:", buml_model)

        # Check the generator type requested
        generator = input_data.generator

        if generator == "python":
            generator_instance = PythonGenerator(buml_model)
            file_name = "classes.py"

        elif generator == "buml":
            with open(os.path.join("output", "domain_model.buml"), "w") as file:
                file.write(str(buml_model))
            return FileResponse("output/domain_model.py", filename="domain_model.py", media_type="text/plain")

        elif generator == "java":
            generator_instance = JavaGenerator(buml_model)
            file_name = "Class.java"

        elif generator == "json":
            with open(os.path.join("output", "domain_model.json"), "w") as file:
                json.dump(buml_model.to_json(), file)
            return FileResponse("output/domain_model.json", filename="domain_model.json", media_type="application/json")

        elif generator == "django":
            generator_instance = DjangoGenerator(buml_model)
            file_name = "models.py"

        elif generator == "pydantic":
            generator_instance = PydanticGenerator(buml_model)
            file_name = "pydantic_classes.py"

        elif generator == "sqlalchemy":
            generator_instance = SQLAlchemyGenerator(buml_model)
            file_name = "sql_alchemy.py"

        elif generator == "sql":
            generator_instance = SQLGenerator(buml_model)
            file_name = "tables.sql"

        else:
            raise HTTPException(status_code=400, detail="Invalid generator type specified.")

        # Generate the file with the appropriate generator
        output_file_path = os.path.join("output", file_name)
        generator_instance.generate()

        # Ensure the file exists before attempting to return it
        if not os.path.exists(output_file_path):
            raise ValueError(f"{generator} generation failed: Output file was not created.")

        # Return the generated file as a response
        return FileResponse(output_file_path, filename=file_name, media_type="text/plain")

    except ValueError as ve:
        print(f"ValueError: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"Error during file generation or response: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# Entry point if running directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
