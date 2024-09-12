# deploy_server.py
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os
import argparse
import subprocess

app = Flask(__name__)


parser = argparse.ArgumentParser(description="Server for github actions to talk to")
parser.add_argument("--env-file", type=str, required=False,
                    default=".env.secrets", help="Name of environment file created.")

args = parser.parse_args()


env_file_path = args.env_file

load_dotenv(dotenv_path=env_file_path)

DEPLOYMENT_AUTH_TOKEN = os.getenv('DEPLOYMENT_AUTH_TOKEN')


@app.route('/deploy', methods=['GET'])
def deploy():
    token = request.headers.get('Authorization')
    print(token)
    if token != DEPLOYMENT_AUTH_TOKEN:
        return jsonify({'status': 'FAILED', 'error': 'UNAUTHORIZED_ACCESS'})

    #command = 'cd .. && python3 build.py -D && git pull origin dev || true && ls -a && python3 ' \
    #    'build.py -d --config-file /loonar-data/config.json'

    #try:
    #    result = subprocess.run(command,
    #                            shell=True,
    #                            check=True,
    #                            stdout=subprocess.PIPE,
    #                            stderr=subprocess.PIPE)

    #    print(f"Command: {command}\n"
    #          f"Output: {result.stdout.decode()}"
    #          f"\nErrors: {result.stderr.decode()}")
   # except subprocess.CalledProcessError as e:
        # Handle command failure
    #    print(f"Command failed: {command}\nError: {e}")
    #    return jsonify({'status': 'FAILED', 'error': str(e)}), 500

    return jsonify({'status': 'SUCCESS'})


@app.route('/healthcheck', methods=['GET'])
def healthCheck():
    return jsonify({'status': 'healthy'})


if __name__ == '__main__':
    ssl_cert_path = '/etc/letsencrypt/archive/loonsw.sci.utah.edu/fullchain1.pem'
    ssl_key_path = '/etc/letsencrypt/archive/loonsw.sci.utah.edu/privkey1.pem'

    # Run Flask with HTTPS
    app.run(host='0.0.0.0', port=8443, ssl_context=(ssl_cert_path, ssl_key_path))
