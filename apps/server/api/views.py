from rest_framework.views import APIView  # type: ignore
from rest_framework.response import Response  # type: ignore
import boto3  # type: ignore
import os
import json
import tempfile
import shutil
import uuid
from .tasks import (
    task_queue,
    task_status,
    task_status_lock,
    FailedToCreateTaskException,
    Task,
)


# Single File Upload View
class UploadDataView(APIView):
    def post(self, request):
        # Get data
        data = request.data
        # Get File
        file = data["file"]
        metadata = json.loads(data.get("metadata"))

        # Unpack rest
        file_name, label, location, experiment_name, workflow_code, file_type = {
            **metadata
        }.values()

        location_based_file_name = label + "_" + file_name

        # Generate unique file name for status and saving.
        unique_file_name = f"{str(uuid.uuid4())[:6]}_{experiment_name}_{location_based_file_name}"
        # Make temp directory to store value
        temp_dir = tempfile.mkdtemp()
        # Create a new file path for this zip file
        temp_file_path = os.path.join(temp_dir, unique_file_name)
        # Save the uploaded file to the temporary location
        with open(temp_file_path, "wb") as f:
            shutil.copyfileobj(file, f)

        try:
            # Create task
            curr_task = Task.create_task(
                workflow_code,
                file_type,
                file_name=file_name,
                location=location,
                experiment_name=experiment_name,
                unique_file_name=unique_file_name,
                temp_file_path=temp_file_path,
            )

            # Add task to status list
            with task_status_lock:
                task_status[unique_file_name] = {"status": "QUEUED"}

            # Add task to queue
            task_queue.put(curr_task)

            # Return success
            return Response({"status": "SUCCESS",
                             "message": "task has been dispatched",
                             "unique_file_name": unique_file_name
                             })
        except FailedToCreateTaskException as e:
            # If failed to create task, return failure message.
            return Response({"status": "FAILED", "message": e.message})

    def get(self, request, filename):
        with task_status_lock:
            try:
                status = task_status[filename]
            except KeyError:
                return Response({"status": "ERROR",
                                 "message": "Unable to retrieve status of file upload."
                                 })
        return Response(status)


class FinishExperimentView(APIView):
    def post(self, request):
        # Needs to append experiment
        # Needs to create experiment metadata file
        # Process the CSV file and grab the headers
        # Allow for UI to set values....???????
        data = request.data
        experiment_settings = json.loads(data.get('experimentSettings'))
        json_string = json.dumps(experiment_settings, indent=2)

        s3 = boto3.resource(service_name="s3", endpoint_url=ENDPOINT_URL)
        s3.Bucket(BUCKET).put_object(
            Body=json_string.encode(),
            Key=data.get('experimentName') + '.json',
            ContentType='application/json'
        )

        return Response({'status': 'fake_response'})


"""
-------------------------------------------
-------------------------------------------
-------------------------------------------
OLDER STUFF
-------------------------------------------
-------------------------------------------
-------------------------------------------
"""

ENDPOINT_URL = "http://127.0.0.1:9000"
BUCKET = "data"

BAD_FILES = [".DS_Store"]


class ListBucketsView(APIView):
    def get(self):
        session = boto3.session.Session()
        s3_client = session.client(service_name="s3", endpoint_url=ENDPOINT_URL)
        buckets = s3_client.list_buckets()
        return Response(buckets)


class AuthorizationKeys(APIView):
    def get(self):
        with open("api/secrets.json", "r") as secrets_json:
            secrets = json.load(secrets_json)
            print(secrets, flush=True)

        return Response(secrets)
