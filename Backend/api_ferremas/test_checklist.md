# Checklist de Pruebas Manuales - Sistema Ferremas

## 📋 Información General
- **Fecha de Prueba:** _______________
- **Tester:** _______________
- **Versión del Software:** _______________
- **Navegador:** _______________

---

## 🔐 Autenticación y Autorización

### Login/Logout
- [ ] **Login exitoso con credenciales válidas**
  - Usuario: _______________
  - Contraseña: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Login fallido con credenciales inválidas**
  - Usuario: _______________
  - Contraseña: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Logout exitoso**
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

### Permisos por Rol
- [ ] **Administrador puede acceder a todas las funciones**
  - Funciones probadas: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ

- [ ] **Vendedor solo ve funciones permitidas**
  - Funciones probadas: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ

- [ ] **Bodeguero solo ve funciones permitidas**
  - Funciones probadas: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ

---

## 🛒 Gestión de Pedidos a Proveedor

### Crear Pedido a Proveedor
- [ ] **Selección de proveedor**
  - Proveedor seleccionado: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Selección de sucursal**
  - Sucursal seleccionada: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Carga de bodegas por sucursal**
  - Bodegas cargadas: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Selección de bodega**
  - Bodega seleccionada: _______________
  - Formato mostrado: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Agregar productos al pedido**
  - Productos agregados: _______________
  - Cantidades: _______________
  - Precios: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Cálculo de totales**
  - Subtotal calculado: _______________
  - Total final: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Guardar pedido**
  - ID del pedido creado: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

### Validaciones
- [ ] **Validación de campos obligatorios**
  - Campos probados: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Validación de cantidades**
  - Cantidades probadas: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Validación de precios**
  - Precios probados: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

---

## 🛍️ Gestión de Pedidos de Cliente

### Crear Pedido de Cliente
- [ ] **Selección de productos**
  - Productos seleccionados: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Aplicación de promociones**
  - Promociones aplicadas: _______________
  - Descuentos calculados: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Cálculo de precios con descuentos**
  - Precio original: _______________
  - Precio con descuento: _______________
  - Descuento aplicado: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Proceso de pago**
  - Método de pago: _______________
  - Estado del pago: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

### Visualización de Pedidos
- [ ] **Lista de pedidos**
  - Pedidos mostrados: _______________
  - Información mostrada: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Detalle de pedido**
  - Información mostrada: _______________
  - Precios mostrados: _______________
  - Descuentos mostrados: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

---

## 📱 Interfaz de Usuario

### Responsive Design
- [ ] **Desktop (1920x1080)**
  - Elementos visibles: _______________
  - Navegación: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Tablet (768x1024)**
  - Elementos visibles: _______________
  - Navegación: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Mobile (375x667)**
  - Elementos visibles: _______________
  - Navegación: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

### Navegación
- [ ] **Todas las rutas funcionan**
  - Rutas probadas: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Menús desplegables**
  - Menús probados: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

---

## 🔍 Casos Edge y Errores

### Manejo de Errores
- [ ] **Error de conexión**
  - Escenario: _______________
  - Mensaje mostrado: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Datos inválidos**
  - Datos probados: _______________
  - Mensaje mostrado: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Sin stock disponible**
  - Producto sin stock: _______________
  - Comportamiento: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

### Casos Especiales
- [ ] **Promociones expiradas**
  - Promoción probada: _______________
  - Comportamiento: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Pagos fallidos**
  - Método de pago: _______________
  - Comportamiento: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

---

## 📊 Rendimiento

### Tiempos de Respuesta
- [ ] **Carga de página principal**
  - Tiempo: _______________ segundos
  - Resultado: ✅ PASÓ / ❌ FALLÓ

- [ ] **Carga de lista de productos**
  - Tiempo: _______________ segundos
  - Resultado: ✅ PASÓ / ❌ FALLÓ

- [ ] **Búsqueda de productos**
  - Tiempo: _______________ segundos
  - Resultado: ✅ PASÓ / ❌ FALLÓ

- [ ] **Creación de pedido**
  - Tiempo: _______________ segundos
  - Resultado: ✅ PASÓ / ❌ FALLÓ

---

## 🧪 Pruebas de Navegador

### Compatibilidad
- [ ] **Chrome (última versión)**
  - Funcionalidades probadas: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Firefox (última versión)**
  - Funcionalidades probadas: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Safari (última versión)**
  - Funcionalidades probadas: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

- [ ] **Edge (última versión)**
  - Funcionalidades probadas: _______________
  - Resultado: ✅ PASÓ / ❌ FALLÓ
  - Evidencia: [Captura de pantalla/video]

---

## 📝 Observaciones Generales

### Problemas Encontrados
1. _______________
2. _______________
3. _______________

### Mejoras Sugeridas
1. _______________
2. _______________
3. _______________

### Comentarios Adicionales
_______________

---

## ✅ Resumen Final

- **Total de pruebas ejecutadas:** _______________
- **Pruebas exitosas:** _______________
- **Pruebas fallidas:** _______________
- **Tasa de éxito:** _______________%

**Estado General:** ✅ APROBADO / ❌ RECHAZADO / ⚠️ CONDICIONAL

**Firma del Tester:** _______________
**Fecha:** _______________ 