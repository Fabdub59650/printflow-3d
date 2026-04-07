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
  ('backup_schedule', '0 2 * * *'),
  ('backup_keep', '7'),
  ('backup_library_enabled', 'false'),
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
  photo_path    VARCHAR(500) DEFAULT NULL COMMENT 'Photo de l objet sur disque',
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
