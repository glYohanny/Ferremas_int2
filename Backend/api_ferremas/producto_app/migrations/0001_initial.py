# Generated by Django 5.2.2 on 2025-06-25 23:07

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Categoria',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100, unique=True, verbose_name='Nombre de Categoría')),
            ],
            options={
                'verbose_name': 'Categoría',
                'verbose_name_plural': 'Categorías',
                'ordering': ['nombre'],
            },
        ),
        migrations.CreateModel(
            name='Marca',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=100, unique=True, verbose_name='Nombre de Marca')),
            ],
            options={
                'verbose_name': 'Marca',
                'verbose_name_plural': 'Marcas',
                'ordering': ['nombre'],
            },
        ),
        migrations.CreateModel(
            name='Producto',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sku', models.CharField(help_text='Stock Keeping Unit, código único del producto.', max_length=100, unique=True, verbose_name='SKU')),
                ('nombre', models.CharField(max_length=200, verbose_name='Nombre del Producto')),
                ('precio', models.DecimalField(decimal_places=2, max_digits=10, verbose_name='Precio')),
                ('descripcion', models.TextField(blank=True, null=True, verbose_name='Descripción')),
                ('imagen', models.ImageField(blank=True, null=True, upload_to='productos_imagenes/', verbose_name='Imagen del Producto')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')),
                ('fecha_actualizacion', models.DateTimeField(auto_now=True, verbose_name='Fecha de Actualización')),
                ('categoria', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='productos_categoria', to='producto_app.categoria', verbose_name='Categoría')),
                ('marca', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='productos_marca', to='producto_app.marca', verbose_name='Marca')),
            ],
            options={
                'verbose_name': 'Producto',
                'verbose_name_plural': 'Productos',
                'ordering': ['nombre'],
            },
        ),
    ]
