from django.apps import AppConfig


class PedidoAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pedido_app'

    def ready(self):
        import pedido_app.signals # Importar las señales para que se registren
