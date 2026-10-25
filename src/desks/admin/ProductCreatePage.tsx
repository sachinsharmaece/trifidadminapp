import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { DevNote } from '../../components/dev/DevNote';
import { Button } from '../../components/ui/Button';
import { ProductForm } from './ProductForm';

/** Manage → Products → Create. The same form as Edit (ProductForm), in create mode. */
export function ProductCreatePage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" icon={<FiArrowLeft />} onClick={() => navigate('/manage/products')}>
          Products
        </Button>
      </div>
      <h1 className="text-xl font-semibold text-slate-900">Create product</h1>
      <DevNote screen="admin_products_create" />
      <ProductForm
        mode="create"
        onSaved={(productId) => navigate(`/manage/products/${productId}`)}
      />
    </div>
  );
}
