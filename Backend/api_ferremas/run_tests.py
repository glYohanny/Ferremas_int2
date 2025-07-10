#!/usr/bin/env python
"""
Script para ejecutar pruebas del sistema Ferremas y generar evidencia
"""
import os
import sys
import subprocess
import datetime
import json
from pathlib import Path

def run_command(command, description):
    """Ejecuta un comando y retorna el resultado"""
    print(f"\n{'='*60}")
    print(f"EJECUTANDO: {description}")
    print(f"Comando: {command}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=300  # 5 minutos de timeout
        )
        
        print(f"Exit Code: {result.returncode}")
        print(f"STDOUT:\n{result.stdout}")
        if result.stderr:
            print(f"STDERR:\n{result.stderr}")
            
        return {
            'success': result.returncode == 0,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'returncode': result.returncode
        }
    except subprocess.TimeoutExpired:
        print("ERROR: Comando excedió el tiempo límite (5 minutos)")
        return {
            'success': False,
            'stdout': '',
            'stderr': 'Timeout expired',
            'returncode': -1
        }
    except Exception as e:
        print(f"ERROR: {str(e)}")
        return {
            'success': False,
            'stdout': '',
            'stderr': str(e),
            'returncode': -1
        }

def create_test_report(results):
    """Crea un reporte de pruebas en formato JSON"""
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    report_file = f"test_report_{timestamp}.json"
    
    report = {
        'timestamp': datetime.datetime.now().isoformat(),
        'system_info': {
            'python_version': sys.version,
            'platform': sys.platform,
            'working_directory': os.getcwd()
        },
        'test_results': results,
        'summary': {
            'total_tests': len(results),
            'passed': sum(1 for r in results.values() if r['success']),
            'failed': sum(1 for r in results.values() if not r['success'])
        }
    }
    
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\nReporte guardado en: {report_file}")
    return report_file

def main():
    """Función principal para ejecutar todas las pruebas"""
    print("🚀 INICIANDO PRUEBAS DEL SISTEMA FERREMAS")
    print(f"Fecha y hora: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Cambiar al directorio del proyecto
    project_dir = Path(__file__).parent
    os.chdir(project_dir)
    
    results = {}
    
    # 1. Verificar que Django esté configurado
    results['django_check'] = run_command(
        "python manage.py check",
        "Verificación de configuración de Django"
    )
    
    # 2. Ejecutar migraciones
    results['migrations'] = run_command(
        "python manage.py migrate",
        "Ejecutar migraciones de base de datos"
    )
    
    # 3. Crear superusuario para pruebas (si no existe)
    results['create_superuser'] = run_command(
        "echo 'from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser(\"admin\", \"admin@test.com\", \"admin123\") if not User.objects.filter(username=\"admin\").exists() else None' | python manage.py shell",
        "Crear superusuario para pruebas"
    )
    
    # 4. Ejecutar pruebas unitarias
    results['unit_tests'] = run_command(
        "python manage.py test --verbosity=2",
        "Pruebas unitarias de Django"
    )
    
    # 5. Ejecutar pruebas específicas de pedidos
    results['pedido_tests'] = run_command(
        "python manage.py test pedido_app.tests --verbosity=2",
        "Pruebas específicas de pedidos a proveedor"
    )
    
    # 6. Verificar cobertura de código (si está instalado)
    try:
        import coverage
        results['coverage'] = run_command(
            "coverage run --source='.' manage.py test && coverage report",
            "Análisis de cobertura de código"
        )
    except ImportError:
        print("\n⚠️  coverage no está instalado. Instalando...")
        results['install_coverage'] = run_command(
            "pip install coverage",
            "Instalar coverage"
        )
        if results['install_coverage']['success']:
            results['coverage'] = run_command(
                "coverage run --source='.' manage.py test && coverage report",
                "Análisis de cobertura de código"
            )
    
    # 7. Verificar sintaxis de archivos Python
    results['syntax_check'] = run_command(
        "python -m py_compile manage.py",
        "Verificación de sintaxis Python"
    )
    
    # 8. Verificar imports
    results['import_check'] = run_command(
        "python -c \"import pedido_app, proveedor_app, producto_app, sucursal_app, usuario_app\"",
        "Verificación de imports de aplicaciones"
    )
    
    # Generar reporte final
    report_file = create_test_report(results)
    
    # Mostrar resumen
    print(f"\n{'='*60}")
    print("📊 RESUMEN DE PRUEBAS")
    print(f"{'='*60}")
    
    total = len(results)
    passed = sum(1 for r in results.values() if r['success'])
    failed = total - passed
    
    print(f"Total de pruebas ejecutadas: {total}")
    print(f"✅ Exitosas: {passed}")
    print(f"❌ Fallidas: {failed}")
    print(f"📈 Tasa de éxito: {(passed/total)*100:.1f}%")
    
    if failed > 0:
        print(f"\n❌ PRUEBAS FALLIDAS:")
        for test_name, result in results.items():
            if not result['success']:
                print(f"  - {test_name}: {result.get('stderr', 'Error desconocido')}")
    
    print(f"\n📄 Reporte completo guardado en: {report_file}")
    
    # Retornar código de salida apropiado
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 