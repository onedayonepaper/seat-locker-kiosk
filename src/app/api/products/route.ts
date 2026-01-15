import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST /api/products - Create a new product (admin only)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, durationMin, price, isDefault, sortOrder } = body;

    if (!name || !durationMin || price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

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
        isActive: true,
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
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

// PATCH /api/products - Update product (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, durationMin, price, isDefault, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: id' },
        { status: 400 }
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
        name,
        durationMin,
        price,
        isDefault,
        isActive,
        sortOrder,
      },
    });

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

// DELETE /api/products - Deactivate product (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: id' },
        { status: 400 }
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
      { success: false, error: 'Failed to deactivate product' },
      { status: 500 }
    );
  }
}
