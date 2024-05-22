from django.apps import AppConfig
from .tasks import background_task
from concurrent.futures import processing_monitor

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'

    def ready(self):
        executor = ThreadPoolExecutor(max_workers=1)
        executor.submit(processing_monitor)
