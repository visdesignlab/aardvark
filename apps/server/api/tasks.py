import time
from queue import Queue
from abc import abstractmethod, ABC
import zipfile
import boto3


# Task Status
task_status = {}
task_status_lock = threading.Lock()

# Task Queue
task_queue = Queue()
task_queue_lock = threading.Lock()

ENDPOINT_URL='http://127.0.0.1:9000'
BUCKET='data'

BAD_FILES=[
    ".DS_Store"
]

def _badFileChecker(file_name:str):
    for check_name in BAD_FILES:
        if check_name in file_name:
            return True
    return False

class FailedToCreateTaskException(Exception):
    """Exception raised when we fail to create a task."""
    def __init__(self,message="Failed to create task"):
        self.message = messages
        super().__init__(self.message)

class Task(ABC):
    def __init__(self,**kwargs):
        try:
            self.file_name=kwargs['file_name']
            self.location=kwargs['location']
            self.experiment_name=kwargs['experiment_name']
            self.unique_file_name=kwargs['unique_file_name']
            self.temp_file_path=kwargs['temp_file_path']
            self.location_prefix = f'location_{self.location}'
        except KeyError as e:
            raise FailedToCreateTaskException(f"Failed to create task:{e.message}")
        
    # Setter for status
    def set_status(self,status):
        with task_status_lock:
            task_status[self.unique_file_name]['status'] = status
            
    # Returns the status of the task
    def get_status(self):
        with task_status_lock:
            return task_status[self.unique_file_name]
    
    def cleanup_temp_files(self):
        os.remove(self.temp_file_path)
    
    # Generic unpacking of a zip file with callback for additional processing.
    def process_zip_file(self,callback=None):
        try:
            s3 = boto3.resource(service_name='s3',endpoint_url=ENDPOINT_URL)
            
            # If "images.zip" is uploaded, then all files should begin with "images/", regardless of the contents. This helps get rid of unnecessary hidden files.
            prefix_name = self.file_name.split(".")[0]
            
            with zipfile.ZipFile(self.temp_file_path, 'r') as zip_ref:
                zip_contents = zip_ref.namelist()
                for file_name in zip_contents:
                    if file_name.startswith(prefix_name) and not _badFileChecker(file_name):
                        # Read the file contents from the zip
                        file_contents = zip_ref.read(file_name)
                        if file_contents:
                            # If callback passed, use the callback to modify file_contents and the file_name.
                            if callback:
                                try:
                                    file_contents,file_name = callback(file_contents,file_name)
                                except:
                                    return {"process_zip_file_status":"failed","message":"Failed at callback"}
                            # Upload the file contents to S3
                            s3.Bucket(BUCKET).put_object(Key=f'{experiment_name}/{location_prefix}/{file_name}', Body=file_contents)
            return {"process_zip_file_status":"succeeded"}
        
        except:
            return {"process_zip_file_status":"failed"}
    
    # Declare abstract execute method
    @abstractmethod
    def execute(self):
        pass
    
    # Declare abstract cleanup method
    @abstractmethod
    def cleanup(self):
        pass
        
    
    """Method to initialize correct task dependent on the workflow_code and the label."""
    @staticmethod
    def create_task(workflow_code,label,**kwargs):
        if(workflow_code === 'live_cyte'):
            if(label === 'segmentations'):
                return LiveCyteSegmentationsTask(**kwargs)
            elif(label === 'cell_images'):
                return LiveCyteCellImagesTask(**kwargs)
            elif(label === 'metadata'):
                return LiveCyteMetadataTask(**kwargs)
            else:
                raise FailedToCreateTaskException(f"Unknown task type {label} for workflow {workflow_code}")
            
class LiveCyteSegmentationsTask(Task):
    def execute(self,execute):
        print(f'Executing task: {self.unique_file_name}')
        self.set_status("running")
        status = self.process_zip_file(callback=None)
        self.set_status(status["process_zip_file_status"])
    
    def cleanup():
        print(f'Cleaning up task: {self.unique_file_name}')
        self.cleanup_temp_files()

class LiveCyteCellImagesTask(Task):
    def execute(self,execute):
        print(f'Executing task: {self.unique_file_name}')
        self.set_status("running")
        status = self.process_zip_file(callback=None)
        self.set_status(status["process_zip_file_status"])  
        
    def cleanup():
        print(f'Cleaning up task: {self.unique_file_name}')
        self.cleanup_temp_files()


class LiveCyteMetadataTask(Task):
    def execute():
        print(f'Executing task: {self.unique_file_name}')
        self.set_status("running")
        try:
            with open(self.temp_file_path,'rb') as file:
                s3 = boto3.resource(service_name='s3',endpoint_url=ENDPOINT_URL)
                s3.Bucket(BUCKET).put_object(
                    Key=f'{self.experiment_name}/{self.location_prefix}/{self.file_name}', Body=file
                )
            self.set_status("completed")
        except:
            self.set_status("failed")
    
    def cleanup():
        print(f'Cleaning up task: {self.unique_file_name}')
        self.cleanup_temp_files()
        


def processing_monitor():
    while True:
        if task_queue.qsize() > 0:
            curr_task = q.get()
            curr_task.execute()
            curr_task.cleanup()
        else:
            time.sleep(5)

