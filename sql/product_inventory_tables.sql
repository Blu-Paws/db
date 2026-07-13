-- BluPaws product and inventory schema.
-- Run this after clinic and login exist.

CREATE TABLE IF NOT EXISTS mstr_product_categories (
  category_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_category_id BIGINT UNSIGNED NULL,

  category_code VARCHAR(64) NOT NULL,
  category_name VARCHAR(150) NOT NULL,
  description VARCHAR(500) NULL,

  sort_order INT NOT NULL DEFAULT 0,
  status TINYINT NOT NULL DEFAULT 1,

  created_by INT NULL,
  updated_by INT NULL,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  parent_category_key BIGINT UNSIGNED GENERATED ALWAYS AS (COALESCE(parent_category_id, 0)) STORED,

  PRIMARY KEY (category_id),

  UNIQUE KEY uq_mstr_product_category_sibling_code (
    parent_category_key,
    category_code
  ),

  KEY idx_mstr_product_categories_parent (parent_category_id),
  KEY idx_mstr_product_categories_name (category_name),

  CONSTRAINT fk_mstr_product_categories_parent
    FOREIGN KEY (parent_category_id)
    REFERENCES mstr_product_categories(category_id),

  CONSTRAINT chk_mstr_product_categories_status
    CHECK (status IN (0, 1))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS provider_products (
  product_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  clinic_id INT NULL,
  category_id BIGINT UNSIGNED NULL,

  product_code VARCHAR(64) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  description TEXT NULL,
  brand_name VARCHAR(150) NULL,

  product_type ENUM(
    'physical',
    'service_supply',
    'bundle',
    'digital',
    'other'
  ) NOT NULL DEFAULT 'physical',

  is_stock_tracked TINYINT NOT NULL DEFAULT 1,
  is_restricted TINYINT NOT NULL DEFAULT 0,
  requires_prescription TINYINT NOT NULL DEFAULT 0,
  allow_negative_stock TINYINT NOT NULL DEFAULT 0,

  tax_id INT NULL,
  default_unit_of_measure VARCHAR(32) NOT NULL DEFAULT 'each',
  image_id INT NULL,

  status TINYINT NOT NULL DEFAULT 1,

  created_by INT NULL,
  updated_by INT NULL,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  clinic_key INT GENERATED ALWAYS AS (COALESCE(clinic_id, 0)) STORED,

  PRIMARY KEY (product_id),

  UNIQUE KEY uq_provider_products_clinic_code (clinic_key, product_code),

  KEY idx_provider_products_clinic_status (clinic_id, status),
  KEY idx_provider_products_category (category_id, status),
  KEY idx_provider_products_name (product_name),
  KEY idx_provider_products_stock_tracked (clinic_id, is_stock_tracked, status),
  KEY idx_provider_products_restricted (clinic_id, is_restricted, status),

  CONSTRAINT fk_provider_products_clinic
    FOREIGN KEY (clinic_id)
    REFERENCES clinic(clinic_id),

  CONSTRAINT fk_provider_products_category
    FOREIGN KEY (category_id)
    REFERENCES mstr_product_categories(category_id),

  CONSTRAINT fk_provider_products_tax
    FOREIGN KEY (tax_id)
    REFERENCES clinic_tax(tax_id),

  CONSTRAINT fk_provider_products_image
    FOREIGN KEY (image_id)
    REFERENCES images(image_id),

  CONSTRAINT chk_provider_products_stock_tracked
    CHECK (is_stock_tracked IN (0, 1)),

  CONSTRAINT chk_provider_products_restricted
    CHECK (is_restricted IN (0, 1)),

  CONSTRAINT chk_provider_products_prescription
    CHECK (requires_prescription IN (0, 1)),

  CONSTRAINT chk_provider_products_negative_stock
    CHECK (allow_negative_stock IN (0, 1)),

  CONSTRAINT chk_provider_products_status
    CHECK (status IN (0, 1))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS provider_product_variants (
  variant_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,

  sku VARCHAR(100) NULL,
  barcode VARCHAR(100) NULL,
  variant_code VARCHAR(64) NOT NULL,
  variant_name VARCHAR(200) NOT NULL,

  unit_of_measure VARCHAR(32) NOT NULL DEFAULT 'each',
  package_size DECIMAL(12,3) NULL,
  package_unit VARCHAR(32) NULL,

  cost_price DECIMAL(12,2) NULL,
  sale_price DECIMAL(12,2) NULL,
  mrp DECIMAL(12,2) NULL,

  reorder_level DECIMAL(12,3) NOT NULL DEFAULT 0,
  reorder_quantity DECIMAL(12,3) NOT NULL DEFAULT 0,

  track_batch TINYINT NOT NULL DEFAULT 0,
  track_expiry TINYINT NOT NULL DEFAULT 0,

  sort_order INT NOT NULL DEFAULT 0,
  status TINYINT NOT NULL DEFAULT 1,

  created_by INT NULL,
  updated_by INT NULL,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (variant_id),

  UNIQUE KEY uq_provider_product_variants_product_code (product_id, variant_code),
  UNIQUE KEY uq_provider_product_variants_sku (sku),
  UNIQUE KEY uq_provider_product_variants_barcode (barcode),

  KEY idx_provider_product_variants_product (product_id, status),
  KEY idx_provider_product_variants_name (variant_name),
  KEY idx_provider_product_variants_reorder (reorder_level),

  CONSTRAINT fk_provider_product_variants_product
    FOREIGN KEY (product_id)
    REFERENCES provider_products(product_id),

  CONSTRAINT chk_provider_product_variants_prices
    CHECK (
      (cost_price IS NULL OR cost_price >= 0)
      AND (sale_price IS NULL OR sale_price >= 0)
      AND (mrp IS NULL OR mrp >= 0)
    ),

  CONSTRAINT chk_provider_product_variants_reorder
    CHECK (reorder_level >= 0 AND reorder_quantity >= 0),

  CONSTRAINT chk_provider_product_variants_batch
    CHECK (track_batch IN (0, 1)),

  CONSTRAINT chk_provider_product_variants_expiry
    CHECK (track_expiry IN (0, 1)),

  CONSTRAINT chk_provider_product_variants_status
    CHECK (status IN (0, 1))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS mstr_provider_product_channels (
  channel_id INT NOT NULL AUTO_INCREMENT,
  name VARCHAR(45) NOT NULL,
  description VARCHAR(245) NOT NULL,
  status INT NOT NULL DEFAULT 1,

  PRIMARY KEY (channel_id),
  UNIQUE KEY uq_mstr_provider_product_channels_name (name),
  KEY idx_mstr_provider_product_channels_status (status)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO mstr_provider_product_channels (name, description, status)
VALUES
  ('POS', 'Point of sale', 1),
  ('ONLINE', 'Online sales', 1),
  ('MOBILE', 'Mobile sales', 1);

CREATE TABLE IF NOT EXISTS provider_product_channels (
  product_channel_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  channel_id INT NOT NULL,

  is_enabled TINYINT NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,

  created_by INT NULL,
  updated_by INT NULL,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (product_channel_id),

  UNIQUE KEY uq_provider_product_channels_product_channel (product_id, channel_id),
  KEY idx_provider_product_channels_channel (channel_id, is_enabled),

  CONSTRAINT fk_provider_product_channels_product
    FOREIGN KEY (product_id)
    REFERENCES provider_products(product_id),

  CONSTRAINT fk_provider_product_channels_channel
    FOREIGN KEY (channel_id)
    REFERENCES mstr_provider_product_channels(channel_id),

  CONSTRAINT chk_provider_product_channels_enabled
    CHECK (is_enabled IN (0, 1))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS provider_inventory_locations (
  location_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  clinic_id INT NULL,
  parent_location_id BIGINT UNSIGNED NULL,

  location_code VARCHAR(64) NOT NULL,
  location_name VARCHAR(150) NOT NULL,

  location_type ENUM(
    'country',
    'state',
    'city',
    'branch',
    'floor',
    'room',
    'shelf',
    'rack',
    'bin',
    'vehicle',
    'other'
  ) NOT NULL,

  full_path_code VARCHAR(500) NULL,

  is_stock_location TINYINT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  status TINYINT NOT NULL DEFAULT 1,

  created_by INT NULL,
  updated_by INT NULL,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  clinic_key INT GENERATED ALWAYS AS (COALESCE(clinic_id, 0)) STORED,
  parent_location_key BIGINT UNSIGNED GENERATED ALWAYS AS (COALESCE(parent_location_id, 0)) STORED,

  PRIMARY KEY (location_id),

  UNIQUE KEY uq_provider_inventory_location_sibling_code (
    clinic_key,
    parent_location_key,
    location_code
  ),

  KEY idx_provider_inventory_locations_parent (parent_location_id),
  KEY idx_provider_inventory_locations_clinic (clinic_id, location_type, status),
  KEY idx_provider_inventory_locations_stock (clinic_id, is_stock_location, status),
  KEY idx_provider_inventory_locations_code (location_code),

  CONSTRAINT fk_provider_inventory_locations_parent
    FOREIGN KEY (parent_location_id)
    REFERENCES provider_inventory_locations(location_id),

  CONSTRAINT fk_provider_inventory_locations_clinic
    FOREIGN KEY (clinic_id)
    REFERENCES clinic(clinic_id),

  CONSTRAINT chk_provider_inventory_locations_stock_flag
    CHECK (is_stock_location IN (0, 1)),

  CONSTRAINT chk_provider_inventory_locations_status
    CHECK (status IN (0, 1))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS provider_inventory_stock (
  stock_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  clinic_id INT NOT NULL,
  variant_id BIGINT UNSIGNED NOT NULL,
  location_id BIGINT UNSIGNED NOT NULL,
  batch_id VARCHAR(100) NOT NULL DEFAULT '',

  quantity_on_hand DECIMAL(12,3) NOT NULL DEFAULT 0,
  reserved_quantity DECIMAL(12,3) NOT NULL DEFAULT 0,

  last_counted_date DATETIME NULL,
  last_movement_date DATETIME NULL,

  status TINYINT NOT NULL DEFAULT 1,

  created_by INT NULL,
  updated_by INT NULL,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (stock_id),

  UNIQUE KEY uq_provider_inventory_stock_balance (clinic_id, location_id, variant_id, batch_id),

  KEY idx_provider_inventory_stock_location (clinic_id, location_id, status),
  KEY idx_provider_inventory_stock_variant (clinic_id, variant_id, status),
  KEY idx_provider_inventory_stock_available (clinic_id, variant_id, location_id, batch_id, quantity_on_hand, reserved_quantity),

  CONSTRAINT fk_provider_inventory_stock_variant
    FOREIGN KEY (variant_id)
    REFERENCES provider_product_variants(variant_id),

  CONSTRAINT fk_provider_inventory_stock_location
    FOREIGN KEY (location_id)
    REFERENCES provider_inventory_locations(location_id),

  CONSTRAINT chk_provider_inventory_stock_reserved
    CHECK (reserved_quantity >= 0),

  CONSTRAINT chk_provider_inventory_stock_available
    CHECK (quantity_on_hand >= reserved_quantity),

  CONSTRAINT chk_provider_inventory_stock_status
    CHECK (status IN (0, 1))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS provider_service_consumables (
  consumption_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  clinic_id INT NOT NULL,
  reference_type VARCHAR(45) NOT NULL,
  reference_id VARCHAR(45) NOT NULL,
  variant_id BIGINT UNSIGNED NOT NULL,

  quantity FLOAT NOT NULL,
  is_optional INT NOT NULL DEFAULT 0,

  created_by INT NOT NULL,
  create_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (consumption_id),

  KEY idx_provider_service_consumables_clinic (clinic_id),
  KEY idx_provider_service_consumables_reference_id (reference_id),
  KEY idx_provider_service_consumables_variant (variant_id),

  CONSTRAINT fk_provider_service_consumables_clinic
    FOREIGN KEY (clinic_id)
    REFERENCES clinic(clinic_id),

  CONSTRAINT fk_provider_service_consumables_variant
    FOREIGN KEY (variant_id)
    REFERENCES provider_product_variants(variant_id),

  CONSTRAINT chk_provider_service_consumables_optional
    CHECK (is_optional IN (0, 1))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS provider_inventory_movements (
  movement_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  clinic_id INT NOT NULL,
  variant_id BIGINT UNSIGNED NOT NULL,
  location_id BIGINT UNSIGNED NULL,
  from_location_id BIGINT UNSIGNED NULL,
  to_location_id BIGINT UNSIGNED NULL,

  movement_type ENUM(
    'STOCK_IN',
    'SALE_RETURN',
    'ADJUSTMENT_IN',
    'SALE',
    'SERVICE_CONSUMPTION',
    'DAMAGE',
    'EXPIRED',
    'ADJUSTMENT_OUT',
    'TRANSFER'
  ) NOT NULL,

  quantity DECIMAL(12,3) NOT NULL,
  unit_cost DECIMAL(12,2) NULL,
  unit_price DECIMAL(12,2) NULL,

  batch_id VARCHAR(100) NULL,
  expiry_date DATE NULL,

  reference_type ENUM(
    'purchase_order',
    'bill',
    'appointment',
    'visit',
    'stock_adjustment',
    'stock_transfer',
    'manual',
    'other'
  ) NULL,
  reference_id BIGINT UNSIGNED NULL,
  reference_no VARCHAR(100) NULL,

  paired_movement_id BIGINT UNSIGNED NULL,
  notes VARCHAR(500) NULL,

  created_by INT NULL,
  created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (movement_id),

  KEY idx_provider_inventory_movements_variant_location (clinic_id, variant_id, location_id),
  KEY idx_provider_inventory_movements_from_location_date (clinic_id, from_location_id, created_date),
  KEY idx_provider_inventory_movements_to_location_date (clinic_id, to_location_id, created_date),
  KEY idx_provider_inventory_movements_location_date (clinic_id, location_id, created_date),
  KEY idx_provider_inventory_movements_variant_date (clinic_id, variant_id, created_date),
  KEY idx_provider_inventory_movements_type_date (clinic_id, movement_type, created_date),
  KEY idx_provider_inventory_movements_reference (reference_type, reference_id),
  KEY idx_provider_inventory_movements_paired (paired_movement_id),

  CONSTRAINT fk_provider_inventory_movements_variant
    FOREIGN KEY (variant_id)
    REFERENCES provider_product_variants(variant_id),

  CONSTRAINT fk_provider_inventory_movements_location
    FOREIGN KEY (location_id)
    REFERENCES provider_inventory_locations(location_id),

  CONSTRAINT fk_provider_inventory_movements_from_location
    FOREIGN KEY (from_location_id)
    REFERENCES provider_inventory_locations(location_id),

  CONSTRAINT fk_provider_inventory_movements_to_location
    FOREIGN KEY (to_location_id)
    REFERENCES provider_inventory_locations(location_id),

  CONSTRAINT fk_provider_inventory_movements_paired
    FOREIGN KEY (paired_movement_id)
    REFERENCES provider_inventory_movements(movement_id),

  CONSTRAINT chk_provider_inventory_movements_quantity
    CHECK (quantity > 0),

  CONSTRAINT chk_provider_inventory_movements_prices
    CHECK (
      (unit_cost IS NULL OR unit_cost >= 0)
      AND (unit_price IS NULL OR unit_price >= 0)
    )
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
