CREATE DATABASE IF NOT EXISTS printflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE printflow;

CREATE TABLE IF NOT EXISTS printers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  model VARCHAR(100),
  ip_address VARCHAR(45),
  interface_type ENUM('octoprint','moonraker','bambu','duet','repetier','other') DEFAULT 'other',
  interface_url VARCHAR(255),
  api_key VARCHAR(255),
  volume_x INT DEFAULT 0,
  volume_y INT DEFAULT 0,
  volume_z INT DEFAULT 0,
  nozzle_size DECIMAL(3,2) DEFAULT 0.40,
  nozzle_count INT DEFAULT 1,
  temp_nozzle_max INT DEFAULT 260,
  temp_bed_max INT DEFAULT 110,
  location VARCHAR(100),
  notes TEXT,
  status ENUM('idle','printing','paused','error','offline','maintenance') DEFAULT 'idle',
  total_prints INT DEFAULT 0,
  total_success INT DEFAULT 0,
  total_hours DECIMAL(10,2) DEFAULT 0,
  total_grams DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS filaments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  brand VARCHAR(100),
  material ENUM('PLA','PETG','ABS','ASA','TPU','Nylon','PC','HIPS','PVA','autre') DEFAULT 'PLA',
  color_name VARCHAR(50),
  color_hex VARCHAR(7) DEFAULT '#cccccc',
  diameter DECIMAL(4,2) DEFAULT 1.75,
  temp_nozzle_min INT DEFAULT 190,
  temp_nozzle_max INT DEFAULT 230,
  temp_bed_min INT DEFAULT 0,
  temp_bed_max INT DEFAULT 60,
  weight_total DECIMAL(8,2) DEFAULT 1000,
  weight_remaining DECIMAL(8,2) DEFAULT 1000,
  price DECIMAL(8,2),
  spoolman_id INT DEFAULT NULL,
  location VARCHAR(100),
  notes TEXT,
  archived TINYINT(1) DEFAULT 0,
  nfc_uid     VARCHAR(32)  DEFAULT NULL COMMENT 'UID puce NFC liée à cette bobine',
  spool_number   VARCHAR(50)  DEFAULT NULL COMMENT 'Numéro ou référence de la bobine',
  elegoo_subtype VARCHAR(20)  DEFAULT NULL COMMENT 'Sous-type ELEGOO pour encodage NFC',
  supplier       VARCHAR(100) DEFAULT NULL COMMENT 'Fournisseur / boutique d\'achat',
  purchase_date  DATE         DEFAULT NULL COMMENT 'Date d\'achat',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Compteur mensuel pour la codification P-AAMM-NNN
CREATE TABLE IF NOT EXISTS project_counters (
  ym CHAR(4) PRIMARY KEY COMMENT 'ex: 2604',
  last_counter INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS projects (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  code         VARCHAR(20)  NOT NULL UNIQUE COMMENT 'ex: P-2604-001',
  name         VARCHAR(150) NOT NULL,
  description  TEXT,
  status       ENUM('draft','in_progress','done','cancelled') DEFAULT 'draft',
  status_forced TINYINT(1)  DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Pièces d'un projet : un élément = une pièce nommée
-- Une pièce peut avoir 1 ou N impressions (ex: 2 couleurs = 2 impressions)
CREATE TABLE IF NOT EXISTS project_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  project_id  INT NOT NULL,
  name        VARCHAR(150) NOT NULL COMMENT 'Nom de la pièce ex: Couvercle rouge',
  description TEXT,
  quantity    INT DEFAULT 1,
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prints (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  project_id        INT DEFAULT NULL,
  item_id           INT DEFAULT NULL COMMENT 'Pièce du projet à laquelle cette impression appartient',
  project_item_name VARCHAR(150) DEFAULT NULL COMMENT 'Nom libre de la pièce (sans pièce formelle)',
  printer_id INT,
  filament_id INT,
  file_name VARCHAR(255),
  status ENUM('queued','printing','paused','done','failed','cancelled') DEFAULT 'queued',
  progress INT DEFAULT 0,
  estimated_duration INT COMMENT 'minutes',
  actual_duration INT COMMENT 'minutes',
  filament_used DECIMAL(8,2) COMMENT 'grams',
  layer_height DECIMAL(4,3),
  infill_percent INT,
  print_temp INT,
  bed_temp INT,
  notes TEXT,
  real_cost DECIMAL(8,4) DEFAULT NULL COMMENT 'Coût réel calculé (matière + électricité)',
  real_filament_cost DECIMAL(8,4) DEFAULT NULL COMMENT 'Coût matière réel',
  real_electricity_cost DECIMAL(8,4) DEFAULT NULL COMMENT 'Coût électricité réel',
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (printer_id)  REFERENCES printers(id)  ON DELETE SET NULL,
  FOREIGN KEY (filament_id) REFERENCES filaments(id) ON DELETE SET NULL,
  FOREIGN KEY (project_id)  REFERENCES projects(id)  ON DELETE SET NULL,
  FOREIGN KEY (item_id)     REFERENCES project_items(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS maintenance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  printer_id INT,
  type ENUM('nettoyage','calibration','remplacement_buse','remplacement_plateau','graissage','autre') DEFAULT 'autre',
  description TEXT,
  performed_at DATE NOT NULL,
  next_due DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key_name VARCHAR(50) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO settings (key_name, value) VALUES
  ('spoolman_url', 'http://localhost:7912'),
  ('spoolman_enabled', 'false'),
  ('app_name', 'PrintFlow'),
  ('library_path', '/opt/printflow/library'),
  ('theme', 'blue'),
  ('backup_enabled', 'false'),
  ('backup_path', '/opt/printflow/backups'),
  ('backup_schedule', '0 3 * * *'),
  ('backup_keep', '7'),
  ('backup_library_enabled', 'true'),
  ('backup_destination', 'local'),
  ('backup_nas_ip', ''),
  ('backup_nas_share', ''),
  ('backup_nas_user', ''),
  ('backup_nas_password', ''),
  ('backup_nas_folder', '/printflow'),
  ('backup_report_email', 'true'),
  ('backup_last_run', ''),
  ('backup_last_status', ''),
  ('show_prices', 'true'),
  ('show_locations', 'true');

INSERT IGNORE INTO printers (name, model, ip_address, interface_type, interface_url, volume_x, volume_y, volume_z, nozzle_size, temp_nozzle_max, temp_bed_max, location, status, total_prints, total_success, total_hours, total_grams)
VALUES
  ('Ender 3', 'Creality Ender 3', '192.168.1.101', 'octoprint', 'http://192.168.1.101', 220, 220, 250, 0.40, 260, 110, 'Atelier', 'idle', 18, 16, 142, 1240),
  ('Prusa MK4', 'Prusa MK4', '192.168.1.102', 'moonraker', 'http://192.168.1.102', 250, 210, 220, 0.40, 300, 100, 'Atelier', 'printing', 22, 21, 198, 1870),
  ('Bambu X1C', 'Bambu Lab X1C', '192.168.1.103', 'bambu', 'http://192.168.1.103', 256, 256, 256, 0.40, 320, 120, 'Bureau', 'idle', 31, 30, 210, 2430);

INSERT IGNORE INTO filaments (name, brand, material, color_name, color_hex, weight_total, weight_remaining, price)
VALUES
  ('PLA Blanc', 'eSUN', 'PLA', 'Blanc', '#f5f5f0', 1000, 720, 22.90),
  ('PLA Rouge', 'Polymaker', 'PLA', 'Rouge', '#e24b4a', 1000, 580, 24.90),
  ('PLA Gris clair', 'eSUN', 'PLA', 'Gris clair', '#cccccc', 1000, 87, 22.90),
  ('PETG Noir', 'Bambu Lab', 'PETG', 'Noir', '#2c2c2a', 1000, 440, 28.90),
  ('PETG Bleu marine', 'Polymaker', 'PETG', 'Bleu marine', '#2563eb', 1000, 120, 26.90),
  ('TPU Vert', 'Filaflex', 'TPU', 'Vert', '#1d9e75', 500, 310, 34.90),
  ('ASA Gris anthracite', 'Prusament', 'ASA', 'Gris anthracite', '#888780', 1000, 850, 32.90),
  ('PLA Orange', 'eSUN', 'PLA', 'Orange', '#ef9f27', 1000, 930, 22.90);

-- ── Colonnes filament : option + poids bobine vide ────────
ALTER TABLE filaments
  ADD COLUMN IF NOT EXISTS finish_option VARCHAR(50) DEFAULT NULL
    COMMENT 'Finition : brillant, mat, soie, marbre, bois, carbone…',
  ADD COLUMN IF NOT EXISTS special_option VARCHAR(50) DEFAULT NULL
    COMMENT 'Propriété : renforcé, flexible, conducteur…',
  ADD COLUMN IF NOT EXISTS spool_weight DECIMAL(7,2) DEFAULT NULL
    COMMENT 'Poids de la bobine vide en grammes';

-- ── Historique des projets ────────────────────────────────
CREATE TABLE IF NOT EXISTS project_history (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  project_id   INT NOT NULL,
  action       VARCHAR(80)  NOT NULL COMMENT 'ex: status_changed, item_added…',
  label        VARCHAR(200) NOT NULL COMMENT 'Texte lisible affiché',
  detail_before TEXT DEFAULT NULL,
  detail_after  TEXT DEFAULT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ── Historique des pesées ─────────────────────────────────
CREATE TABLE IF NOT EXISTS filament_weighings (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  filament_id     INT NOT NULL,
  gross_weight    DECIMAL(8,2) NOT NULL COMMENT 'Poids brut lu sur balance (g)',
  spool_weight    DECIMAL(8,2) DEFAULT NULL COMMENT 'Poids bobine vide utilisé (g)',
  net_weight      DECIMAL(8,2) NOT NULL COMMENT 'Poids filament calculé (g)',
  previous_weight DECIMAL(8,2) NOT NULL COMMENT 'Ancien poids restant avant pesée',
  notes           VARCHAR(200) DEFAULT NULL,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (filament_id) REFERENCES filaments(id) ON DELETE CASCADE
);

-- ── Bibliothèque de fichiers d'impression ─────────────────
CREATE TABLE IF NOT EXISTS library_themes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  parent_id  INT DEFAULT NULL COMMENT 'NULL = thème racine, sinon sous-thème',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES library_themes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS library_files (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(200) NOT NULL COMMENT 'Nom affiché',
  original_name VARCHAR(200) NOT NULL COMMENT 'Nom original du fichier uploadé',
  file_path     VARCHAR(500) NOT NULL COMMENT 'Chemin relatif sur disque',
  file_size     BIGINT       NOT NULL COMMENT 'Taille en octets',
  file_type     ENUM('stl','3mf','obj','gcode','other') DEFAULT 'stl',
  theme_id      INT DEFAULT NULL,
  description   TEXT,
  tags          VARCHAR(500) DEFAULT NULL COMMENT 'Tags séparés par virgule',
  source_url    VARCHAR(500) DEFAULT NULL COMMENT 'Lien Thingiverse/Printables/etc.',
  print_settings JSON DEFAULT NULL COMMENT 'Paramètres suggérés',
  download_count INT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (theme_id) REFERENCES library_themes(id) ON DELETE SET NULL
);

-- Lien entre fichier bibliothèque et impressions
ALTER TABLE prints
  ADD COLUMN IF NOT EXISTS library_file_id INT DEFAULT NULL;

-- Ajouter la FK seulement si elle n'existe pas déjà
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'prints'
    AND CONSTRAINT_NAME = 'fk_prints_library'
);
SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE prints ADD CONSTRAINT fk_prints_library FOREIGN KEY (library_file_id) REFERENCES library_files(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Objets de la bibliothèque (regroupe plusieurs fichiers)
CREATE TABLE IF NOT EXISTS library_objects (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  theme_id      INT DEFAULT NULL,
  description   TEXT,
  tags          VARCHAR(500) DEFAULT NULL,
  source_url    VARCHAR(500) DEFAULT NULL,
  preview_file_id INT DEFAULT NULL COMMENT 'Fichier STL utilisé comme aperçu',
  photo_path       VARCHAR(500) DEFAULT NULL COMMENT 'Photo de l objet sur disque',
  attachment_path  VARCHAR(500) DEFAULT NULL COMMENT 'Document joint (PDF, image...)',
  attachment_name  VARCHAR(200) DEFAULT NULL COMMENT 'Nom original du document joint',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (theme_id) REFERENCES library_themes(id) ON DELETE SET NULL
);

-- Ajouter object_id dans library_files (un fichier peut appartenir à un objet)
ALTER TABLE library_files
  ADD COLUMN IF NOT EXISTS object_id  INT DEFAULT NULL
    COMMENT 'Objet auquel appartient ce fichier (NULL = fichier standalone)',
  ADD COLUMN IF NOT EXISTS part_name  VARCHAR(100) DEFAULT NULL
    COMMENT 'Nom de la partie ex: Tête, Corps, Bras gauche';

-- Clé étrangère preview_file_id (conditionnelle car IF NOT EXISTS non supporté sur FK)
SET @fk_preview = (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'library_objects'
    AND CONSTRAINT_NAME = 'fk_objects_preview'
);
SET @sql_preview = IF(@fk_preview = 0,
  'ALTER TABLE library_objects ADD CONSTRAINT fk_objects_preview FOREIGN KEY (preview_file_id) REFERENCES library_files(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt_preview FROM @sql_preview;
EXECUTE stmt_preview;
DEALLOCATE PREPARE stmt_preview;

-- Thèmes par défaut
INSERT IGNORE INTO library_themes (id, name, parent_id, sort_order) VALUES
  (1, 'Mécanique', NULL, 1),
  (2, 'Électronique', NULL, 2),
  (3, 'Maison', NULL, 3),
  (4, 'Déco & Art', NULL, 4),
  (5, 'Outillage', NULL, 5),
  (6, 'Robotique', NULL, 6),
  (7, 'Pièces de rechange', NULL, 7),
  (8, 'Prototypes', NULL, 8);

-- ── v1.5.0 ────────────────────────────────────────────────

-- Seuil d'alerte stock filament
ALTER TABLE filaments ADD COLUMN IF NOT EXISTS
  stock_alert_threshold INT DEFAULT 20
  COMMENT 'Pourcentage restant déclenchant l alerte (0=désactivé)';

-- Historique écritures NFC
CREATE TABLE IF NOT EXISTS nfc_write_history (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  filament_id  INT NOT NULL,
  uid          VARCHAR(32),
  format       ENUM('printflow','elegoo') DEFAULT 'elegoo',
  material     VARCHAR(20),
  subtype      VARCHAR(20),
  color_hex    VARCHAR(7),
  written_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (filament_id) REFERENCES filaments(id) ON DELETE CASCADE
);

-- Tags bibliothèque
CREATE TABLE IF NOT EXISTS library_tags (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS library_object_tags (
  object_id INT NOT NULL,
  tag_id    INT NOT NULL,
  PRIMARY KEY (object_id, tag_id),
  FOREIGN KEY (object_id) REFERENCES library_objects(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)    REFERENCES library_tags(id)    ON DELETE CASCADE
);

-- Lien objet bibliothèque ↔ impression
ALTER TABLE prints ADD COLUMN IF NOT EXISTS
  library_object_id INT DEFAULT NULL
  COMMENT 'Objet bibliothèque lié à cette impression';

-- Nouveaux settings
INSERT IGNORE INTO settings (key_name, value) VALUES
  ('stock_alert_enabled', 'true'),
  ('stock_alert_threshold', '20'),
  ('auth_enabled', 'false'),
  ('auth_password', '');

-- ── v1.6.0 ────────────────────────────────────────────────

-- Lien filaments recommandés ↔ objet bibliothèque
CREATE TABLE IF NOT EXISTS library_object_filaments (
  object_id   INT NOT NULL,
  filament_id INT NOT NULL,
  notes       VARCHAR(200),
  PRIMARY KEY (object_id, filament_id),
  FOREIGN KEY (object_id)   REFERENCES library_objects(id) ON DELETE CASCADE,
  FOREIGN KEY (filament_id) REFERENCES filaments(id)       ON DELETE CASCADE
);

-- Index pour les stats de consommation
CREATE INDEX IF NOT EXISTS idx_prints_date ON prints(created_at);

-- v1.6.0 patch : matières recommandées (remplace filament_id)
ALTER TABLE library_object_filaments
  ADD COLUMN IF NOT EXISTS material VARCHAR(50) DEFAULT NULL,
  DROP FOREIGN KEY IF EXISTS library_object_filaments_ibfk_2;

-- Matières recommandées sur les fichiers (JSON array ou CSV)
ALTER TABLE library_files
  ADD COLUMN IF NOT EXISTS recommended_materials VARCHAR(500) DEFAULT NULL;

-- ── v1.7.0 ────────────────────────────────────────────────

-- Audit log / historique des modifications
CREATE TABLE IF NOT EXISTS audit_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  entity     VARCHAR(50) NOT NULL,
  entity_id  INT,
  action     VARCHAR(30) NOT NULL,
  detail     VARCHAR(500),
  diff       TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entity (entity, entity_id),
  INDEX idx_date   (created_at)
);

-- Abonnements push

-- Clés VAPID pour les notifications push
INSERT IGNORE INTO settings (key_name, value) VALUES
  ('vapid_public',  ''),
  ('vapid_private', ''),
  ('push_enabled',  'false');

-- Alertes maintenance
INSERT IGNORE INTO settings (key_name, value) VALUES
  ('maintenance_alert_enabled', 'true'),
  ('maintenance_alert_days',    '30');

-- ── v1.9.0 — Photo impression, coût électricité ───────────────────────────

-- Photo impression
ALTER TABLE prints ADD COLUMN IF NOT EXISTS photo_path VARCHAR(500) DEFAULT NULL COMMENT 'Photo du résultat d impression';

-- Coût électricité imprimante (W)
ALTER TABLE printers ADD COLUMN IF NOT EXISTS power_consumption INT DEFAULT NULL COMMENT 'Consommation électrique en Watts';

-- Prix kWh global (dans settings)
INSERT IGNORE INTO settings (key_name, value) VALUES ('electricity_price_kwh', '0.20');
INSERT IGNORE INTO settings (key_name, value) VALUES ('prints_photo_path', '/opt/printflow/prints');

-- ── v1.10.0 — Consommables imprimantes ────────────────────────────────────

CREATE TABLE IF NOT EXISTS consumables (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  printer_id      INT NOT NULL,
  name            VARCHAR(100) NOT NULL COMMENT 'ex: Huile rails X/Y',
  interval_hours  INT NOT NULL DEFAULT 200 COMMENT 'Intervalle de remplacement en heures',
  reset_at        TIMESTAMP NULL DEFAULT NULL COMMENT 'Date de la dernière réinitialisation',
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE
);

-- Consommables prédéfinis par défaut (référence)
CREATE TABLE IF NOT EXISTS consumable_templates (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  default_hours  INT NOT NULL,
  description    VARCHAR(255)
);

INSERT IGNORE INTO consumable_templates (id, name, default_hours, description) VALUES
  (1, 'Huile rails X/Y',       200, 'Lubrification des rails de guidage'),
  (2, 'Lubrifiant vis mère Z', 300, 'Graissage de la vis trapézoïdale Z'),
  (3, 'Filtre HEPA',           500, 'Remplacement du filtre à particules'),
  (4, 'Filtre charbon actif',  400, 'Remplacement du filtre aux odeurs'),
  (5, 'Nettoyage buse',        100, 'Nettoyage ou remplacement de la buse'),
  (6, 'Nettoyage plateau',      50, 'Nettoyage en profondeur du plateau'),
  (7, 'Vérification courroies',500, 'Tension et usure des courroies'),
  (8, 'Calibration XYZ',       200, 'Recalibration complète des axes');

-- ── v1.10.0 — Lien impression ↔ objet bibliothèque ───────────────────────
ALTER TABLE prints ADD COLUMN IF NOT EXISTS
  library_object_id INT DEFAULT NULL COMMENT 'Lien vers un objet de la bibliothèque';

ALTER TABLE prints ADD COLUMN IF NOT EXISTS
  library_file_id_v2 INT DEFAULT NULL COMMENT 'Fichier STL/3MF utilisé (depuis la bibliothèque)';

-- FK si pas déjà présente
SET @sql = IF(
  NOT EXISTS(SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='prints' AND CONSTRAINT_NAME='fk_prints_lib_object'),
  'ALTER TABLE prints ADD CONSTRAINT fk_prints_lib_object FOREIGN KEY (library_object_id) REFERENCES library_objects(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── v1.10.0 — Multi-filaments par impression ──────────────────────────────
CREATE TABLE IF NOT EXISTS print_filaments (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  print_id            INT NOT NULL,
  filament_id         INT NOT NULL,
  sort_order          INT DEFAULT 0 COMMENT 'Ordre d impression (1er, 2ème...)',
  quantity_estimated  DECIMAL(8,2) DEFAULT NULL COMMENT 'Grammes prévus',
  quantity_actual     DECIMAL(8,2) DEFAULT NULL COMMENT 'Grammes réellement utilisés',
  notes               VARCHAR(200) DEFAULT NULL,
  FOREIGN KEY (print_id)   REFERENCES prints(id)   ON DELETE CASCADE,
  FOREIGN KEY (filament_id) REFERENCES filaments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_print_filaments_print ON print_filaments(print_id);

-- ── v1.10.0 — Paramètre activation projets ───────────────────────────────
INSERT IGNORE INTO settings (key_name, value) VALUES ('projects_enabled', 'true');

-- ── v1.10.0 — Notation des impressions ───────────────────────────────────
ALTER TABLE prints ADD COLUMN IF NOT EXISTS
  rating TINYINT DEFAULT NULL COMMENT 'Note de 1 à 5 étoiles';

-- ── v1.10.0 — Versioning des fichiers bibliothèque ───────────────────────
ALTER TABLE library_files
  ADD COLUMN IF NOT EXISTS version        VARCHAR(20)  DEFAULT NULL  COMMENT 'ex: v1.0, v2.1',
  ADD COLUMN IF NOT EXISTS changelog      TEXT         DEFAULT NULL  COMMENT 'Description des changements',
  ADD COLUMN IF NOT EXISTS parent_file_id INT          DEFAULT NULL  COMMENT 'Fichier version précédente',
  ADD COLUMN IF NOT EXISTS is_latest      TINYINT(1)   DEFAULT 1     COMMENT '1 = version courante';

-- Mettre toutes les fichiers existants comme "latest" par défaut
UPDATE library_files SET is_latest = 1 WHERE is_latest IS NULL;

-- ── v1.10.0 — Rapport hebdomadaire SMTP ──────────────────────────────────
INSERT IGNORE INTO settings (key_name, value) VALUES
  ('report_enabled',  'false'),
  ('report_email',    ''),
  ('report_day',      '1'),
  ('report_hour',     '8'),
  ('smtp_host',       ''),
  ('smtp_port',       '587'),
  ('smtp_secure',     'false'),
  ('smtp_user',       ''),
  ('smtp_password',   ''),
  ('smtp_from',       '');

-- ── Nettoyage — suppression tables obsolètes ─────────────────────────────
DROP TABLE IF EXISTS push_subscriptions;

-- ── v1.10.0 — Thème automatique ──────────────────────────────────────────
INSERT IGNORE INTO settings (key_name, value) VALUES
  ('color_mode', ''),
  ('dark_from',  '20'),
  ('dark_to',    '7');

-- ── v1.9.0 final — Améliorations ─────────────────────────────────────────
-- 1. Nom par défaut PrintFlow-3D
UPDATE settings SET value='PrintFlow-3D' WHERE key_name='app_name' AND value='PrintFlow';
INSERT IGNORE INTO settings (key_name, value) VALUES ('app_name', 'PrintFlow-3D');

-- 2. Toggle AMS imprimantes
ALTER TABLE printers ADD COLUMN IF NOT EXISTS
  has_ams TINYINT(1) DEFAULT 0 COMMENT 'Système multi-filaments AMS/MMU';

-- ── v2.0.0 — Intégration Tapo P100 ───────────────────────────────────────
ALTER TABLE printers
  ADD COLUMN IF NOT EXISTS tapo_ip VARCHAR(45) DEFAULT NULL COMMENT 'IP de la prise Tapo P100';

-- ── v2.0.0 — Credentials Tapo ────────────────────────────────────────────
INSERT IGNORE INTO settings (key_name, value) VALUES
  ('tapo_email',    ''),
  ('tapo_password', '');   -- stocké chiffré AES-256

-- ── v2.0.0 — Tapo MAC et état ────────────────────────────────────────────
ALTER TABLE printers
  ADD COLUMN IF NOT EXISTS tapo_mac   VARCHAR(20)  DEFAULT NULL COMMENT 'Adresse MAC de la prise Tapo',
  ADD COLUMN IF NOT EXISTS tapo_state TINYINT(1)   DEFAULT 0   COMMENT 'Dernier état connu 0=off 1=on';

-- ── v2.0.0 — Tapo enabled toggle ─────────────────────────────────────────
INSERT IGNORE INTO settings (key_name, value) VALUES ('tapo_enabled', 'false');


-- ── Base de référence poids bobines vides ────────────────────────────────
CREATE TABLE IF NOT EXISTS spool_weights (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  brand       VARCHAR(100) NOT NULL  COMMENT 'Fabricant',
  model       VARCHAR(100) DEFAULT NULL COMMENT 'Modèle / référence',
  weight_g    DECIMAL(7,2) NOT NULL  COMMENT 'Poids bobine vide (g)',
  spool_size_g INT DEFAULT 1000      COMMENT 'Taille bobine (g de filament)',
  diameter_mm DECIMAL(4,2) DEFAULT 1.75,
  notes       VARCHAR(200) DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Données de référence initiales
INSERT IGNORE INTO spool_weights (id, brand, model, weight_g, spool_size_g) VALUES
  (1,  'Bambu Lab',    'Standard AMS',     250, 1000),
  (2,  'Bambu Lab',    'Lite',             180, 1000),
  (3,  'Bambu Lab',    'Matte',            250, 1000),
  (4,  'Elegoo',       'Standard',         220, 1000),
  (5,  'Elegoo',       'Rapid',            195, 1000),
  (6,  'Polymaker',    'PolyTerra',        200, 1000),
  (7,  'Polymaker',    'PolyLite',         210, 1000),
  (8,  'Prusament',    'Standard',         201, 1000),
  (9,  'Sunlu',        'Standard',         210, 1000),
  (10, 'Sunlu',        'S-Eco',            190, 1000),
  (11, 'Hatchbox',     'Standard',         227, 1000),
  (12, 'eSUN',         'Standard',         230, 1000),
  (13, 'eSUN',         'Refill',            80, 1000),
  (14, 'Fiberlogy',    'Standard',         205, 1000),
  (15, 'Extrudr',      'Standard',         215, 1000),
  (16, 'Fillamentum',  'Standard',         220, 1000),
  (17, 'FormFutura',   'Standard',         210, 1000),
  (18, 'Raise3D',      'Standard',         230, 1000),
  (19, 'ColorFabb',    'Standard',         215, 1000),
  (20, 'Generic',      'Carton',           150, 1000),
  (21, 'Generic',      'Plastique leger',  180, 1000),
  (22, 'Generic',      'Plastique lourd',  250, 1000);

-- ── v2.1.0 — Devis client ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  client_name     VARCHAR(255) NOT NULL,
  client_email    VARCHAR(255) DEFAULT NULL,
  notes           TEXT,
  status          ENUM('draft','sent','accepted','refused') DEFAULT 'draft',
  margin_pct      DECIMAL(5,2) DEFAULT 20  COMMENT 'Marge globale en %',
  total_ht        DECIMAL(8,2) DEFAULT 0   COMMENT 'Total calculé depuis les lignes',
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Lignes de devis (multi-items)
CREATE TABLE IF NOT EXISTS quote_items (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  quote_id        INT NOT NULL,
  designation     VARCHAR(255) NOT NULL    COMMENT 'Description de la pièce',
  qty             INT DEFAULT 1            COMMENT 'Quantité',
  print_time_h    DECIMAL(6,2) DEFAULT 0  COMMENT 'Durée impression en heures',
  filament_g      DECIMAL(8,2) DEFAULT 0  COMMENT 'Filament consommé en grammes',
  filament_id     INT DEFAULT NULL,
  printer_id      INT DEFAULT NULL,
  filament_cost   DECIMAL(8,2) DEFAULT 0  COMMENT 'Coût matière calculé',
  electricity_cost DECIMAL(8,2) DEFAULT 0 COMMENT 'Coût électricité calculé',
  unit_price      DECIMAL(8,2) DEFAULT 0  COMMENT 'Prix unitaire HT (avec marge)',
  sort_order      INT DEFAULT 0,
  print_id        INT DEFAULT NULL COMMENT 'Impression réalisée liée',
  FOREIGN KEY (quote_id)    REFERENCES quotes(id)    ON DELETE CASCADE,
  FOREIGN KEY (filament_id) REFERENCES filaments(id) ON DELETE SET NULL,
  FOREIGN KEY (printer_id)  REFERENCES printers(id)  ON DELETE SET NULL,
  FOREIGN KEY (print_id)    REFERENCES prints(id)    ON DELETE SET NULL
);

-- Paramètres globaux devis
INSERT IGNORE INTO settings (key_name, value) VALUES
  ('quote_margin_default', '20'),
  ('quote_electricity_rate', '0.20'),
  ('quote_company_name', ''),
  ('quote_company_info', '');

-- ── v2.1.0 — Planning d'impression ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS print_schedule (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  printer_id   INT DEFAULT NULL,
  filament_id  INT DEFAULT NULL,
  planned_at   DATETIME NOT NULL COMMENT 'Date/heure planifiée',
  duration_h   DECIMAL(6,2) DEFAULT 0,
  status       ENUM('planned','in_progress','done','cancelled') DEFAULT 'planned',
  print_id     INT DEFAULT NULL COMMENT 'Impression liée si réalisée',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (printer_id)  REFERENCES printers(id)  ON DELETE SET NULL,
  FOREIGN KEY (filament_id) REFERENCES filaments(id) ON DELETE SET NULL,
  FOREIGN KEY (print_id)    REFERENCES prints(id)    ON DELETE SET NULL
);

-- ── v2.1.0 rev — Planning intégré dans prints ────────────────────────────
-- Ajouter planned_at et le statut planned dans prints
ALTER TABLE prints
  MODIFY COLUMN status ENUM('queued','planned','printing','paused','done','failed','cancelled')
    DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS planned_at DATETIME DEFAULT NULL
    COMMENT 'Date/heure planifiée';

-- Supprimer la table séparée (migration propre)
DROP TABLE IF EXISTS print_schedule;

-- ── v2.1.0 — Toggle devis ────────────────────────────────────────────────
INSERT IGNORE INTO settings (key_name, value) VALUES ('quotes_enabled', 'true');

-- ── v2.2.0 — Galerie photos ──────────────────────────────────────────────
INSERT IGNORE INTO settings (key_name, value) VALUES ('gallery_enabled', 'true');
INSERT IGNORE INTO settings (key_name, value) VALUES ('accent_color', '#185FA5');

-- ── v2.3.0 — Bobines partielles ──────────────────────────────────────────
-- Lien optionnel vers un filament "parent" (même matière/couleur)
ALTER TABLE filaments
  ADD COLUMN IF NOT EXISTS parent_filament_id INT DEFAULT NULL
    COMMENT 'ID du filament parent si bobine partielle',
  ADD COLUMN IF NOT EXISTS spool_label VARCHAR(50) DEFAULT NULL
    COMMENT 'Étiquette libre ex: Bobine A, Reste commande mars';

-- Clé étrangère (ajoutée conditionnellement)
SET @fk_partial = (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'filaments'
    AND CONSTRAINT_NAME = 'fk_filament_parent'
);
SET @sql_fk = IF(@fk_partial = 0,
  'ALTER TABLE filaments ADD CONSTRAINT fk_filament_parent FOREIGN KEY (parent_filament_id) REFERENCES filaments(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql_fk; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── v2.3.0 — Dashboard personnalisable ───────────────────────────────────
INSERT IGNORE INTO settings (key_name, value) VALUES
  ('dashboard_widgets', 'alert_stock,alert_maintenance,alert_consumables,alert_bobines,metrics,printers_stock,prints_recent,consumption,activity');
