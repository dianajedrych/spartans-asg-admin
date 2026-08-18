export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
}

export interface Brand {
  id: string;
  name: string;
}

export interface ProductListRow {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  base_price: number;
  sale_price: number | null;
  is_active: boolean;
  is_bestseller: boolean;
  is_new: boolean;
  is_featured: boolean;
  brands: { name: string } | null;
  categories: { name: string } | null;
  product_variants: { id: string; inventory: { quantity_on_hand: number; low_stock_threshold: number } | null }[];
}
