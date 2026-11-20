import { Navigate, useNavigate } from 'react-router';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCanEditMasters } from '@/features/auth/hooks';
import { ProductForm } from '@/features/products/ProductForm';

/** Add a product together with its first pack(s). Founder and Admin only (the API enforces it too). */
export function NewProductPage() {
  const canEdit = useCanEditMasters();
  const navigate = useNavigate();

  if (!canEdit) return <Navigate to="/products" replace />;

  return (
    <PageLayout title="Add product" description="A product is saved together with its packs.">
      <ProductForm
        onSaved={(product) => void navigate(`/products/${product.id}`)}
        onCancel={() => void navigate('/products')}
      />
    </PageLayout>
  );
}
