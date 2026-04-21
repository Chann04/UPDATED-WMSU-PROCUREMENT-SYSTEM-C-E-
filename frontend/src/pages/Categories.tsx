import { useState, useEffect } from 'react';
import { categoriesAPI } from '../lib/supabaseApi';
import type { Category } from '../types/database';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  Search,
  X,
  CheckCircle
} from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await categoriesAPI.getAll();
      setCategories(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (editingCategory) {
        await categoriesAPI.update(editingCategory.id, { name });
        setSuccess('Category updated successfully');
      } else {
        await categoriesAPI.create({ name });
        setSuccess('Category created successfully');
      }
      setShowModal(false);
      setName('');
      setEditingCategory(null);
      fetchCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await categoriesAPI.delete(id);
      setSuccess('Category deleted successfully');
      fetchCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const colors = [
    'bg-red-100 text-red-900',
    'bg-purple-100 text-purple-600',
    'bg-pink-100 text-pink-600',
    'bg-blue-100 text-blue-600',
    'bg-green-100 text-green-600',
    'bg-yellow-100 text-yellow-600',
    'bg-orange-100 text-orange-600',
    'bg-red-100 text-red-600'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-wmsu-black">Categories</h1>
          <p className="text-base text-gray-500 mt-1">Manage procurement item categories</p>
        </div>
        <button
          onClick={() => { setName(''); setEditingCategory(null); setShowModal(true); }}
          className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 transition-colors font-medium flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Category
        </button>
      </div>

      <CenteredAlert error={error || undefined} success={success || undefined} onClose={() => { setError(''); setSuccess(''); }} />

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredCategories.map((category, index) => (
          <div 
            key={category.id} 
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors[index % colors.length]}`}>
                <FolderOpen className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(category)}
                  className="p-2 text-gray-500 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="p-2 text-[#98111E] hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-wmsu-black mt-4">{category.name}</h3>
            <p className="text-sm text-gray-500 mt-1">
              Created {new Date(category.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No categories found</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-wmsu-black">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  placeholder="e.g., IT Equipment, Office Supplies"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-wmsu-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800"
                >
                  {editingCategory ? 'Update' : 'Create'} Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;

