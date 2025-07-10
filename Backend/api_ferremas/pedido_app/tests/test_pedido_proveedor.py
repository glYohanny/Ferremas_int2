from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
from datetime import date

from pedido_app.models import PedidoProveedor, DetallePedidoProveedor
from proveedor_app.models import Proveedor
from producto_app.models import Producto
from sucursal_app.models import Sucursal, Bodega, TipoBodega
from ubicacion_app.models import Region, Comuna

class PedidoProveedorTestCase(TestCase):
    """Pruebas para el modelo PedidoProveedor"""
    
    def setUp(self):
        """Configurar datos de prueba"""
        # Crear usuario
        self.user = get_user_model().objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )
        
        # Crear ubicación
        self.region = Region.objects.create(nombre='Región Test')
        self.comuna = Comuna.objects.create(
            nombre='Comuna Test',
            region=self.region
        )
        
        # Crear sucursal
        self.sucursal = Sucursal.objects.create(
            nombre='Sucursal Test',
            region=self.region,
            comuna=self.comuna,
            direccion='Dirección Test 123'
        )
        
        # Crear tipo de bodega
        self.tipo_bodega = TipoBodega.objects.create(tipo='Principal')
        
        # Crear bodega
        self.bodega = Bodega.objects.create(
            sucursal=self.sucursal,
            tipo_bodega=self.tipo_bodega,
            direccion='Bodega Test 456'
        )
        
        # Crear proveedor
        self.proveedor = Proveedor.objects.create(
            razon_social='Proveedor Test SPA',
            rut='12345678-9',
            email='proveedor@test.com'
        )
        
        # Crear producto
        self.producto = Producto.objects.create(
            nombre='Producto Test',
            descripcion='Descripción del producto test',
            precio=Decimal('100.00'),
            sku='TEST001'
        )

    def test_crear_pedido_proveedor(self):
        """Prueba la creación básica de un pedido a proveedor"""
        pedido = PedidoProveedor.objects.create(
            proveedor=self.proveedor,
            bodega_recepcion=self.bodega,
            creado_por=self.user,
            fecha_estimada_entrega=date.today()
        )
        
        self.assertEqual(pedido.estado, 'SOLICITADO')
        self.assertEqual(pedido.proveedor, self.proveedor)
        self.assertEqual(pedido.bodega_recepcion, self.bodega)
        self.assertEqual(pedido.creado_por, self.user)
        self.assertEqual(pedido.subtotal, Decimal('0.00'))
        self.assertEqual(pedido.total_pedido, Decimal('0.00'))

    def test_propiedad_sucursal_recepcion(self):
        """Prueba la propiedad que obtiene la sucursal desde la bodega"""
        pedido = PedidoProveedor.objects.create(
            proveedor=self.proveedor,
            bodega_recepcion=self.bodega,
            creado_por=self.user
        )
        
        self.assertEqual(pedido.sucursal_recepcion, self.sucursal)

    def test_calcular_totales_con_detalles(self):
        """Prueba el cálculo de totales cuando se agregan detalles"""
        pedido = PedidoProveedor.objects.create(
            proveedor=self.proveedor,
            bodega_recepcion=self.bodega,
            creado_por=self.user
        )
        
        # Crear detalles
        DetallePedidoProveedor.objects.create(
            pedido_proveedor=pedido,
            producto=self.producto,
            cantidad_solicitada=5,
            precio_unitario_compra=Decimal('80.00')
        )
        
        # Recalcular totales
        pedido.calcular_totales()
        
        # Verificar cálculos
        self.assertEqual(pedido.subtotal, Decimal('400.00'))  # 5 * 80
        self.assertEqual(pedido.total_pedido, Decimal('400.00'))  # subtotal - descuento + impuesto

    def test_estado_pedido_choices(self):
        """Prueba que los estados del pedido sean válidos"""
        estados_validos = [
            'SOLICITADO',
            'EN_TRANSITO', 
            'RECIBIDO_PARCIAL',
            'RECIBIDO_COMPLETO',
            'CANCELADO'
        ]
        
        for estado in estados_validos:
            pedido = PedidoProveedor.objects.create(
                proveedor=self.proveedor,
                bodega_recepcion=self.bodega,
                creado_por=self.user,
                estado=estado
            )
            self.assertEqual(pedido.estado, estado)

    def test_str_representation(self):
        """Prueba la representación en string del pedido"""
        pedido = PedidoProveedor.objects.create(
            proveedor=self.proveedor,
            bodega_recepcion=self.bodega,
            creado_por=self.user
        )
        
        expected_str = f"Pedido #{pedido.id} a {self.proveedor.razon_social} para Bodega {self.bodega.nombre} (Solicitado)"
        self.assertEqual(str(pedido), expected_str)


class DetallePedidoProveedorTestCase(TestCase):
    """Pruebas para el modelo DetallePedidoProveedor"""
    
    def setUp(self):
        """Configurar datos de prueba"""
        # Crear datos básicos (similar al setUp anterior)
        self.user = get_user_model().objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
        self.region = Region.objects.create(nombre='Región Test')
        self.comuna = Comuna.objects.create(
            nombre='Comuna Test',
            region=self.region
        )
        
        self.sucursal = Sucursal.objects.create(
            nombre='Sucursal Test',
            region=self.region,
            comuna=self.comuna,
            direccion='Dirección Test 123'
        )
        
        self.tipo_bodega = TipoBodega.objects.create(tipo='Principal')
        self.bodega = Bodega.objects.create(
            sucursal=self.sucursal,
            tipo_bodega=self.tipo_bodega,
            direccion='Bodega Test 456'
        )
        
        self.proveedor = Proveedor.objects.create(
            razon_social='Proveedor Test SPA',
            rut='12345678-9'
        )
        
        self.producto = Producto.objects.create(
            nombre='Producto Test',
            precio=Decimal('100.00'),
            sku='TEST001'
        )
        
        self.pedido = PedidoProveedor.objects.create(
            proveedor=self.proveedor,
            bodega_recepcion=self.bodega,
            creado_por=self.user
        )

    def test_crear_detalle_pedido(self):
        """Prueba la creación de un detalle de pedido"""
        detalle = DetallePedidoProveedor.objects.create(
            pedido_proveedor=self.pedido,
            producto=self.producto,
            cantidad_solicitada=10,
            precio_unitario_compra=Decimal('75.00')
        )
        
        self.assertEqual(detalle.cantidad_solicitada, 10)
        self.assertEqual(detalle.precio_unitario_compra, Decimal('75.00'))
        self.assertEqual(detalle.cantidad_recibida, 0)  # Valor por defecto

    def test_subtotal_linea(self):
        """Prueba el cálculo del subtotal de línea"""
        detalle = DetallePedidoProveedor.objects.create(
            pedido_proveedor=self.pedido,
            producto=self.producto,
            cantidad_solicitada=5,
            precio_unitario_compra=Decimal('80.00')
        )
        
        subtotal_esperado = Decimal('400.00')  # 5 * 80
        self.assertEqual(detalle.subtotal_linea(), subtotal_esperado)

    def test_str_representation(self):
        """Prueba la representación en string del detalle"""
        detalle = DetallePedidoProveedor.objects.create(
            pedido_proveedor=self.pedido,
            producto=self.producto,
            cantidad_solicitada=3,
            precio_unitario_compra=Decimal('90.00')
        )
        
        expected_str = "3 x Producto Test @ 90.00"
        self.assertEqual(str(detalle), expected_str)

    def test_unique_together_constraint(self):
        """Prueba que no se pueda repetir el mismo producto en un pedido"""
        # Crear primer detalle
        DetallePedidoProveedor.objects.create(
            pedido_proveedor=self.pedido,
            producto=self.producto,
            cantidad_solicitada=5,
            precio_unitario_compra=Decimal('80.00')
        )
        
        # Intentar crear segundo detalle con el mismo producto
        with self.assertRaises(Exception):  # Debería fallar por unique_together
            DetallePedidoProveedor.objects.create(
                pedido_proveedor=self.pedido,
                producto=self.producto,
                cantidad_solicitada=3,
                precio_unitario_compra=Decimal('85.00')
            ) 