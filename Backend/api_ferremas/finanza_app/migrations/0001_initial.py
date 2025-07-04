# Generated by Django 5.2.2 on 2025-06-25 23:07

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='CuentaBancaria',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('banco', models.CharField(max_length=100, verbose_name='Nombre del Banco')),
                ('tipo_cuenta', models.CharField(choices=[('CORRIENTE', 'Cuenta Corriente'), ('VISTA', 'Cuenta Vista'), ('AHORRO', 'Cuenta de Ahorro'), ('OTRA', 'Otra')], max_length=20, verbose_name='Tipo de Cuenta')),
                ('numero_cuenta', models.CharField(max_length=50, unique=True, verbose_name='Número de Cuenta')),
                ('moneda', models.CharField(choices=[('CLP', 'Peso Chileno (CLP)'), ('USD', 'Dólar Americano (USD)'), ('EUR', 'Euro (EUR)')], default='CLP', max_length=3, verbose_name='Moneda')),
                ('titular', models.CharField(max_length=150, verbose_name='Titular de la Cuenta')),
                ('saldo_actual', models.DecimalField(decimal_places=2, default=0.0, max_digits=15, verbose_name='Saldo Actual')),
                ('activa', models.BooleanField(default=True, verbose_name='¿Está activa?')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Cuenta Bancaria',
                'verbose_name_plural': 'Cuentas Bancarias',
                'ordering': ['banco', 'numero_cuenta'],
            },
        ),
        migrations.CreateModel(
            name='CuentaPorCobrar',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('monto_total', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(0.01)], verbose_name='Monto Total a Cobrar')),
                ('monto_pagado', models.DecimalField(decimal_places=2, default=0.0, max_digits=12, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Monto Pagado')),
                ('fecha_emision', models.DateField(verbose_name='Fecha de Emisión')),
                ('fecha_vencimiento', models.DateField(verbose_name='Fecha de Vencimiento')),
                ('estado', models.CharField(choices=[('PENDIENTE', 'Pendiente'), ('PARCIAL', 'Parcialmente Pagada'), ('PAGADA', 'Pagada'), ('VENCIDA', 'Vencida'), ('ANULADA', 'Anulada')], default='PENDIENTE', max_length=20, verbose_name='Estado')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Cuenta por Cobrar',
                'verbose_name_plural': 'Cuentas por Cobrar',
                'ordering': ['-fecha_vencimiento', 'cliente'],
            },
        ),
        migrations.CreateModel(
            name='CuentaPorPagar',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('monto_total', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(0.01)], verbose_name='Monto Total a Pagar')),
                ('monto_pagado', models.DecimalField(decimal_places=2, default=0.0, max_digits=12, validators=[django.core.validators.MinValueValidator(0)], verbose_name='Monto Pagado')),
                ('fecha_emision', models.DateField(verbose_name='Fecha de Emisión')),
                ('fecha_vencimiento', models.DateField(verbose_name='Fecha de Vencimiento')),
                ('estado', models.CharField(choices=[('PENDIENTE', 'Pendiente'), ('PARCIAL', 'Parcialmente Pagada'), ('PAGADA', 'Pagada'), ('VENCIDA', 'Vencida'), ('ANULADA', 'Anulada')], default='PENDIENTE', max_length=20, verbose_name='Estado')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Cuenta por Pagar',
                'verbose_name_plural': 'Cuentas por Pagar',
                'ordering': ['-fecha_vencimiento', 'proveedor'],
            },
        ),
        migrations.CreateModel(
            name='DocumentoFinanciero',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo_documento', models.CharField(choices=[('FACT_VENTA', 'Factura de Venta'), ('BOL_VENTA', 'Boleta de Venta'), ('NC_VENTA', 'Nota de Crédito (Venta)'), ('ND_VENTA', 'Nota de Débito (Venta)'), ('FACT_COMPRA', 'Factura de Compra'), ('NC_COMPRA', 'Nota de Crédito (Compra)'), ('OTRO', 'Otro Documento')], max_length=20, verbose_name='Tipo de Documento')),
                ('object_id', models.PositiveIntegerField()),
                ('numero_documento', models.CharField(max_length=50, unique=True, verbose_name='Número de Documento')),
                ('monto_neto', models.DecimalField(decimal_places=2, default=0.0, max_digits=12, verbose_name='Monto Neto')),
                ('monto_impuesto', models.DecimalField(decimal_places=2, default=0.0, max_digits=12, verbose_name='Monto Impuesto (IVA)')),
                ('monto_total', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='Monto Total')),
                ('fecha_emision', models.DateField(verbose_name='Fecha de Emisión')),
                ('fecha_vencimiento', models.DateField(blank=True, null=True, verbose_name='Fecha de Vencimiento')),
                ('estado', models.CharField(choices=[('EMITIDO', 'Emitido'), ('PAGADO', 'Pagado'), ('ANULADO', 'Anulado'), ('VENCIDO', 'Vencido')], default='EMITIDO', max_length=10, verbose_name='Estado del Documento')),
                ('url_pdf', models.URLField(blank=True, null=True, verbose_name='URL del PDF del Documento')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Documento Financiero',
                'verbose_name_plural': 'Documentos Financieros',
                'ordering': ['-fecha_emision', 'numero_documento'],
            },
        ),
        migrations.CreateModel(
            name='MovimientoCaja',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha', models.DateTimeField(verbose_name='Fecha y Hora del Movimiento')),
                ('tipo', models.CharField(choices=[('INGRESO', 'Ingreso'), ('EGRESO', 'Egreso')], max_length=10, verbose_name='Tipo de Movimiento')),
                ('concepto', models.CharField(max_length=255, verbose_name='Concepto')),
                ('monto', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(0.01)], verbose_name='Monto')),
                ('origen_destino', models.CharField(choices=[('CAJA_CHICA', 'Caja Chica'), ('BANCO', 'Cuenta Bancaria'), ('VENTA', 'Venta Directa'), ('PAGO_PROVEEDOR', 'Pago a Proveedor'), ('OTRO', 'Otro')], max_length=20, verbose_name='Origen/Destino de Fondos')),
                ('referencia', models.CharField(blank=True, max_length=100, null=True, verbose_name='Referencia (N° Boleta, Factura, etc.)')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Movimiento de Caja/Tesorería',
                'verbose_name_plural': 'Movimientos de Caja/Tesorería',
                'ordering': ['-fecha'],
            },
        ),
        migrations.CreateModel(
            name='PagoRealizado',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_pago', models.DateTimeField(verbose_name='Fecha del Pago')),
                ('monto', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(0.01)], verbose_name='Monto del Pago')),
                ('metodo_pago', models.CharField(choices=[('EFECTIVO', 'Efectivo'), ('TRANSFERENCIA', 'Transferencia Bancaria'), ('TARJETA_DEBITO', 'Tarjeta de Débito'), ('TARJETA_CREDITO', 'Tarjeta de Crédito'), ('CHEQUE', 'Cheque'), ('WEBPAY', 'Webpay'), ('OTRO', 'Otro')], max_length=20, verbose_name='Método de Pago')),
                ('referencia_pago', models.CharField(blank=True, max_length=100, null=True, verbose_name='Referencia del Pago')),
                ('observaciones', models.TextField(blank=True, null=True, verbose_name='Observaciones')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Pago Realizado',
                'verbose_name_plural': 'Pagos Realizados',
                'ordering': ['-fecha_pago'],
            },
        ),
        migrations.CreateModel(
            name='PagoRecibido',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_pago', models.DateTimeField(verbose_name='Fecha del Pago')),
                ('monto', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(0.01)], verbose_name='Monto del Pago')),
                ('metodo_pago', models.CharField(choices=[('EFECTIVO', 'Efectivo'), ('TRANSFERENCIA', 'Transferencia Bancaria'), ('TARJETA_DEBITO', 'Tarjeta de Débito'), ('TARJETA_CREDITO', 'Tarjeta de Crédito'), ('CHEQUE', 'Cheque'), ('WEBPAY', 'Webpay'), ('OTRO', 'Otro')], max_length=20, verbose_name='Método de Pago')),
                ('referencia_pago', models.CharField(blank=True, max_length=100, null=True, verbose_name='Referencia del Pago')),
                ('observaciones', models.TextField(blank=True, null=True, verbose_name='Observaciones')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('estado_confirmacion', models.CharField(choices=[('PENDIENTE', 'Pendiente de Confirmación'), ('CONFIRMADO', 'Confirmado'), ('RECHAZADO', 'Rechazado')], default='CONFIRMADO', max_length=20, verbose_name='Estado de Confirmación')),
                ('comprobante_adjunto', models.FileField(blank=True, null=True, upload_to='comprobantes_pago/', verbose_name='Comprobante Adjunto')),
            ],
            options={
                'verbose_name': 'Pago Recibido',
                'verbose_name_plural': 'Pagos Recibidos',
                'ordering': ['-fecha_pago'],
            },
        ),
    ]
