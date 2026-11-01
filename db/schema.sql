CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  sort INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  price INT NOT NULL,
  image VARCHAR(255) NULL,
  is_addon TINYINT(1) NOT NULL DEFAULT 0,
  has_addons TINYINT(1) NOT NULL DEFAULT 0,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  note_hint VARCHAR(160) NULL,
  available TINYINT(1) NOT NULL DEFAULT 1,
  sold_label ENUM('habis','kosong') NOT NULL DEFAULT 'habis',
  sold_note VARCHAR(160) NULL,
  sort INT NOT NULL DEFAULT 0,
  FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(24) NOT NULL UNIQUE,
  customer_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  mode ENUM('antar','ambil') NOT NULL DEFAULT 'antar',
  address TEXT NULL,
  lat DECIMAL(9,6) NULL,
  lng DECIMAL(9,6) NULL,
  distance_km DECIMAL(5,2) NULL,
  distance_source VARCHAR(12) NULL,
  payment VARCHAR(30) NOT NULL DEFAULT 'Tunai',
  note VARCHAR(255) NULL,
  subtotal INT NOT NULL,
  fee INT NOT NULL DEFAULT 0,
  total INT NOT NULL,
  status ENUM('baru','diproses','siap','selesai','batal') NOT NULL DEFAULT 'baru',
  payment_status ENUM('belum','menunggu','terverifikasi','ditolak') NOT NULL DEFAULT 'belum',
  payment_proof VARCHAR(255) NULL,
  payment_proof_at DATETIME NULL,
  payment_reject_note VARCHAR(160) NULL,
  completed_at DATETIME NULL,
  wa_proof_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NULL,
  name VARCHAR(160) NOT NULL,
  unit_price INT NOT NULL,
  qty INT NOT NULL,
  addons JSON NULL,
  note VARCHAR(160) NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS settings (
  k VARCHAR(60) PRIMARY KEY,
  v VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
