import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { validateRequest, productCreateSchema, productUpdateSchema, productDeleteSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

// GET /api/products - Get products (active by default)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('all') === '1';
    const products = await db.product.findMany({
      where: includeAll ? undefined : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product (admin only - protected by middleware)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const validation = validateRequest(productCreateSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { name, durationMin, price, isDefault, sortOrder, isActive } = validation.data;

    // If this product is default, unset other defaults
    if (isDefault) {
      await db.product.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const product = await db.product.create({
      data: {
        name,
        durationMin,
        price,
        isDefault: isDefault || false,
        isActive: isActive ?? true,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create product', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// PATCH /api/products - Update product (admin only - protected by middleware)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const validation = validateRequest(productUpdateSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { id, name, durationMin, price, isDefault, isActive, sortOrder } = validation.data;

    // Check if product exists
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (isDefault) {
      await db.product.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const product = await db.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(durationMin !== undefined && { durationMin }),
        ...(price !== undefined && { price }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update product', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// DELETE /api/products - Deactivate product (admin only - protected by middleware)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod
    const validation = validateRequest(productDeleteSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    const { id } = validation.data;

    // Check if product exists
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Product not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const product = await db.product.update({
      where: { id },
      data: {
        isActive: false,
        isDefault: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error deactivating product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate product', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
