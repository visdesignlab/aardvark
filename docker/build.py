# import os
import json
import re


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
    def __init__(self, filename):
        with open(filename, 'r') as file:
            self.config = json.load(file)
        self.outConfig = {}
        self.errors = []
        self.validate()

    def validate(self):
        with open('config.json.schema', 'r') as schemaFile:
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

        with open('.env.test.production', 'w') as outF:
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


buildConfig = BuildConfig('config-production.json')
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
