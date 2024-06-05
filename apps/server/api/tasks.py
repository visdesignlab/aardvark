import time
from queue import Queue
from abc import abstractmethod, ABC
import zipfile
import boto3  # type: ignore
import threading
import logging
import os


# Task Status
task_status = {}
task_status_lock = threading.Lock()

# Task Queue
task_queue = Queue()

ENDPOINT_URL = "http://127.0.0.1:9000"
BUCKET = "data"

BAD_FILES = [".DS_Store"]

# Configure logging


# Creates a filter so that only manually added logging messages will pass to file handlers.
class RootOnlyFilter(logging.Filter):
    def filter(self, record):
        return record.name == "root"


logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

file_handler = logging.FileHandler("app.log")
file_handler.setLevel(logging.INFO)
file_formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
file_handler.setFormatter(file_formatter)

# Create a stream handler
stream_handler = logging.StreamHandler()
stream_handler.setLevel(logging.DEBUG)
stream_formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
stream_handler.setFormatter(stream_formatter)

# Apply the filter to both handlers
file_handler.addFilter(RootOnlyFilter())
stream_handler.addFilter(RootOnlyFilter())

# Add handlers to the root logger
logger.addHandler(file_handler)
logger.addHandler(stream_handler)


def _badFileChecker(file_name: str):
    for check_name in BAD_FILES:
        if check_name in file_name:
            return True
    return False


class FailedToCreateTaskException(Exception):
    """Exception raised when we fail to create a task."""

    def __init__(self, message="Failed to create task"):
        self.message = message
        super().__init__(self.message)


class CallbackException(Exception):
    def __init__(self, message="Failed to run callback."):
        self.message = message
        super().__init__(self.message)


class Task(ABC):
    def __str__(self):
        return f"\nFile name: {self.file_name}\nLocation: {self.location}\n" \
                f"Experiment Name: {self.experiment_name}\n" \
                f"Unique File Name: {self.unique_file_name}\n" \
                f"Temp File Path: {self.temp_file_path}\n" \
                f"Location Prefix: {self.location_prefix}"

    def __init__(self, **kwargs):
        try:
            self.file_name = kwargs["file_name"]
            self.location = kwargs["location"]
            self.experiment_name = kwargs["experiment_name"]
            self.unique_file_name = kwargs["unique_file_name"]
            self.temp_file_path = kwargs["temp_file_path"]
            self.location_prefix = f"location_{self.location}"
        except KeyError as e:
            raise FailedToCreateTaskException(f"Failed to create task:{e.message}")

    # Setter for status
    def set_status(self, status):
        with task_status_lock:
            task_status[self.unique_file_name]["status"] = status

    # Returns the status of the task
    def get_status(self):
        with task_status_lock:
            return task_status[self.unique_file_name]

    def cleanup_temp_files(self):
        os.remove(self.temp_file_path)

    # Generic unpacking of a zip file with callback for additional processing.
    def process_zip_file(self, callback=None):
        try:
            s3 = boto3.resource(service_name="s3", endpoint_url=ENDPOINT_URL)

            # If "images.zip" is uploaded, then all files should begin with "images/",
            # regardless of the contents. This helps get rid of unnecessary hidden files.
            prefix_name = self.file_name.split(".")[0]
            with zipfile.ZipFile(self.temp_file_path, "r") as zip_ref:
                zip_contents = zip_ref.namelist()
                for curr_file_name in zip_contents:
                    if curr_file_name.startswith(prefix_name) and not _badFileChecker(
                        curr_file_name
                    ):
                        # Read the file contents from the zip
                        file_contents = zip_ref.read(curr_file_name)

                        if file_contents:
                            # If callback passed, use the callback to modify
                            # file_contents and the file_name.
                            if callback:
                                try:
                                    file_contents, curr_file_name = callback(
                                        file_contents, curr_file_name
                                    )
                                except CallbackException as e:
                                    return {
                                        "process_zip_file_status": "FAILED",
                                        "message": f"Failed at callback: {e.message}",
                                    }
                            # Upload the file contents to S3
                            s3.Bucket(BUCKET).put_object(
                                Key=(f"{self.experiment_name}/"
                                     f"{self.location_prefix}/"
                                     f"{curr_file_name}"),
                                Body=file_contents,
                            )
            return {"process_zip_file_status": "SUCCEEDED"}

        except FileNotFoundError:
            return {"process_zip_file_status": "FAILED", "message": "Could not find file"}

    # Declare abstract execute method
    @abstractmethod
    def execute(self):
        pass

    # Declare abstract cleanup method
    @abstractmethod
    def cleanup(self):
        pass

    # Method to initialize correct task dependent on the workflow_code and the workflow_file_type.
    @staticmethod
    def create_task(workflow_code, workflow_file_type, **kwargs):
        if workflow_code == "live_cyte":
            if workflow_file_type == "segmentations":
                logger.info("Got a segmentations task")
                return LiveCyteSegmentationsTask(**kwargs)
            elif workflow_file_type == "cell_images":
                logger.info("Got a cell_images task")
                return LiveCyteCellImagesTask(**kwargs)
            elif workflow_file_type == "metadata":
                logger.info("Got a metadata task")
                return LiveCyteMetadataTask(**kwargs)
            else:
                raise FailedToCreateTaskException(
                    f"Unknown task type {workflow_file_type} for workflow {workflow_code}"
                )


class LiveCyteSegmentationsTask(Task):
    def execute(self):
        logger.info(f"Executing task: {self.unique_file_name}")
        self.set_status("RUNNING")
        status = self.process_zip_file(callback=None)
        self.set_status(status["process_zip_file_status"])

    def cleanup(self):
        logger.info(f"Cleaning up task: {self.unique_file_name}")
        self.cleanup_temp_files()


class LiveCyteCellImagesTask(Task):
    def execute(self):
        logger.info(f"Executing task: {self.unique_file_name}")
        self.set_status("RUNNING")
        status = self.process_zip_file(callback=None)
        self.set_status(status["process_zip_file_status"])

    def cleanup(self):
        logger.info(f"Cleaning up task: {self.unique_file_name}")
        self.cleanup_temp_files()


class LiveCyteMetadataTask(Task):
    def execute(self):
        logger.info(f"Executing task: {self.unique_file_name}")
        self.set_status("RUNNING")
        try:
            with open(self.temp_file_path, "rb") as file:
                s3 = boto3.resource(service_name="s3", endpoint_url=ENDPOINT_URL)
                s3.Bucket(BUCKET).put_object(
                    Key=f"{self.experiment_name}/{self.location_prefix}/{self.file_name}",
                    Body=file,
                )
            self.set_status("completed")
        except FileNotFoundError:
            self.set_status("FAILED")

    def cleanup(self):
        logger.info(f"Cleaning up task: {self.unique_file_name}")
        self.cleanup_temp_files()


def processing_monitor():
    from concurrent.futures import ThreadPoolExecutor

    def worker(curr_task):
        logger.info(curr_task)
        try:
            curr_task.execute()
            logger.info("Reached here")
        finally:
            curr_task.cleanup()
    with ThreadPoolExecutor(max_workers=4) as executor:
        while True:
            if task_queue.qsize() > 0:
                logger.info("We have an entry!")
                curr_task = task_queue.get()
                executor.submit(worker, curr_task)
            else:
                time.sleep(5)
