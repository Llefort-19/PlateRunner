import sys
import json
import os
from app import create_app, db
from models import Experiment

app = create_app(os.getenv('FLASK_CONFIG') or 'default')
with app.app_context():
    exp = Experiment.query.order_by(Experiment.id.desc()).first()
    if exp and exp.plating_protocol:
        output_file = 'protocol_dump.json'
        with open(output_file, 'w') as f:
            json.dump(exp.plating_protocol, f, indent=2)
        print(f"Successfully saved to {os.path.abspath(output_file)}")
    else:
        print("No experiment or plating protocol found")
