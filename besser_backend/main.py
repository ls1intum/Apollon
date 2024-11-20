from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import FileResponse, JSONResponse
from besser.BUML.metamodel.structural import Class, Property, Method, DomainModel, PrimitiveDataType, \
    Enumeration, EnumerationLiteral, BinaryAssociation, Generalization, Multiplicity, UNLIMITED_MAX_MULTIPLICITY, Package, Parameter
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

def parse_attribute(attribute_name, domain_model=None):
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
        
        # Check if type is specified
        if len(parts) > 2:
            type_name = parts[2]
            # Check if type is an enumeration in the domain model
            if domain_model and any(isinstance(t, Enumeration) and t.name == type_name for t in domain_model.types):
                attr_type = type_name  # Keep the enumeration type name
            else:
                # Convert to primitive type if not an enumeration
                attr_type = VALID_PRIMITIVE_TYPES.get(type_name.lower(), "str")
        else:
            attr_type = "str"  # Default to "str" if no type specified
            
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
    domain_model = DomainModel("Domain Model")
    elements = json_data.get("elements", {}).get("elements", {})
    relationships = json_data.get("elements", {}).get("relationships", {})

    # First process enumerations to have them available for attribute types
    for element_id, element in elements.items():
        if element.get("type") == "Enumeration":
            element_name = element.get("name")
            literals = set()
            for literal_id in element.get("attributes", []):
                literal = elements.get(literal_id)
                if literal:
                    literal_obj = EnumerationLiteral(name=literal.get("name", ""))
                    literals.add(literal_obj)
            enum = Enumeration(name=element_name, literals=literals)
            domain_model.types.add(enum)

    # Then process classes with attributes that might reference enumerations
    for element_id, element in elements.items():
        if element.get("type") == "Class":
            cls = Class(name=element.get("name"))

            # Add attributes
            for attr_id in element.get("attributes", []):
                attr = elements.get(attr_id)
                if attr:
                    visibility, name, attr_type = parse_attribute(attr.get("name", ""), domain_model)
                    # If attr_type is a string matching an enumeration name, get the actual enumeration
                    if any(isinstance(t, Enumeration) and t.name == attr_type for t in domain_model.types):
                        enum_type = next(t for t in domain_model.types if isinstance(t, Enumeration) and t.name == attr_type)
                        property = Property(name=name, type=enum_type, visibility=visibility)
                    else:
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

        # Create output directory if it doesn't exist
        os.makedirs("output", exist_ok=True)

        # Clear existing files in output directory
        for file in os.listdir("output"):
            file_path = os.path.join("output", file)
            try:
                if os.path.isfile(file_path):
                    os.unlink(file_path)
            except Exception as e:
                print(f"Error deleting {file_path}: {e}")

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
            'Enumeration': Enumeration,
            'EnumerationLiteral': EnumerationLiteral,
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
        
        # First pass: Add all classes and enumerations
        for var_name, var_value in local_vars.items():
            if isinstance(var_value, (Class, Enumeration)):
                print(f"Found type: {var_name} = {var_value}")
                domain_model.types.add(var_value)
        
        # Get the domain model from local vars if it exists
        if 'domain_model' in local_vars and isinstance(local_vars['domain_model'], DomainModel):
            # Merge the types from the file's domain model
            domain_model.types.update(local_vars['domain_model'].types)
            domain_model.associations.update(local_vars['domain_model'].associations)
            domain_model.generalizations.update(local_vars['domain_model'].generalizations)
        
        print(f"Domain model types: {domain_model.types}")
        print(f"Domain model associations: {domain_model.associations}")
        
        return domain_model
            
    except Exception as e:
        print(f"Error parsing BUML content: {e}")
        raise ValueError(f"Failed to parse BUML content: {str(e)}")


def calculate_center_point(bounds):
    """Calculate the center point of an element based on its bounds."""
    return {
        'x': bounds['x'] + bounds['width'] / 2,
        'y': bounds['y'] + bounds['height'] / 2
    }

def determine_connection_direction(source_bounds, target_bounds):
    """Determine the best connection directions between two elements."""
    source_center = calculate_center_point(source_bounds)
    target_center = calculate_center_point(target_bounds)
    
    dx = target_center['x'] - source_center['x']
    dy = target_center['y'] - source_center['y']
    
    # Si les éléments sont principalement alignés horizontalement
    if abs(dx) > abs(dy):
        if dx > 0:
            return "Right", "Left"  # source à gauche du target
        else:
            return "Left", "Right"  # source à droite du target
    # Si les éléments sont principalement alignés verticalement
    else:
        if dy > 0:
            return "Down", "Up"    # source au-dessus du target
        else:
            return "Up", "Down"    # source en-dessous du target

def calculate_connection_points(element_bounds, direction):
    """Calculate connection point based on direction."""
    if direction == "Right":
        return {
            'x': element_bounds['x'] + element_bounds['width'],
            'y': element_bounds['y'] + (element_bounds['height'] / 2)
        }
    elif direction == "Left":
        return {
            'x': element_bounds['x'],
            'y': element_bounds['y'] + (element_bounds['height'] / 2)
        }
    elif direction == "Up":
        return {
            'x': element_bounds['x'] + (element_bounds['width'] / 2),
            'y': element_bounds['y']
        }
    else:  # Down
        return {
            'x': element_bounds['x'] + (element_bounds['width'] / 2),
            'y': element_bounds['y'] + element_bounds['height']
        }

def calculate_path_points(source_point, target_point, source_dir, target_dir):
    """Calculate intermediate points for the relationship path."""
    points = [source_point]
    offset = 30  # Distance minimale pour les détours
    
    # Calculer les points intermédiaires en fonction des directions
    if source_dir == "Right" and target_dir == "Left":
        mid_x = (source_point['x'] + target_point['x']) / 2
        points.extend([
            {'x': mid_x, 'y': source_point['y']},
            {'x': mid_x, 'y': target_point['y']}
        ])
    elif source_dir == "Left" and target_dir == "Right":
        mid_x = (source_point['x'] + target_point['x']) / 2
        points.extend([
            {'x': mid_x, 'y': source_point['y']},
            {'x': mid_x, 'y': target_point['y']}
        ])
    elif source_dir == "Down" and target_dir == "Up":
        mid_y = (source_point['y'] + target_point['y']) / 2
        points.extend([
            {'x': source_point['x'], 'y': mid_y},
            {'x': target_point['x'], 'y': mid_y}
        ])
    elif source_dir == "Up" and target_dir == "Down":
        mid_y = (source_point['y'] + target_point['y']) / 2
        points.extend([
            {'x': source_point['x'], 'y': mid_y},
            {'x': target_point['x'], 'y': mid_y}
        ])
    elif source_dir in ["Right", "Left"] and target_dir in ["Up", "Down"]:
        points.extend([
            {'x': target_point['x'], 'y': source_point['y']}
        ])
    elif source_dir in ["Up", "Down"] and target_dir in ["Right", "Left"]:
        points.extend([
            {'x': source_point['x'], 'y': target_point['y']}
        ])
    
    points.append(target_point)
    return points

def calculate_relationship_bounds(path_points):
    """Calculate the bounding box that contains all path points with padding."""
    x_coords = [p['x'] for p in path_points]
    y_coords = [p['y'] for p in path_points]
    
    padding = 10  # Ajouter un peu d'espace autour du chemin
    min_x = min(x_coords) - padding
    max_x = max(x_coords) + padding
    min_y = min(y_coords) - padding
    max_y = max(y_coords) + padding
    
    return {
        'x': min_x,
        'y': min_y,
        'width': max_x - min_x,
        'height': max_y - min_y
    }

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
            
            # Process attributes/literals
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

            elif isinstance(type_obj, Enumeration):
                # Handle enumeration literals
                for literal in type_obj.literals:
                    literal_id = str(uuid.uuid4())
                    elements[literal_id] = {
                        "id": literal_id,
                        "name": literal.name,
                        "type": "ClassAttribute",  # We use ClassAttribute type for literals
                        "owner": element_id,
                        "bounds": {
                            "x": x + 0.5,
                            "y": y_offset,
                            "width": 159,
                            "height": 30
                        }
                    }
                    attribute_ids.append(literal_id)
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
                "methods": method_ids,
                "stereotype": "enumeration" if isinstance(type_obj, Enumeration) else None
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
                # Get source and target elements
                source_element = elements[class_id_map[source_class]]
                target_element = elements[class_id_map[target_class]]
                
                # Calculate connection directions and points
                source_dir, target_dir = determine_connection_direction(
                    source_element['bounds'], 
                    target_element['bounds']
                )
                
                source_point = calculate_connection_points(source_element['bounds'], source_dir)
                target_point = calculate_connection_points(target_element['bounds'], target_dir)
                
                # Calculate path points
                path_points = calculate_path_points(source_point, target_point, source_dir, target_dir)
                
                # Calculate bounds
                rel_bounds = calculate_relationship_bounds(path_points)
                
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
                        "direction": source_dir,
                        "bounds": {
                            "x": source_point['x'],
                            "y": source_point['y'],
                            "width": 0,
                            "height": 0
                        }
                    },
                    "target": {
                        "element": class_id_map[target_class],
                        "multiplicity": f"{target_prop.multiplicity.min}..{'*' if target_prop.multiplicity.max == 9999 else target_prop.multiplicity.max}",
                        "role": target_prop.name,
                        "direction": target_dir,
                        "bounds": {
                            "x": target_point['x'],
                            "y": target_point['y'],
                            "width": 0,
                            "height": 0
                        }
                    },
                    "bounds": rel_bounds,
                    "path": path_points,
                    "isManuallyLayouted": False
                }

    # Handle generalizations
    for generalization in domain_model.generalizations:
        rel_id = str(uuid.uuid4())
        if generalization.general in class_id_map and generalization.specific in class_id_map:
            relationships[rel_id] = {
                "id": rel_id,
                "type": "ClassInheritance",
                "source": {
                    "element": class_id_map[generalization.specific],
                    "bounds": {
                        "x": 0,
                        "y": 0,
                        "width": 0,
                        "height": 0
                    }
                },
                "target": {
                    "element": class_id_map[generalization.general],
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
