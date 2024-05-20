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

def _processZipFile(zip_name,zip_file_path):
    print("Started processing: " + zip_name, flush=True)
    s3 = boto3.resource(service_name='s3',endpoint_url=ENDPOINT_URL)
    prefix_name = zip_name.split(".")[0]
    with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
        zip_contents = zip_ref.namelist()
        # print(zip_contents, flush=True)
        for file_name in zip_contents:
            if file_name.startswith(prefix_name) and not _badFileChecker(file_name):
                # Read the file contents from the zip
                file_contents = zip_ref.read(file_name)
                if file_contents:
                    # Upload the file contents to S3
                    s3.Bucket(BUCKET).put_object(Key='test_data/' + file_name, Body=file_contents)
    
    # Update status of processing
    with processing_status_lock:
        processing_status[zip_name] = True

# Single File Upload View
class UploadDataView(APIView):

    def post(self,request):
        # Get single item
        file_name, file = list(request.data.items())[0]
        print(file_name, flush=True)
        print(file, flush=True)
        if file_name.endswith('.zip'):
            # Redeclare for readibility
            zip_file = file
            # Make temp directory to store value
            temp_dir = tempfile.mkdtemp()
            # Create a new file path for this zip file
            zip_file_path = os.path.join(temp_dir, file_name)
            # Save the uploaded file to the temporary location
            with open(zip_file_path, 'wb') as f:
                shutil.copyfileobj(zip_file, f)
            
            # Initialize status
            with processing_status_lock:
                processing_status[file_name] = False

            # Run the _processZipFile function in background
            executor = concurrent.futures.ThreadPoolExecutor()
            future = executor.submit(_processZipFile, file_name, zip_file_path)

            future.add_done_callback(lambda f: shutil.rmtree(temp_dir))
        else:
            print('Here instead')
            # Do something if it's just a CSV and requires no processing
                
        return Response({'status':"SUCCESS"})


    def get(self,request,filename):
        with processing_status_lock:
            try:
                status = processing_status[filename]
            except KeyError:
                return Response({'status':False})
            # print(processing_status,flush=True)
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

