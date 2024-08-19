import subprocess
import json
import re
import argparse
import sys
import time
import signal
import threading
import logging
import os
from datetime import datetime


number_of_services = 6


def typeMapping(s, reverse=False):
    type_mapping = {
        "boolean": bool,
        "string": str
    }

    type_mapping_reverse = {value: key for key, value in type_mapping.items()}

    if not reverse:
        return type_mapping[s]
    else:
        return type_mapping_reverse[s]


class BuildValidationError(Exception):
    def __init__(self, message):
        # Call the base class constructor with the parameters it needs
        super().__init__(message)
        # Now for your custom code...


class SchemaError(Exception):
    def __init__(self, message):
        # Call the base class constructor with the parameters it needs
        super().__init__(message)


class BuildConfig:
    def __init__(self, configFile, envFile):
        with open(configFile, 'r') as file:
            self.config = json.load(file)
        self.outConfig = {}
        self.errors = []
        self.validate()
        self.envFile = envFile
        # Env File name will be placed in env file for mounting
        self.set('DOCKER_ENV_FILE', envFile)

    def validate(self):
        with open('buildFiles/config.json.schema', 'r') as schemaFile:
            self.schema = json.load(schemaFile)

        currConfig = self.config
        currSchema = self.schema
        if self.schema['type'] == "object":
            currSchema = self.schema['properties']
            self.validateCurrConfig(currSchema, currConfig, currStepString='')
        else:
            print('This is not an object')

    def validateCurrConfig(self, currSchema, currConfig, currStepString):
        for key, value in currSchema.items():
            if value['type'] == 'object':
                tempSchema = value['properties']
                try:
                    tempConfig = currConfig[key]
                except KeyError:
                    tempConfig = {}
                    self.errors.append({
                        'stepString': currStepString,
                        'type': 'missingKey',
                        'schemaKey': key
                    })
                tempStepString = f'{currStepString}-{key}'
                self.validateCurrConfig(tempSchema, tempConfig, currStepString=tempStepString)
            else:
                schemaType = value['type']
                if key not in currConfig and value['required'] is True:
                    self.errors.append({
                        'stepString': currStepString,
                        'type': 'missingKey',
                        'schemaKey': key
                    })
                elif key in currConfig and type(currConfig[key]) is not typeMapping(schemaType):
                    self.errors.append({
                        'stepString': currStepString,
                        'type': 'incorrectType',
                        'schemaKey': key,
                        'schemaValue': value,
                        'configValue': currConfig[key]
                    })
                elif 'custom' in value:
                    pattern = re.compile(value['custom']['regexPattern'])
                    matchedPattern = pattern.search(currConfig[key])
                    if value['custom']['errorOnMatch']:
                        if matchedPattern is not None:
                            self.errors.append({
                                'stepString': currStepString,
                                'type': 'custom',
                                'message': value['custom']['message'],
                                'schemaKey': key
                            })

    def set(self, settingName, settingValue):
        self.outConfig[settingName] = settingValue

    def writeToEnv(self):
        outString = ""
        for key, value in self.outConfig.items():
            outString = f'{outString}{key}={value}\n'

        with open(self.envFile, 'w') as outF:
            outF.write(outString)

    def reportErrors(self):
        if len(self.errors) == 0:
            print('\nValidated configuration file.\n')
            return
        print('\nEncountered Errors when validating configuration file:\n')
        for entry in self.errors:
            stepString = entry['stepString']
            schemaKey = entry['schemaKey']
            stepStringFormatted = f'{stepString}-{schemaKey}'.lstrip('-').replace('-', '.')
            if entry['type'] == 'missingKey':
                message = f'--> Missing Required Key: {stepStringFormatted}'
            elif entry['type'] == 'incorrectType':
                schemaType = entry['schemaValue']['type']
                configType = typeMapping(type(entry['configValue']), reverse=True)
                message = f'--> Incorrect Type: {stepStringFormatted}' \
                    f' must be "{schemaType}"' \
                    f' but is "{configType}"'
            elif entry['type'] == 'custom':
                errorMessage = entry['message']
                message = f'--> Error at {stepStringFormatted}:' \
                    f' {errorMessage}'
            print(f'{message}\n')
        exit()


def createEnvFile(configFileName, envFileName):
    buildConfig = BuildConfig(configFileName, envFileName)
    buildConfig.reportErrors()

    # --------------------------------------------------------------
    # GENERAL SETTINGS ---------------------------------------------
    # --------------------------------------------------------------
    general_settings = buildConfig.config.get('generalSettings')
    use_http = general_settings.get('useHttp')
    base_url = general_settings.get('baseUrl')
    environment = general_settings.get('environment')

    buildConfig.set('USE_HTTP', use_http)

    if use_http:
        nginx_file = './nginx-http.conf'
        minio_browser_redirect_url = f'http://{base_url}/minio'
    else:
        nginx_file = './nginx-https.conf'
        minio_browser_redirect_url = f'https://{base_url}/minio'

    buildConfig.set('NGINX_FILE', nginx_file)
    buildConfig.set('MINIO_BROWSER_REDIRECT_URL', minio_browser_redirect_url)

    buildConfig.set('VITE_ENVIRONMENT', environment)
    buildConfig.set('VITE_SERVER_URL', f'{base_url}/data')

    # --------------------------------------------------------------
    # MYSQL SETTINGS -----------------------------------------------
    # --------------------------------------------------------------

    my_sql_settings = buildConfig.config.get('mySqlSettings')

    buildConfig.set('DATABASE_ROOT_PASSWORD', my_sql_settings.get('databaseRootPassword'))
    buildConfig.set('DATABASE_PASSWORD', my_sql_settings.get('databasePassword'))
    buildConfig.set('DATABASE_USER', my_sql_settings.get('databaseUser'))
    buildConfig.set('DATABASE_NAME', my_sql_settings.get('databaseName'))
    buildConfig.set('MYSQL_VOLUME_LOCATION', my_sql_settings.get('sourceVolumeLocation'))

    buildConfig.set('DATABASE_HOST', 'db')
    buildConfig.set('DATABASE_PORT', '3306')

    # --------------------------------------------------------------
    # CELERY SETTINGS ----------------------------------------------
    # --------------------------------------------------------------

    buildConfig.set('CELERY_BROKER_URL', 'redis://redis:6379/0')
    buildConfig.set('CELERY_RESULT_BACKEND', 'redis://redis:6379/0')

    # --------------------------------------------------------------
    # MINIO SETTINGS -----------------------------------------------
    # --------------------------------------------------------------

    minio_settings = buildConfig.config.get('minioSettings')
    buildConfig.set('MINIO_STORAGE_ACCESS_KEY', minio_settings.get('minioStorageAccessKey'))
    buildConfig.set('MINIO_STORAGE_SECRET_KEY', minio_settings.get('minioStorageSecretKey'))
    buildConfig.set('MINIO_VOLUME_LOCATION', minio_settings.get('sourceVolumeLocation'))

    buildConfig.set('MINIO_STORAGE_ENDPOINT', 'minio:9000')
    buildConfig.set('MINIO_STORAGE_MEDIA_BUCKET_NAME', 'data')
    buildConfig.set('MINIO_STORAGE_STATIC_BUCKET_NAME', 'static')
    buildConfig.set('MINIO_STORAGE_MEDIA_URL', f'{base_url}/data')
    buildConfig.set('MINIO_STORAGE_STATIC_URL', f'{base_url}/data')

    # --------------------------------------------------------------
    # NGINX SETTINGS -----------------------------------------------
    # --------------------------------------------------------------

    nginx_settings = buildConfig.config.get('nginxSettings')

    buildConfig.set('SSL_SOURCE_DIRECTORY', nginx_settings.get('sourceVolumeLocation'))
    buildConfig.set('SSL_TARGET_MOUNTED_DIRECTORY', nginx_settings.get('targetVolumeLocation'))
    buildConfig.set('SSL_CERT_FILE', nginx_settings.get('certFileLocation'))
    buildConfig.set('SSL_KEY_FILE', nginx_settings.get('keyFileLocation'))

    # --------------------------------------------------------------
    # OTHER SETTINGS -----------------------------------------------
    # --------------------------------------------------------------

    minio_enabled = True if environment == 'production' else False
    buildConfig.set('MINIO_ENABLED', minio_enabled)
    buildConfig.set('DEBUG', True)
    buildConfig.set('ALLOWED_HOST', f"'{base_url}'")
    buildConfig.set('SECRET_KEY',
                    '"django-insecure-z2^vruu347=0e-qyh%&k)%*j9(hgubj$layg&k$-vwb1u+mp93"'
                    )

    buildConfig.writeToEnv()


def run_command(command, shell=True):
    """ Run a shell command and capture its output. """

    process = subprocess.Popen(
        command,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    for line in iter(process.stdout.readline, ''):
        logging.info(line.strip())  # Log each line as INFO
    for line in iter(process.stderr.readline, ''):
        logging.info(line.strip())  # Log errors as ERROR

    return process


def follow_logs(service_name, logs_path, verbose=False):

    file_name = f"{logs_path}/{service_name}.log"
    with open(file_name, 'w') as f:
        command = f'docker compose -f buildFiles/docker-compose.yml logs -f {service_name}'
        process = subprocess.Popen(
            command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        for line in iter(process.stdout.readline, ''):
            clean_line = strip_ansi_escape_codes(line)
            f.write(clean_line)  # Clean line of ASCII characters
            f.flush()
            if verbose:
                logging.info(line.strip())

        for line in iter(process.stderr.readline, ''):
            clean_line = strip_ansi_escape_codes(line)
            f.write(clean_line)  # Write cleaned line to file
            f.flush()  # Ensure the line is written to the file immediately
            if verbose:
                logging.info(line.strip())

        # Optionally send std error to subprocess.PIPE and then take STDERR and log to error file


def build_containers(env_file):
    global stop_spinner
    stop_spinner = False
    """ Build the containers. """
    # print("Building Containers...")
    spinner_thread = threading.Thread(target=spinner, args=("Building containers...",))
    spinner_thread.start()
    process = run_command(f"docker compose -f buildFiles/docker-compose.yml"
                          f" --env-file {env_file} build")
    process.wait()  # Wait for the build to complete

    stop_spinner = True
    spinner_thread.join()  # Ensure spinner thread completes
    print("\nBuild complete.")  # Print new line after spinner stops


def start_containers(env_file, logs_path, verbose=False):
    global stop_spinner
    stop_spinner = False
    """ Start the containers in detached mode. """
    # print("Starting Containers...")
    spinner_thread = threading.Thread(target=spinner, args=("Starting containers...",))
    spinner_thread.start()
    process = run_command(f"docker compose -f buildFiles/docker-compose.yml"
                          f" --env-file {env_file} up -d")

    process.wait()  # Wait for the containers to start

    stop_spinner = True
    spinner_thread.join()  # Ensure spinner thread completes

    services = ["db", "client", "server", "minio", "celery", "redis"]

    for service in services:
        threading.Thread(target=follow_logs, args=(service, logs_path, verbose)).start()

    print("\nContainers started.")


def check_containers_status():
    """ Check and print the status of each container. """
    while True:
        print("Checking container statuses...")
        result = subprocess.run(
            [
                "docker",
                "compose",
                "-f",
                "buildFiles/docker-compose.yml",
                "ps",
                "--services",
                "--filter",
                "status=running"
            ],
            capture_output=True,
            text=True
        )
        running_services = result.stdout.strip().split('\n')

        if len(running_services) == number_of_services:  # Number of containers
            print("All containers are running.")
            time.sleep(5)
        else:
            print(f"Running containers: {running_services}")
            time.sleep(5)  # Wait before checking again


def cleanup_and_exit(signal, frame):
    """ Stop all Docker containers and exit gracefully. """
    print("\nCleaning up and stopping containers...")
    subprocess.run("docker compose -f buildFiles/docker-compose.yml down", shell=True)
    sys.exit(0)


def strip_ansi_escape_codes(text):
    # Regex to match ANSI escape codes
    ansi_escape = re.compile(r'\x1b\[[0-?]*[ -/]*[@-~]')
    return ansi_escape.sub('', text)


def spinner(msg):
    """ Display a spinning cursor to indicate ongoing processes. """
    spinner_chars = ['|', '/', '-', '\\']
    idx = 0
    while not stop_spinner:
        print(f'\r{msg} {spinner_chars[idx % len(spinner_chars)]}', end='')
        idx += 1
        time.sleep(0.1)


if __name__ == "__main__":
    global stop_spinner
    stop_spinner = False

    parser = argparse.ArgumentParser(description="Script description")
    parser.add_argument("--env-file", type=str, required=False,
                        default=".env", help="Name of environment file created.")
    parser.add_argument("--config-file", type=str, required=False,
                        default="config.json", help="Name of config file to pull from.")
    parser.add_argument("-v", "--verbose", action='store_true')
    args = parser.parse_args()

    createEnvFile(args.config_file, args.env_file)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    logs_path = f'logs/logs_{timestamp}'
    full_output_path = f'{logs_path}/out.log'
    os.makedirs(f'logs/logs_{timestamp}', exist_ok=True)

    handlers = [logging.FileHandler(full_output_path)]

    if args.verbose:
        handlers.append(logging.StreamHandler(sys.stdout))

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=handlers
    )

    signal.signal(signal.SIGINT, cleanup_and_exit)
    build_containers(args.env_file)
    start_containers(args.env_file, logs_path, args.verbose)
    check_containers_status()
