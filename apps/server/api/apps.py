from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        from .tasks import processing_monitor
        from concurrent.futures import ThreadPoolExecutor

        if not hasattr(self, "executor"):
            self.executor = ThreadPoolExecutor(max_workers=1)
            self.executor.submit(processing_monitor)
