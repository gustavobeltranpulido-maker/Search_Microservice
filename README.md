# search-service

Microservicio de búsqueda de usuarios (guía 11, OpenSearch en Aiven, patrón CQRS).

- **Escritura:** `users-management` sigue escribiendo en PostgreSQL (fuente de verdad) y publica eventos en Kafka.
- **Proyección:** este servicio consume `users.events` y actualiza el índice de OpenSearch.
- **Lectura:** las búsquedas van a este servicio, que consulta solo OpenSearch.
- **Consistencia eventual:** un usuario nuevo puede tardar unos segundos en aparecer en las búsquedas.

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio |
| GET | `/search/users?q=juan&status=ACTIVE&limit=20` | Búsqueda difusa por `name` (`q`), filtro exacto por `status`, `limit` 1–100 |

## Ejecutar en local

```bash
cp .env.example .env   # completar con las credenciales de Aiven
npm install
npm run dev            # desarrollo con recarga
npm run build && npm start
npm test
```

Las variables están documentadas en `.env.example`. Ningún secreto va en el código.

## Arquitectura

```
src/
├── domain/                 → tipos puros (UserDocument, UserEvent)
├── application/
│   ├── ports/              → UserIndexPort (salida)
│   └── use-cases/          → parseo de eventos, indexar/borrar, buscar
├── infrastructure/
│   ├── kafka/              → consumidor (kafkajs)
│   ├── opensearch/         → adaptador del puerto (@opensearch-project/opensearch)
│   └── http/               → rutas Express
├── config/env.ts           → validación de variables de entorno
└── main.ts                 → composición
```

El dominio y los casos de uso no conocen Kafka, OpenSearch ni Express.

## Decisiones

- **Índice:** `users`, 1 shard y 0 réplicas (plan free de un nodo). `_id` = id de negocio, así reprocesar un evento no duplica.
- **Campos indexados:** solo `id`, `name`, `email`, `role`, `status`. La contraseña o su hash nunca se indexan.
- **Grupo de Kafka propio** (`search-service`), para no quitar mensajes al Notification Service.
- **Formato de evento:** acepta el real de users-management (`eventName` / `payload`) y el alternativo (`type` / `data`).
- **Tópico:** `users.events` por defecto. Confirmar con el Notification Service (el documento original decía `user-events`).

## Pendiente

- Reindexado completo desde PostgreSQL (script de reconstrucción).
- Confirmar con el profesor si la guía 11 exige RabbitMQ en lugar de Kafka.

# Search_Microservice