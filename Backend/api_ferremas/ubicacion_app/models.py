# models.py
from django.db import models

class Region(models.Model):
    nombre = models.CharField(max_length=100, unique=True, verbose_name="Nombre de la Región")
    
    class Meta:
        verbose_name = "Región"
        verbose_name_plural = "Regiones"
        ordering = ['nombre']

    def __str__(self):
        return self.nombre

class Comuna(models.Model):
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name="comunas", verbose_name="Región")
    nombre = models.CharField(max_length=100, verbose_name="Nombre de la Comuna")

    class Meta:
        verbose_name = "Comuna"
        verbose_name_plural = "Comunas"
        unique_together = ('region', 'nombre')
        ordering = ['region__nombre', 'nombre']

    def __str__(self):
        return f"{self.nombre}, {self.region.nombre}"

