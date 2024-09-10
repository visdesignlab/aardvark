# deploy_server.py
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os

app = Flask(__name__)

env_file_path = '.env.secrets'

load_dotenv(dotenv_path=env_file_path)

DEPLOYMENT_AUTH_TOKEN = os.getenv('DEPLOYMENT_AUTH_TOKEN')


@app.route('/deploy', methods=['POST'])
def deploy():
    token = request.headers.get('Authorization')

    if token != DEPLOYMENT_AUTH_TOKEN:
        return jsonify({'status': 'FAILED', 'error': 'UNAUTHORIZED_ACCESS'})

    print('hello')
    return jsonify({'status': 'SUCCESS'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5421)
