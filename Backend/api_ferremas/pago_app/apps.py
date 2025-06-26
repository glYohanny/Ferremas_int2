from django.apps import AppConfig


class PagoAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pago_app'

    def ready(self):
        import pago_app.signals # Importar para que las señales de pago_app se registren
