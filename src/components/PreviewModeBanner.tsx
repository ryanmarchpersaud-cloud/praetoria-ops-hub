import { useNavigate } from 'react-router-dom';
import { Eye, X } from 'lucide-react';

export function PreviewModeBanner() {
  const navigate = useNavigate();

  return (
    <div className="bg-amber-500 text-amber-950 text-xs font-semibold flex items-center justify-center gap-2 py-1.5 px-4 sticky top-0 z-50">
      <Eye className="w-3.5 h-3.5" />
      <span>Portal Preview Mode — Viewing as customer</span>
      <button
        onClick={() => navigate('/')}
        className="ml-2 p-0.5 rounded hover:bg-amber-600/30 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
