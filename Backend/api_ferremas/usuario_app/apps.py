from django.apps import AppConfig


class UsuarioAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'usuario_app'

    def ready(self):
        import usuario_app.signals # Importar las señales
