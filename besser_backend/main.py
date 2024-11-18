from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import FileResponse, JSONResponse
from besser.BUML.metamodel.structural import Class, Property, Method, DomainModel, PrimitiveDataType, \
    Enumeration, EnumerationLiteral, BinaryAssociation, Generalization, Multiplicity, UNLIMITED_MAX_MULTIPLICITY, Package
from besser.utilities.buml_code_builder import domain_model_to_code
from besser.generators.django import DjangoGenerator
from besser.generators.python_classes import PythonGenerator
from besser.generators.java_classes import JavaGenerator
from besser.generators.pydantic_classes import PydanticGenerator
from besser.generators.sql_alchemy import SQLAlchemyGenerator
from besser.generators.sql import SQLGenerator

import json
import os
import uuid

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


RELATIONSHIP_TYPES = {
    "bidirectional": "ClassBidirectional",
    "unidirectional": "ClassUnidirectional",
    "composition": "ClassComposition",
    "inheritance": "ClassInheritance"
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
    # Remove colons and parentheses from the method name
    method_name = method_name.replace(":", "").replace("()", "")
    parts = method_name.split()  # Split on whitespace
    
    if len(parts) == 1:  # Just the method name
        return "public", parts[0]
    
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
                name=f"{source_class.name}_{target_class.name}",
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
            domain_model_to_code(model=buml_model, file_path="output/domain_model.py")
            return FileResponse("output/domain_model.py", filename="domain_model.py", media_type="text/plain")

        elif generator == "java":
            generator_instance = JavaGenerator(buml_model)
            file_name = "Class.java"

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

def parse_buml_content(content: str) -> DomainModel:
    """Parse BUML content from a Python file and return a DomainModel."""
    try:
        # Create a safe environment for eval
        safe_globals = {
            'Class': Class,
            'Property': Property,
            'Method': Method,
            'PrimitiveDataType': PrimitiveDataType,
            'BinaryAssociation': BinaryAssociation,
            'Multiplicity': Multiplicity,
            'UNLIMITED_MAX_MULTIPLICITY': UNLIMITED_MAX_MULTIPLICITY,
            'Generalization': Generalization,
            'set': set,
            'StringType': PrimitiveDataType("str"),
            'IntegerType': PrimitiveDataType("int"),
            'DateType': PrimitiveDataType("date"),
            # Add mock generators that do nothing
            'PythonGenerator': lambda model: type('MockGenerator', (), {'generate': lambda: None}),
            'DjangoGenerator': lambda model: type('MockGenerator', (), {'generate': lambda: None}),
            'SQLAlchemyGenerator': lambda model: type('MockGenerator', (), {'generate': lambda: None}),
            'SQLGenerator': lambda model: type('MockGenerator', (), {'generate': lambda: None}),
            'RESTAPIGenerator': lambda model: type('MockGenerator', (), {'generate': lambda: None}),
            'BackendGenerator': lambda model, **kwargs: type('MockGenerator', (), {'generate': lambda: None}),
            'RDFGenerator': lambda model: type('MockGenerator', (), {'generate': lambda: None})
        }
        
        # Create a new domain model
        domain_model = DomainModel("Generated Model")
        
        # Execute the BUML content in a safe environment
        local_vars = {}
        exec(content, safe_globals, local_vars)
        
        print("Local variables after execution:", local_vars.keys())
        
        # First pass: Add all classes
        classes = {}
        for var_name, var_value in local_vars.items():
            if isinstance(var_value, Class):
                print(f"Found class: {var_name} = {var_value}")
                domain_model.types.add(var_value)
                classes[var_name] = var_value
        
        # Second pass: Add associations and generalizations
        for var_name, var_value in local_vars.items():
            if isinstance(var_value, BinaryAssociation):
                print(f"Found association: {var_name} = {var_value}")
                print(f"Association ends: {var_value.ends}")
                domain_model.associations.add(var_value)
            elif isinstance(var_value, Generalization):
                print(f"Found generalization: {var_name} = {var_value}")
                domain_model.generalizations.add(var_value)
        
        print(f"Domain model classes: {domain_model.types}")
        print(f"Domain model associations: {domain_model.associations}")
        
        return domain_model
            
    except Exception as e:
        print(f"Error parsing BUML content: {e}")
        raise ValueError(f"Failed to parse BUML content: {str(e)}")


def buml_to_json(domain_model):
    """Convert a BUML DomainModel object to JSON format matching the frontend structure."""
    elements = {}
    relationships = {}
    
    # Default diagram size
    default_size = {
        "width": 1200,
        "height": 800  # Increased height for better visibility
    }
    
    # Grid layout configuration
    grid_size = {
        "x_spacing": 300,  # Space between elements horizontally
        "y_spacing": 200,  # Space between elements vertically
        "max_columns": 3   # Maximum elements per row
    }
    
    # Track position
    current_column = 0
    current_row = 0
    
    def get_position():
        nonlocal current_column, current_row
        x = 50 + (current_column * grid_size["x_spacing"])
        y = 50 + (current_row * grid_size["y_spacing"])
        
        # Move to next position
        current_column += 1
        if current_column >= grid_size["max_columns"]:
            current_column = 0
            current_row += 1
            
        return x, y

    # First pass: Create all class and enumeration elements
    class_id_map = {}  # Store mapping between Class objects and their IDs
    
    for type_obj in domain_model.types:
        if isinstance(type_obj, (Class, Enumeration)):
            # Generate UUID for the element
            element_id = str(uuid.uuid4())
            class_id_map[type_obj] = element_id
            
            # Get position for this element
            x, y = get_position()
            
            # Initialize lists for attributes and methods IDs
            attribute_ids = []
            method_ids = []
            
            # Process attributes
            y_offset = y + 40  # Starting position for attributes
            if isinstance(type_obj, Class):
                for attr in type_obj.attributes:
                    attr_id = str(uuid.uuid4())
                    visibility_symbol = next(k for k, v in VISIBILITY_MAP.items() if v == attr.visibility)
                    attr_type = attr.type.name if hasattr(attr.type, 'name') else str(attr.type)
                    
                    elements[attr_id] = {
                        "id": attr_id,
                        "name": f"{visibility_symbol} {attr.name}: {attr_type}",
                        "type": "ClassAttribute",
                        "owner": element_id,
                        "bounds": {
                            "x": x + 0.5,
                            "y": y_offset,
                            "width": 159,
                            "height": 30
                        }
                    }
                    attribute_ids.append(attr_id)
                    y_offset += 30

                # Process methods
                for method in type_obj.methods:
                    method_id = str(uuid.uuid4())
                    visibility_symbol = next(k for k, v in VISIBILITY_MAP.items() if v == method.visibility)
                    
                    elements[method_id] = {
                        "id": method_id,
                        "name": f"{visibility_symbol} {method.name}()",
                        "type": "ClassMethod",
                        "owner": element_id,
                        "bounds": {
                            "x": x + 0.5,
                            "y": y_offset,
                            "width": 159,
                            "height": 30
                        }
                    }
                    method_ids.append(method_id)
                    y_offset += 30

            # Create the element
            elements[element_id] = {
                "id": element_id,
                "name": type_obj.name,
                "type": "Class" if isinstance(type_obj, Class) else "Enumeration",
                "owner": None,
                "bounds": {
                    "x": x,
                    "y": y,
                    "width": 160,
                    "height": max(100, 30 * (len(attribute_ids) + len(method_ids) + 1))
                },
                "attributes": attribute_ids,
                "methods": method_ids
            }

    # Second pass: Create relationships
    for association in domain_model.associations:
        rel_id = str(uuid.uuid4())
        ends = list(association.ends)
        if len(ends) == 2:
            source_prop, target_prop = ends
            source_class = source_prop.type
            target_class = target_prop.type
            
            if source_class in class_id_map and target_class in class_id_map:
                # Determine relationship type
                rel_type = RELATIONSHIP_TYPES["composition"] if source_prop.is_composite else (
                    RELATIONSHIP_TYPES["bidirectional"] if source_prop.is_navigable and target_prop.is_navigable
                    else RELATIONSHIP_TYPES["unidirectional"]
                )
                
                relationships[rel_id] = {
                    "id": rel_id,
                    "type": rel_type,
                    "source": {
                        "element": class_id_map[source_class],
                        "multiplicity": f"{source_prop.multiplicity.min}..{'*' if source_prop.multiplicity.max == 9999 else source_prop.multiplicity.max}",
                        "role": source_prop.name,
                        "bounds": {
                            "x": 0,
                            "y": 0,
                            "width": 0,
                            "height": 0
                        }
                    },
                    "target": {
                        "element": class_id_map[target_class],
                        "multiplicity": f"{target_prop.multiplicity.min}..{'*' if target_prop.multiplicity.max == 9999 else target_prop.multiplicity.max}",
                        "role": target_prop.name,
                        "bounds": {
                            "x": 0,
                            "y": 0,
                            "width": 0,
                            "height": 0
                        }
                    },
                    "path": [
                        {"x": 0, "y": 0},
                        {"x": 50, "y": 0},
                        {"x": 50, "y": 50},
                        {"x": 100, "y": 50}
                    ]
                }

    # Handle generalizations
    for generalization in domain_model.generalizations:
        rel_id = str(uuid.uuid4())
        if generalization.general in class_id_map and generalization.specific in class_id_map:
            relationships[rel_id] = {
                "id": rel_id,
                "type": "ClassInheritance",
                "source": {
                    "element": class_id_map[generalization.general],
                    "bounds": {
                        "x": 0,
                        "y": 0,
                        "width": 0,
                        "height": 0
                    }
                },
                "target": {
                    "element": class_id_map[generalization.specific],
                    "bounds": {
                        "x": 0,
                        "y": 0,
                        "width": 0,
                        "height": 0
                    }
                },
                "path": [
                    {"x": 0, "y": 0},
                    {"x": 50, "y": 0},
                    {"x": 50, "y": 50},
                    {"x": 100, "y": 50}
                ]
            }

    # Create the final structure
    result = {
        "version": "3.0.0",
        "type": "ClassDiagram",
        "size": default_size,
        "interactive": {
            "elements": {},
            "relationships": {}
        },
        "elements": elements,
        "relationships": relationships,
        "assessments": {}
    }

    return result


@app.post("/get-json-model")
async def get_json_model(buml_file: UploadFile = File(...)):
    try:
        print(f"Received file: {buml_file.filename}")
        content = await buml_file.read()
        buml_content = content.decode('utf-8')
        
        # Parse the BUML content into a domain model
        domain_model = parse_buml_content(buml_content)
        
        # Convert the domain model to JSON format
        json_model = buml_to_json(domain_model)
        
        # Wrap the model data in the expected format
        wrapped_response = {
            "title": buml_file.filename,
            "model": json_model
        }
        
        print("JSON data created:", wrapped_response)
        return wrapped_response  # Removed JSONResponse wrapper
            
    except Exception as e:
        print(f"Error in get_json_model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Entry point if running directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
