from django.apps import AppConfig


class BitacoraAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'bitacora_app'

    def ready(self):
        import bitacora_app.signals # Importar para que las señales se registren
