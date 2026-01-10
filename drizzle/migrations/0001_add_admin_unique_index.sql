-- Migration: Add partial unique index for customer organization admin role
-- This ensures exactly one admin per customer organization to prevent race conditions

CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_one_admin_per_org 
ON customers (customer_organization_id) 
WHERE customer_org_role = 'admin';
