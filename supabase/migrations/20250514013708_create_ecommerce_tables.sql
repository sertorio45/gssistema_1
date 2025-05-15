-- Create extensions if not exists
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create enum types
CREATE TYPE product_status AS ENUM ('draft', 'active', 'inactive', 'archived');
CREATE TYPE inventory_policy AS ENUM ('deny', 'continue');

-- Create ecommerce_categories table
CREATE TABLE ecommerce_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES ecommerce_categories(id),
    meta_title VARCHAR(255),
    meta_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create ecommerce_products table
CREATE TABLE ecommerce_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    short_description TEXT,
    sku VARCHAR(100) UNIQUE,
    status product_status DEFAULT 'draft',
    price DECIMAL(10,2) NOT NULL,
    compare_at_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    inventory_policy inventory_policy DEFAULT 'deny',
    inventory_quantity INTEGER DEFAULT 0,
    category_id UUID REFERENCES ecommerce_categories(id),
    weight DECIMAL(10,2),
    weight_unit VARCHAR(10),
    meta_title VARCHAR(255),
    meta_description TEXT,
    vendor VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create ecommerce_variants table
CREATE TABLE ecommerce_variants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES ecommerce_products(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    compare_at_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),
    inventory_quantity INTEGER DEFAULT 0,
    weight DECIMAL(10,2),
    weight_unit VARCHAR(10),
    option1_name VARCHAR(100),
    option1_value VARCHAR(100),
    option2_name VARCHAR(100),
    option2_value VARCHAR(100),
    option3_name VARCHAR(100),
    option3_value VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create ecommerce_images table
CREATE TABLE ecommerce_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID REFERENCES ecommerce_products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES ecommerce_variants(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    filename VARCHAR(255),
    alt_text VARCHAR(255),
    position INTEGER DEFAULT 0,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create ecommerce_integrations table
CREATE TABLE ecommerce_integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    api_key TEXT,
    api_secret TEXT,
    store_url VARCHAR(255),
    store_name VARCHAR(255),
    is_active BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}',
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(platform, store_url)
);

-- Create indexes
CREATE INDEX idx_products_category ON ecommerce_products(category_id);
CREATE INDEX idx_products_status ON ecommerce_products(status);
CREATE INDEX idx_variants_product ON ecommerce_variants(product_id);
CREATE INDEX idx_images_product ON ecommerce_images(product_id);
CREATE INDEX idx_images_variant ON ecommerce_images(variant_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_ecommerce_categories_updated_at
    BEFORE UPDATE ON ecommerce_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ecommerce_products_updated_at
    BEFORE UPDATE ON ecommerce_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ecommerce_variants_updated_at
    BEFORE UPDATE ON ecommerce_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ecommerce_images_updated_at
    BEFORE UPDATE ON ecommerce_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ecommerce_integrations_updated_at
    BEFORE UPDATE ON ecommerce_integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
