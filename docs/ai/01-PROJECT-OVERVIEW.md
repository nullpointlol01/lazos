# LAZOS - Guía Completa para Agentes IA

**Versión**: 2.0
**Fecha actualización**: 2025-12-29
**Propósito**: Documentación completa y centralizada para agentes IA que desarrollan o mantienen el proyecto LAZOS

---

## ÍNDICE

1. [Origen y Visión del Proyecto](#1-origen-y-visión-del-proyecto)
2. [Arquitectura Técnica](#2-arquitectura-técnica)
3. [Estado Actual del Proyecto](#3-estado-actual-del-proyecto)
4. [Modelos de Datos](#4-modelos-de-datos)
5. [API Backend](#5-api-backend)
6. [Frontend](#6-frontend)
7. [Flujos Principales](#7-flujos-principales)
8. [Configuración y Deployment](#8-configuración-y-deployment)
9. [Decisiones de Arquitectura](#9-decisiones-de-arquitectura)
10. [Próximos Pasos](#10-próximos-pasos)

---

## 1. ORIGEN Y VISIÓN DEL PROYECTO

### 1.1 Descripción

**LAZOS** es una plataforma colaborativa para reportar avistamientos de mascotas en la vía pública. El objetivo es ayudar a dueños a encontrar sus mascotas perdidas mediante reportes ciudadanos con foto y ubicación.

### 1.2 Propuesta de Valor

| Característica | LAZOS | Competencia |
|----------------|-------|-------------|
| Registro obligatorio | NO (posts anónimos permitidos) | SÍ |
| Consulta sin cuenta | SÍ (API pública) | NO |
| Venta de datos | NUNCA | Sí (ubicación) |
| Enfoque principal | Avistamientos ciudadanos | Dueños buscando |
| Matching con IA | SÍ (CLIP embeddings) | No o básico |
| Avisos rápidos | SÍ (sin fotos, ubicación temporal) | NO |

### 1.3 Usuarios Objetivo

1. **Reportador**: Persona que ve un animal en la calle y quiere ayudar
2. **Buscador**: Dueño que perdió su mascota y busca avistamientos
3. **Moderador**: Admin que revisa reportes de contenido inapropiado

---

