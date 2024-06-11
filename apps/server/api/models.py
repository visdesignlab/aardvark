from django.db import models  # type: ignore
from s3_file_field import S3FileField  # type: ignore
import uuid
# Create your models here.


class LoonUpload(models.Model):

    def upload_path(instance, filename):
        return f'temp/{uuid.uuid4()}/{filename}'

    class WorkflowType(models.TextChoices):
        LIVE_CYTE = 'live_cyte'

    class FileType(models.TextChoices):
        SEGMENTATIONS = 'segmentations'
        CELL_IMAGES = 'cell_images'
        METADATA = 'metadata'

    workflow_code = models.CharField(max_length=30, choices=WorkflowType.choices)
    file_type = models.CharField(max_length=20, choices=FileType.choices)
    file_name = models.CharField(max_length=255)
    location = models.DecimalField(max_digits=5, decimal_places=0)
    experiment_name = models.CharField(max_length=255)
    blob = S3FileField(upload_to=upload_path)


class Experiment(models.Model):

    def to_json(self):
        locations = self.locations.all()
        location_data = [location.to_json() for location in locations]
        data = {
            "name": self.name,
            "headerTransforms": {
                "time": self.header_time,
                "frame": self.header_frame,
                "id": self.header_id,
                "parent": self.header_parent,
                "mass": self.header_mass,
                "x": self.header_x,
                "y": self.header_y,
            },
            "locationMetadataList": location_data
        }
        return data

    name = models.CharField(max_length=255)
    header_time = models.CharField(max_length=255)
    header_frame = models.CharField(max_length=255)
    header_id = models.CharField(max_length=255)
    header_parent = models.CharField(max_length=255)
    header_mass = models.CharField(max_length=255)
    header_x = models.CharField(max_length=255)
    header_y = models.CharField(max_length=255)
    number_of_locations = models.IntegerField()


class Location(models.Model):

    def to_json(self):
        data = {
            "id": self.name,
            "tabularDataFilename": self.tabular_data_filename,
            "imageDataFilename": self.images_data_filename,
            "segmentationsFolder": self.segmentations_folder
        }
        return data

    experiment = models.ForeignKey(Experiment, related_name='locations', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    tabular_data_filename = models.CharField(max_length=255)
    images_data_filename = models.CharField(max_length=255)
    segmentations_folder = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.experiment}_{self.name}"
