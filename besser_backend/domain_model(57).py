# Generated B-UML Model
from besser.BUML.metamodel.structural import (
    Class, Property, Method, Parameter,
    BinaryAssociation, Generalization, DomainModel,
    Enumeration, EnumerationLiteral, Multiplicity,
    StringType, IntegerType, FloatType, BooleanType,
    TimeType, DateType, DateTimeType, TimeDeltaType
)

# Enumerations
# Classes
Author = Class(name="Author")

# Author class attributes and methods
Author_FEMAL: Property = Property(name="FEMAL", type=StringType)
Author_MALE: Property = Property(name="MALE", type=StringType)
Author.attributes={Author_FEMAL, Author_MALE}

# Domain Model
domain_model = DomainModel(
    name="Domain Model",
    types={Author},
    associations={},
    generalizations={}
)
