# Plan de Pruebas - Sistema Ferremas

## 1. Pruebas Unitarias (Backend)

### Configuración de Pruebas
```bash
# Crear archivo de configuración para pruebas
python manage.py test --settings=api_ferremas.settings_test
```

### Áreas a Probar:

#### A. Modelos
- **PedidoProveedor**: Creación, actualización, cálculos de totales
- **PedidoCliente**: Estados, transiciones, cálculos de descuentos
- **Producto**: Precios, promociones, stock
- **Usuario**: Roles, permisos, autenticación

#### B. Serializers
- **PedidoProveedorSerializer**: Validación de datos, creación con bodegas
- **PedidoClienteSerializer**: Cálculos de descuentos, promociones
- **ProductoSerializer**: Precios con descuentos

#### C. Views/APIs
- **Endpoints de pedidos**: CRUD completo
- **Autenticación**: Login, logout, permisos
- **Búsquedas**: Filtros, paginación

### Ejemplo de Prueba Unitaria:
```python
# tests/test_pedido_proveedor.py
from django.test import TestCase
from django.contrib.auth import get_user_model
from pedido_app.models import PedidoProveedor, Bodega
from proveedor_app.models import Proveedor

class PedidoProveedorTestCase(TestCase):
    def setUp(self):
        # Configurar datos de prueba
        self.user = get_user_model().objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.proveedor = Proveedor.objects.create(
            razon_social='Proveedor Test'
        )
        self.bodega = Bodega.objects.create(
            sucursal=sucursal,
            tipo_bodega=tipo_bodega,
            direccion='Dirección Test'
        )

    def test_crear_pedido_proveedor(self):
        """Prueba la creación de un pedido a proveedor"""
        pedido = PedidoProveedor.objects.create(
            proveedor=self.proveedor,
            bodega_recepcion=self.bodega,
            creado_por=self.user
        )
        self.assertEqual(pedido.estado, 'SOLICITADO')
        self.assertEqual(pedido.proveedor, self.proveedor)
        self.assertEqual(pedido.bodega_recepcion, self.bodega)

    def test_calcular_totales_pedido(self):
        """Prueba el cálculo de totales del pedido"""
        # Implementar prueba de cálculos
        pass
```

## 2. Pruebas de Integración

### A. Flujos Completos
1. **Crear pedido a proveedor**:
   - Seleccionar sucursal → cargar bodegas → seleccionar bodega
   - Agregar productos → calcular totales → guardar

2. **Proceso de venta**:
   - Cliente selecciona productos → aplica promociones
   - Proceso de pago → actualización de stock

3. **Gestión de inventario**:
   - Recepción de pedidos → actualización de stock
   - Traspasos entre bodegas

### B. APIs
```python
# tests/test_api_integration.py
from rest_framework.test import APITestCase
from rest_framework import status

class PedidoProveedorAPITestCase(APITestCase):
    def setUp(self):
        # Configurar usuario autenticado
        self.user = get_user_model().objects.create_user(
            username='admin',
            password='admin123',
            is_staff=True
        )
        self.client.force_authenticate(user=self.user)

    def test_crear_pedido_proveedor_api(self):
        """Prueba la API de creación de pedidos a proveedor"""
        data = {
            'proveedor': self.proveedor.id,
            'bodega_recepcion': self.bodega.id,
            'detalles_pedido': [
                {
                    'producto': self.producto.id,
                    'cantidad_solicitada': 10,
                    'precio_unitario_compra': 100.00
                }
            ]
        }
        
        response = self.client.post('/api/pedidos/pedidos-proveedor/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PedidoProveedor.objects.count(), 1)
```

## 3. Pruebas de Frontend

### A. Pruebas Manuales Documentadas
1. **Navegación**: Todas las rutas funcionan correctamente
2. **Formularios**: Validación, envío, respuesta
3. **Responsive**: Diferentes tamaños de pantalla
4. **Navegadores**: Chrome, Firefox, Safari, Edge

### B. Pruebas Automatizadas (Jest + Testing Library)
```javascript
// tests/CrearPedidoProveedorPage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CrearPedidoProveedorPage from '../pages/Personal/Administrador/GestionProveedores/CrearPedidoProveedorPage';

describe('CrearPedidoProveedorPage', () => {
  test('debe cargar proveedores y sucursales al montar', async () => {
    render(<CrearPedidoProveedorPage />);
    
    await waitFor(() => {
      expect(screen.getByText('-- Seleccione un proveedor --')).toBeInTheDocument();
      expect(screen.getByText('-- Seleccione una sucursal --')).toBeInTheDocument();
    });
  });

  test('debe cargar bodegas cuando se selecciona una sucursal', async () => {
    render(<CrearPedidoProveedorPage />);
    
    const sucursalSelect = screen.getByLabelText('Sucursal de Recepción:');
    fireEvent.change(sucursalSelect, { target: { value: '1' } });
    
    await waitFor(() => {
      expect(screen.getByText('-- Seleccione una bodega --')).toBeInTheDocument();
    });
  });
});
```

## 4. Pruebas de Rendimiento

### A. Backend
```python
# tests/test_performance.py
from django.test import TestCase
from django.test.utils import override_settings
import time

class PerformanceTestCase(TestCase):
    def test_pedidos_proveedor_list_performance(self):
        """Prueba el rendimiento de la lista de pedidos a proveedor"""
        start_time = time.time()
        
        response = self.client.get('/api/pedidos/pedidos-proveedor/')
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(execution_time, 1.0)  # Debe ejecutarse en menos de 1 segundo
```

### B. Frontend
```javascript
// tests/performance.test.js
import { render } from '@testing-library/react';
import CrearPedidoProveedorPage from '../pages/CrearPedidoProveedorPage';

test('debe renderizar en menos de 100ms', () => {
  const startTime = performance.now();
  
  render(<CrearPedidoProveedorPage />);
  
  const endTime = performance.now();
  const renderTime = endTime - startTime;
  
  expect(renderTime).toBeLessThan(100);
});
```

## 5. Pruebas de Seguridad

### A. Autenticación y Autorización
- Usuarios no autenticados no pueden acceder a rutas protegidas
- Usuarios con roles específicos solo ven lo que deben ver
- Validación de tokens JWT

### B. Validación de Datos
- Inyección SQL (aunque Django ORM lo previene)
- XSS en formularios
- CSRF protection

## 6. Herramientas Recomendadas

### Para Documentación:
- **Notion** o **Confluence** para documentar casos de prueba
- **Jira** o **GitHub Issues** para tracking de bugs
- **Loom** para grabaciones de video

### Para Automatización:
- **Backend**: pytest, coverage.py
- **Frontend**: Jest, Cypress
- **API**: Postman, Newman (CLI)

### Para Rendimiento:
- **Backend**: Django Debug Toolbar, django-silk
- **Frontend**: Lighthouse, React DevTools Profiler

## 7. Checklist de Pruebas

### Funcionalidades Críticas:
- [ ] Login/Logout de usuarios
- [ ] Creación de pedidos a proveedor
- [ ] Creación de pedidos de cliente
- [ ] Aplicación de promociones y descuentos
- [ ] Proceso de pago
- [ ] Gestión de inventario
- [ ] Reportes y consultas

### Casos Edge:
- [ ] Pedidos sin stock disponible
- [ ] Promociones expiradas
- [ ] Pagos fallidos
- [ ] Usuarios con permisos limitados
- [ ] Datos inválidos en formularios

## 8. Ejecución de Pruebas

### Comando para ejecutar todas las pruebas:
```bash
# Backend
python manage.py test --verbosity=2 --coverage

# Frontend
npm test -- --coverage --watchAll=false
```

### Generar reporte de cobertura:
```bash
# Backend
coverage run --source='.' manage.py test
coverage report
coverage html  # Genera reporte HTML

# Frontend
npm run test:coverage
```

Este plan te dará una base sólida para probar tu software de manera sistemática y documentada. 