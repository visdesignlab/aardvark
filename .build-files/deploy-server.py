# deploy_server.py
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os
import argparse

app = Flask(__name__)


parser = argparse.ArgumentParser(description="Server for github actions to talk to")
parser.add_argument("--env-file", type=str, required=False,
                    default=".env.secrets", help="Name of environment file created.")

args = parser.parse_args()


env_file_path = args.env_file

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

    parser = argparse.ArgumentParser(description="Server for github actions to talk to")
    parser.add_argument("--env-file", type=str, required=False,
                        default=".env.secrets", help="Name of environment file created.")

    args = parser.parse_args()

    app.run(host='0.0.0.0', port=5421)
