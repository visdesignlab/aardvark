from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import HelloWorldSerializer
import boto3
import os
import json
import time
import zipfile
import tempfile
import threading
import concurrent.futures
import shutil
import uuid

ENDPOINT_URL='http://127.0.0.1:9000'
BUCKET='data'

BAD_FILES=[
    ".DS_Store"
]

processing_status = {}
processing_status_lock = threading.Lock()



def _badFileChecker(file_name:str):
    for check_name in BAD_FILES:
        if check_name in file_name:
            return True
    return False

def _processZipFile(zip_file_name,zip_file_path,experiment_name,unique_file_name,location_prefix):
    print("Started processing: " + unique_file_name, flush=True)
    print(f'Key: {experiment_name}/{location_prefix}',flush=True)
    print(zip_file_path,flush=True)
    s3 = boto3.resource(service_name='s3',endpoint_url=ENDPOINT_URL)
    prefix_name = zip_file_name.split(".")[0]
    with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
        zip_contents = zip_ref.namelist()
        for file_name in zip_contents:
            if file_name.startswith(prefix_name) and not _badFileChecker(file_name):
                # Read the file contents from the zip
                file_contents = zip_ref.read(file_name)
                if file_contents:
                    # Upload the file contents to S3
                    s3.Bucket(BUCKET).put_object(Key=f'{experiment_name}/{location_prefix}/{file_name}', Body=file_contents)
    
    # Update status of processing
    with processing_status_lock:
        processing_status[unique_file_name] = True

# Single File Upload View
class UploadDataView(APIView):

    def post(self,request):
        # Get data
        data = request.data
        # Get File
        file =  data['file']
        metadata = json.loads(data.get('metadata'))

        # Unpack rest
        file_name,label,location,experiment_name, workflow_code,file_type = {**metadata}.values()

        location_based_file_name = label + "_" + file_name

        unique_file_name = f'{str(uuid.uuid4())[:6]}_{experiment_name}_{location_based_file_name}'
        location_prefix = f'location_{location}'

        print(file_name, flush=True)
        print(file, flush=True)
        print(unique_file_name,flush=True)
        print(location_based_file_name,flush=True)

        if(workflow_code == 'live_cyte'):
            if(file_type == 'cell_images' or file_type == 'segmentations'):
                if file_name.endswith('.zip'):
                    # Redeclare for readibility
                    zip_file = file
                    # Make temp directory to store value
                    temp_dir = tempfile.mkdtemp()
                    # Create a new file path for this zip file
                    zip_file_path = os.path.join(temp_dir, location_based_file_name)
                    # Save the uploaded file to the temporary location
                    with open(zip_file_path, 'wb') as f:
                        shutil.copyfileobj(zip_file, f)
                    
                    # Initialize status
                    with processing_status_lock:
                        processing_status[unique_file_name] = False

                    # Run the _processZipFile function in background
                    executor = concurrent.futures.ThreadPoolExecutor()
                    future = executor.submit(_processZipFile, file_name, zip_file_path, experiment_name, unique_file_name, location_prefix)

                    future.add_done_callback(lambda f: shutil.rmtree(temp_dir))

                    return Response({'status':"SUCCESS",'unique_file_name':unique_file_name})
                else:
                    return_object = {'status':'FAILED','unique_file_name':'no_name_generated', 'message':'This combination of workflow and file_type must requires a zip file.'}
                    return Response(return_object)
            elif file_type == 'metadata':
                s3 = boto3.resource(service_name='s3',endpoint_url=ENDPOINT_URL)
                s3.Bucket(BUCKET).put_object(Key=f'{experiment_name}/{location_prefix}/{file_name}', Body=file)
                return Response({'status':"SUCCESS",'unique_file_name':unique_file_name})

        else:
            return_object = {'status':'FAILED', 'message':'No matching workflow or file type.','unique_file_name':'no_name_generated'}
            return Respone(return_object)
                
        return_object = {'status':"FAILED",'unique_file_name':'no_name_generated', 'message':'No matching workflow type.'}
        return Response(return_object)


    def get(self,request,filename):
        with processing_status_lock:
            try:
                status = processing_status[filename]
            except KeyError:
                return Response({'status':False})
            print(processing_status,flush=True)
        return Response({'status': status})





'''
-------------------------------------------
-------------------------------------------
-------------------------------------------
OLDER STUFF
-------------------------------------------
-------------------------------------------
-------------------------------------------
'''


class ListBucketsView(APIView):
    def get(self, request):
        session = boto3.session.Session()
        s3_client = session.client(
            service_name='s3',
            endpoint_url=ENDPOINT_URL
        )
        buckets = s3_client.list_buckets()
        return Response(buckets)

class AuthorizationKeys(APIView):
    def get(self,request):
        with open('api/secrets.json','r') as secrets_json:
            secrets = json.load(secrets_json)
            print(secrets,flush=True)

        return Response(secrets)

