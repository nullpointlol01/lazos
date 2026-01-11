## 4. MODELOS DE DATOS

### 4.1 Diagrama Entidad-Relación

```
┌──────────────────────────────────────────────────────────────┐
│                          POSTS                                │
├──────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                             │
│ post_number     INTEGER UNIQUE NOT NULL  -- autoincremental  │
│ image_url       VARCHAR(500) (backward compat)               │
│ thumbnail_url   VARCHAR(500) (backward compat)               │
│ sex             ENUM('male','female','unknown')              │
│ size            ENUM('small','medium','large') NOT NULL      │
│ animal_type     ENUM('dog','cat','other') DEFAULT 'dog'      │
│ description     TEXT (max 1000 chars)                        │
│ location        GEOGRAPHY(POINT, 4326) NOT NULL              │
│ location_name   VARCHAR(200)                                 │
│ sighting_date   DATE NOT NULL                                │
│ created_at      TIMESTAMP DEFAULT NOW()                      │
│ updated_at      TIMESTAMP                                    │
│ is_active       BOOLEAN DEFAULT TRUE                         │
│ pending_approval BOOLEAN DEFAULT FALSE  -- moderación IA     │
│ moderation_reason TEXT  -- motivo de moderación              │
│ contact_method  VARCHAR(200)                                 │
│ embedding       VECTOR(512)  -- CLIP embedding               │
│ user_id         UUID REFERENCES users(id) NULL               │
└──────────────────────────────────────────────────────────────┘
                    │
                    │ 1:N
                    ▼
┌──────────────────────────────────────────────────────────────┐
│                      POST_IMAGES                              │
├──────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                             │
│ post_id         UUID REFERENCES posts(id) NOT NULL           │
│ image_url       VARCHAR(500) NOT NULL                        │
│ thumbnail_url   VARCHAR(500) NOT NULL                        │
│ display_order   INTEGER NOT NULL                             │
│ is_primary      BOOLEAN DEFAULT FALSE                        │
│ created_at      TIMESTAMP DEFAULT NOW()                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                          ALERTS                               │
├──────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                             │
│ description     TEXT NOT NULL                                │
│ animal_type     ENUM('dog','cat','other') DEFAULT 'dog'      │
│ direction       VARCHAR(200)  -- hacia dónde iba             │
│ location        GEOGRAPHY(POINT, 4326) NOT NULL              │
│ location_name   VARCHAR(200)                                 │
│ created_at      TIMESTAMP DEFAULT NOW()                      │
│ is_active       BOOLEAN DEFAULT TRUE                         │
│ user_id         UUID REFERENCES users(id) NULL               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                         REPORTS                               │
├──────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                             │
│ post_id         UUID REFERENCES posts(id) NULL               │
│ alert_id        UUID REFERENCES alerts(id) NULL              │
│ reason          ENUM('inappropriate','spam',                 │
│                      'incorrect_location','other') NOT NULL  │
│ description     TEXT                                         │
│ reporter_ip     VARCHAR(45)                                  │
│ created_at      TIMESTAMP DEFAULT NOW()                      │
│ resolved        BOOLEAN DEFAULT FALSE                        │
│ CONSTRAINT: CHECK ((post_id IS NULL) != (alert_id IS NULL)) │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                          USERS (opcional, no usado)           │
├──────────────────────────────────────────────────────────────┤
│ id              UUID PRIMARY KEY                             │
│ email           VARCHAR(255) UNIQUE                          │
│ password_hash   VARCHAR(255)                                 │
│ created_at      TIMESTAMP DEFAULT NOW()                      │
│ is_active       BOOLEAN DEFAULT TRUE                         │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Índices PostgreSQL

```sql
-- Posts
CREATE INDEX idx_posts_location ON posts USING GIST (location);
CREATE INDEX idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX idx_posts_sighting_date ON posts (sighting_date DESC);
CREATE INDEX idx_posts_animal_type ON posts (animal_type);
CREATE INDEX idx_posts_size ON posts (size);
CREATE INDEX idx_posts_sex ON posts (sex);
CREATE INDEX idx_posts_active ON posts (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_posts_pending_approval ON posts (pending_approval) WHERE pending_approval = TRUE;
CREATE UNIQUE INDEX idx_posts_post_number ON posts (post_number);

-- Embeddings (HNSW para búsqueda rápida)
CREATE INDEX idx_posts_embedding ON posts
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Post Images
CREATE INDEX idx_post_images_post_id ON post_images (post_id);

-- Alerts
CREATE INDEX idx_alerts_location ON alerts USING GIST (location);
CREATE INDEX idx_alerts_created_at ON alerts (created_at DESC);

-- Reports
CREATE INDEX idx_reports_post_id ON reports (post_id);
CREATE INDEX idx_reports_alert_id ON reports (alert_id);
CREATE INDEX idx_reports_resolved ON reports (resolved) WHERE resolved = FALSE;
```

---

