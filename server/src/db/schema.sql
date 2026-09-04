-- NORTH SUPPLY -- full schema. Dropped and recreated by `npm run db:migrate`.

DROP TABLE IF EXISTS newsletter_subscribers CASCADE;
DROP TABLE IF EXISTS password_resets    CASCADE;
DROP TABLE IF EXISTS otp_codes          CASCADE;
DROP TABLE IF EXISTS return_items       CASCADE;
DROP TABLE IF EXISTS returns            CASCADE;
DROP TABLE IF EXISTS order_items       CASCADE;
DROP TABLE IF EXISTS orders            CASCADE;
DROP TABLE IF EXISTS coupons           CASCADE;
DROP TABLE IF EXISTS wishlist_items    CASCADE;
DROP TABLE IF EXISTS reviews           CASCADE;
DROP TABLE IF EXISTS product_variants  CASCADE;
DROP TABLE IF EXISTS product_images    CASCADE;
DROP TABLE IF EXISTS products          CASCADE;
DROP TABLE IF EXISTS categories        CASCADE;
DROP TABLE IF EXISTS addresses         CASCADE;
DROP TABLE IF EXISTS users             CASCADE;

DROP TYPE IF EXISTS user_role     CASCADE;
DROP TYPE IF EXISTS order_status  CASCADE;
DROP TYPE IF EXISTS discount_type CASCADE;
DROP TYPE IF EXISTS return_status CASCADE;
DROP TYPE IF EXISTS otp_purpose   CASCADE;

CREATE TYPE user_role     AS ENUM ('customer', 'admin');
CREATE TYPE order_status  AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE discount_type AS ENUM ('percent', 'fixed');
CREATE TYPE return_status AS ENUM ('requested', 'approved', 'rejected', 'received', 'refunded');
CREATE TYPE otp_purpose   AS ENUM ('registration', 'login');

-- ---------------------------------------------------------------- users ---
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT        NOT NULL UNIQUE,
  -- NULL for accounts created through Google, which have no local password
  -- until the owner sets one via the reset flow.
  password_hash TEXT,
  first_name    TEXT        NOT NULL,
  last_name     TEXT        NOT NULL,
  phone         TEXT,
  role          user_role   NOT NULL DEFAULT 'customer',
  google_id     TEXT        UNIQUE,
  avatar_url    TEXT,
  -- True once the address has been proven, by email OTP or by Google.
  email_verified BOOLEAN    NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Every account must be reachable by at least one method.
  CONSTRAINT users_have_a_credential CHECK (password_hash IS NOT NULL OR google_id IS NOT NULL)
);
CREATE INDEX idx_users_email  ON users (lower(email));
CREATE INDEX idx_users_google ON users (google_id);

CREATE TABLE addresses (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  label       TEXT    NOT NULL DEFAULT 'Home',
  full_name   TEXT    NOT NULL,
  line1       TEXT    NOT NULL,
  line2       TEXT,
  city        TEXT    NOT NULL,
  state       TEXT    NOT NULL,
  postal_code TEXT    NOT NULL,
  country     TEXT    NOT NULL DEFAULT 'United States',
  phone       TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_addresses_user ON addresses (user_id);

-- ------------------------------------------------------------- catalog ---
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        TEXT           NOT NULL,
  slug        TEXT           NOT NULL UNIQUE,
  description TEXT           NOT NULL DEFAULT '',
  details     TEXT[]         NOT NULL DEFAULT '{}',
  category_id INTEGER        REFERENCES categories (id) ON DELETE SET NULL,
  price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  -- sale_price, when set, is what the customer actually pays.
  sale_price  NUMERIC(10, 2) CHECK (sale_price IS NULL OR sale_price >= 0),
  material    TEXT,
  care        TEXT,
  tags        TEXT[]  NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sale_below_price CHECK (sale_price IS NULL OR sale_price <= price)
);
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_active   ON products (is_active);
-- Backs the free-text search on the catalogue page.
CREATE INDEX idx_products_search   ON products
  USING GIN (to_tsvector('english', name || ' ' || description));

CREATE TABLE product_images (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  url        TEXT    NOT NULL,
  alt        TEXT    NOT NULL DEFAULT '',
  -- Photographer attribution for stock photography. Empty for generated art.
  credit     TEXT    NOT NULL DEFAULT '',
  credit_url TEXT    NOT NULL DEFAULT '',
  position   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_product_images_product ON product_images (product_id, position);

CREATE TABLE product_variants (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  sku        TEXT    NOT NULL UNIQUE,
  size       TEXT    NOT NULL,
  color      TEXT    NOT NULL,
  color_hex  TEXT    NOT NULL DEFAULT '#000000',
  stock      INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  UNIQUE (product_id, size, color)
);
CREATE INDEX idx_variants_product ON product_variants (product_id);

CREATE TABLE reviews (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title      TEXT    NOT NULL DEFAULT '',
  body       TEXT    NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- one review per customer per product; posting again updates the original.
  UNIQUE (product_id, user_id)
);
CREATE INDEX idx_reviews_product ON reviews (product_id);

CREATE TABLE wishlist_items (
  user_id    INTEGER NOT NULL REFERENCES users (id)    ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

-- ------------------------------------------------------------ commerce ---
CREATE TABLE coupons (
  id           SERIAL PRIMARY KEY,
  code         TEXT           NOT NULL UNIQUE,
  type         discount_type  NOT NULL,
  value        NUMERIC(10, 2) NOT NULL CHECK (value > 0),
  min_subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  max_uses     INTEGER,
  used_count   INTEGER        NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ,
  is_active    BOOLEAN        NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id               SERIAL PRIMARY KEY,
  order_number     TEXT           NOT NULL UNIQUE,
  user_id          INTEGER        REFERENCES users (id) ON DELETE SET NULL,
  email            TEXT           NOT NULL,
  status           order_status   NOT NULL DEFAULT 'pending',
  subtotal         NUMERIC(10, 2) NOT NULL,
  discount         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  shipping         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tax              NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total            NUMERIC(10, 2) NOT NULL,
  coupon_code      TEXT,
  shipping_address JSONB          NOT NULL,
  payment_brand    TEXT,
  payment_last4    TEXT,
  placed_at        TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_user   ON orders (user_id, placed_at DESC);
CREATE INDEX idx_orders_status ON orders (status);

CREATE TABLE order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  variant_id   INTEGER REFERENCES product_variants (id) ON DELETE SET NULL,
  product_id   INTEGER REFERENCES products (id) ON DELETE SET NULL,
  -- Name/size/colour/price are copied so an order still reads correctly
  -- after the underlying product is renamed, repriced, or deleted.
  product_name TEXT           NOT NULL,
  product_slug TEXT           NOT NULL DEFAULT '',
  size         TEXT           NOT NULL,
  color        TEXT           NOT NULL,
  unit_price   NUMERIC(10, 2) NOT NULL,
  quantity     INTEGER        NOT NULL CHECK (quantity > 0),
  image_url    TEXT
);
CREATE INDEX idx_order_items_order ON order_items (order_id);

CREATE TABLE newsletter_subscribers (
  id           SERIAL PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------------------------------------------------------- returns ---
CREATE TABLE returns (
  id             SERIAL PRIMARY KEY,
  rma_number     TEXT          NOT NULL UNIQUE,
  order_id       INTEGER       NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  user_id        INTEGER       REFERENCES users (id) ON DELETE SET NULL,
  email          TEXT          NOT NULL,
  status         return_status NOT NULL DEFAULT 'requested',
  reason         TEXT          NOT NULL DEFAULT '',
  -- Set by an admin when approving/rejecting; shown to the customer.
  staff_note     TEXT          NOT NULL DEFAULT '',
  refund_amount  NUMERIC(10, 2),
  -- Set the first time the goods come back, so a status flip-flop cannot
  -- restock the same items twice.
  restocked_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_returns_order ON returns (order_id);
CREATE INDEX idx_returns_user  ON returns (user_id, created_at DESC);

CREATE TABLE return_items (
  id            SERIAL PRIMARY KEY,
  return_id     INTEGER NOT NULL REFERENCES returns (id) ON DELETE CASCADE,
  order_item_id INTEGER NOT NULL REFERENCES order_items (id) ON DELETE CASCADE,
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  reason        TEXT    NOT NULL DEFAULT '',
  UNIQUE (return_id, order_item_id)
);
CREATE INDEX idx_return_items_return ON return_items (return_id);

-- -------------------------------------------------------- password resets ---
CREATE TABLE password_resets (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- Only the SHA-256 of the token is stored, so a database leak cannot be
  -- replayed to take over accounts.
  token_hash TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_password_resets_user ON password_resets (user_id);

-- ------------------------------------------------------------- one-time codes ---
CREATE TABLE otp_codes (
  id         SERIAL PRIMARY KEY,
  purpose    otp_purpose NOT NULL,
  email      TEXT        NOT NULL,
  -- Set for 'login'; NULL for 'registration', where no user exists yet.
  user_id    INTEGER     REFERENCES users (id) ON DELETE CASCADE,
  -- Only the SHA-256 of the six digits is stored.
  code_hash  TEXT        NOT NULL,
  -- For 'registration', the pending signup: password hash and name. Held here
  -- rather than in `users` so an abandoned signup never squats an email.
  payload    JSONB,
  attempts   INTEGER     NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_lookup ON otp_codes (lower(email), purpose, consumed_at);
