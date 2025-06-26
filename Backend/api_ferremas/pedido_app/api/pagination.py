from rest_framework.pagination import PageNumberPagination

class CustomPagination(PageNumberPagination):
    page_size = 10  # Número de elementos por página por defecto
    page_size_query_param = 'page_size' # Permite al cliente cambiar el tamaño de la página con ?page_size=...
    max_page_size = 100 # Límite máximo de tamaño de página que el cliente puede solicitar