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
                name=f"{source_class.name}-{target_class.name} association",
                ends={source_property, target_property}
            )
            domain_model.associations.add(association)

        elif rel_type == "ClassInheritance":
            generalization = Generalization(general=source_class, specific=target_class)
            domain_model.generalizations.add(generalization)

    return domain_model

def buml_to_json(domain_model):
    """Convert a BUML DomainModel object to JSON format matching the frontend structure."""
    elements = {}
    relationships = {}
    
    # Default diagram size
    default_size = {
        "width": 1200,
        "height": 300
    }
    
    # Initial x, y position for elements
    current_x = -580
    current_y = -130

    for type_obj in domain_model.types:
        if isinstance(type_obj, Class):
            # Generate UUID for the class
            class_id = str(uuid.uuid4())
            
            # Initialize lists for attributes and methods IDs
            attribute_ids = []
            method_ids = []
            
            # Process attributes
            y_offset = current_y + 40  # Starting position for attributes
            for attr in type_obj.attributes:
                attr_id = str(uuid.uuid4())
                visibility_symbol = next(k for k, v in VISIBILITY_MAP.items() if v == attr.visibility)
                attr_type = attr.type.name if hasattr(attr.type, 'name') else str(attr.type)
                
                elements[attr_id] = {
                    "id": attr_id,
                    "name": f"{visibility_symbol} {attr.name}: {attr_type}",
                    "type": "ClassAttribute",
                    "owner": class_id,
                    "bounds": {
                        "x": current_x + 0.5,
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
                    "owner": class_id,
                    "bounds": {
                        "x": current_x + 0.5,
                        "y": y_offset,
                        "width": 159,
                        "height": 30
                    }
                }
                method_ids.append(method_id)
                y_offset += 30

            # Create the class element
            elements[class_id] = {
                "id": class_id,
                "name": type_obj.name,
                "type": "Class",
                "owner": None,
                "bounds": {
                    "x": current_x,
                    "y": current_y,
                    "width": 160,
                    "height": max(100, 30 * (len(attribute_ids) + len(method_ids) + 1))
                },
                "attributes": attribute_ids,
                "methods": method_ids
            }
            
            # Update position for next class
            current_x += 200

        elif isinstance(type_obj, Enumeration):
            enum_id = str(uuid.uuid4())
            literal_ids = []
            
            # Process enumeration literals
            y_offset = current_y + 40
            for literal in type_obj.literals:
                literal_id = str(uuid.uuid4())
                elements[literal_id] = {
                    "id": literal_id,
                    "name": literal.name,
                    "type": "ClassAttribute",  # Using ClassAttribute for enum literals
                    "owner": enum_id,
                    "bounds": {
                        "x": current_x + 0.5,
                        "y": y_offset,
                        "width": 159,
                        "height": 30
                    }
                }
                literal_ids.append(literal_id)
                y_offset += 30

            elements[enum_id] = {
                "id": enum_id,
                "name": type_obj.name,
                "type": "Enumeration",
                "owner": None,
                "bounds": {
                    "x": current_x,
                    "y": current_y,
                    "width": 160,
                    "height": max(100, 30 * (len(literal_ids) + 1))
                },
                "attributes": literal_ids,
                "methods": []
            }
            
            current_x += 200

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

def parse_buml_content(content: str) -> DomainModel:
    """Parse BUML content from a Python file and return a DomainModel."""
    try:
        print("Starting to parse BUML content from Python file...")
        print(f"Raw content: {content}")
        
        # Create a safe environment for eval
        safe_globals = {
            'Package': Package,
            'Class': Class,
            'Property': Property,
            'PrimitiveDataType': PrimitiveDataType,
            'Multiplicity': Multiplicity,
            'set': set
        }
        
        try:
            # Evaluate the Python expression safely
            model = eval(content.strip(), safe_globals)
            print(f"Evaluated model: {model}")
            
            if isinstance(model, Package):
                # Create domain model from package
                domain_model = DomainModel(model.name)
                
                # Add all classes from the package
                for type_obj in model.types:
                    if isinstance(type_obj, Class):
                        domain_model.types.add(type_obj)
                
                # Add relationships if any
                domain_model.associations.update(model.associations)
                domain_model.generalizations.update(model.generalizations)
                
                print(f"Created domain model: {domain_model}")
                return domain_model
            else:
                raise ValueError("Invalid BUML model format: expected Package")
            
        except Exception as eval_error:
            print(f"Error evaluating BUML content: {eval_error}")
            raise
            
    except Exception as e:
        print(f"Error parsing BUML content: {e}")
        raise ValueError(f"Failed to parse BUML content: {str(e)}")

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

@app.post("/get-json-model")
async def get_json_model(buml_file: UploadFile = File(...)):
    try:
        print(f"Received file: {buml_file.filename}")
        content = await buml_file.read()
        buml_content = content.decode('utf-8')
        
        # Create the model structure
        model_data = {
            "version": "3.0.0",
            "type": "ClassDiagram",
            "size": {
                "width": 1200,
                "height": 300
            },
            "interactive": {
                "elements": {},
                "relationships": {}
            },
            "elements": {},
            "relationships": {},
            "assessments": {}
        }
        
        # Track classes and their attributes
        classes = {}
        class_attributes = {}
        current_x = -580
        
        # First pass: Create classes
        lines = buml_content.split('\n')
        for line in lines:
            line = line.strip()
            
            if ': Class =' in line:
                class_parts = line.split('=')
                class_name = class_parts[0].split(':')[0].strip()
                class_id = str(uuid.uuid4())
                
                classes[class_name] = class_id
                class_attributes[class_id] = []
                
                model_data["elements"][class_id] = {
                    "id": class_id,
                    "name": class_name,
                    "type": "Class",
                    "owner": None,
                    "bounds": {
                        "x": current_x,
                        "y": -130,
                        "width": 160,
                        "height": 100
                    },
                    "attributes": [],
                    "methods": []
                }
                current_x += 200
        
        # Second pass: Add attributes to their proper classes
        for line in lines:
            line = line.strip()
            if ': Property =' in line:
                prop_parts = line.split('=')
                prop_name = prop_parts[0].split(':')[0].strip()
                
                # Find which class this property belongs to
                for class_def_line in lines:
                    if ': Class =' in class_def_line and prop_name in class_def_line:
                        class_name = class_def_line.split('=')[0].split(':')[0].strip()
                        class_id = classes.get(class_name)
                        
                        if class_id:
                            prop_id = str(uuid.uuid4())
                            attr_count = len(class_attributes[class_id])
                            
                            # Add attribute to class
                            model_data["elements"][class_id]["attributes"].append(prop_id)
                            class_attributes[class_id].append(prop_id)
                            
                            # Add attribute element
                            model_data["elements"][prop_id] = {
                                "id": prop_id,
                                "name": f"+ {prop_name}: str",
                                "type": "ClassAttribute",
                                "owner": class_id,
                                "bounds": {
                                    "x": model_data["elements"][class_id]["bounds"]["x"] + 0.5,
                                    "y": model_data["elements"][class_id]["bounds"]["y"] + 40 + (attr_count * 30),
                                    "width": 159,
                                    "height": 30
                                }
                            }
        
        # Third pass: Add relationships
        for line in lines:
            line = line.strip()
            if ': BinaryAssociation =' in line:
                assoc_parts = line.split('=')
                assoc_name = assoc_parts[0].split(':')[0].strip()
                assoc_id = str(uuid.uuid4())
                
                # Find source and target classes from the association definition
                source_class = None
                target_class = None
                
                for class_name, class_id in classes.items():
                    if class_name in line:
                        if not source_class:
                            source_class = class_id
                        else:
                            target_class = class_id
                            break
                
                if source_class and target_class:
                    # Get source and target element positions
                    source_bounds = model_data["elements"][source_class]["bounds"]
                    target_bounds = model_data["elements"][target_class]["bounds"]
                    
                    # Calculate path points
                    start_x = source_bounds["x"] + source_bounds["width"]
                    start_y = source_bounds["y"] + (source_bounds["height"] / 2)
                    end_x = target_bounds["x"]
                    end_y = target_bounds["y"] + (target_bounds["height"] / 2)
                    mid_x = (start_x + end_x) / 2
                    
                    relationship = {
                        "id": assoc_id,
                        "type": "ClassBidirectional",
                        "name": assoc_name,
                        "source": {
                            "id": str(source_class),
                            "element": str(source_class),
                            "multiplicity": "1",
                            "role": "",
                            "bounds": {
                                "x": start_x,
                                "y": start_y,
                                "width": 0,
                                "height": 0
                            }
                        },
                        "target": {
                            "id": str(target_class),
                            "element": str(target_class),
                            "multiplicity": "*",
                            "role": "",
                            "bounds": {
                                "x": end_x,
                                "y": end_y,
                                "width": 0,
                                "height": 0
                            }
                        },
                        "path": [
                            {"x": start_x, "y": start_y},
                            {"x": mid_x, "y": start_y},
                            {"x": mid_x, "y": end_y},
                            {"x": end_x, "y": end_y}
                        ],
                        "bounds": {
                            "x": min(start_x, end_x),
                            "y": min(start_y, end_y),
                            "width": abs(end_x - start_x),
                            "height": abs(end_y - start_y)
                        }
                    }
                    
                    model_data["relationships"][assoc_id] = relationship
        
        # Wrap the model data in the expected format
        wrapped_response = {
            "title": buml_file.filename,
            "model": model_data
        }
        
        print("JSON data created:", wrapped_response)
        return JSONResponse(content=wrapped_response)
            
    except Exception as e:
        print(f"Error in get_json_model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Entry point if running directly
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
