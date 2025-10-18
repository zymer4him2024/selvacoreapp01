'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, Wrench, Clock } from 'lucide-react';
import { Service } from '@/types';
import { getAllServices, deleteService } from '@/lib/services/serviceService';
import { formatCurrency } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await getAllServices();
      setServices(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteService(id);
      toast.success('Service deleted successfully');
      loadServices();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete service');
    }
  };

  const filteredServices = services.filter((service) =>
    service.name.en.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Services</h1>
          <p className="text-text-secondary">Manage installation and maintenance services</p>
        </div>
        <Link
          href="/admin/services/new"
          className="flex items-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary/90 text-white font-semibold rounded-apple transition-all hover:scale-105 shadow-apple"
        >
          <Plus className="w-5 h-5" />
          Add Service
        </Link>
      </div>

      {/* Search */}
      <div className="apple-card">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface-elevated border border-border rounded-apple focus:border-primary focus:outline-none focus:shadow-apple-focus transition-all text-text-primary placeholder:text-text-tertiary"
          />
        </div>
      </div>

      {/* Services List */}
      {filteredServices.length === 0 ? (
        <div className="apple-card text-center py-16">
          <Wrench className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
          <h3 className="text-xl font-semibold mb-2">No services found</h3>
          <p className="text-text-secondary mb-6">
            {searchTerm ? 'Try a different search term' : 'Get started by adding your first service'}
          </p>
          {!searchTerm && (
            <Link
              href="/admin/services/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary/90 text-white font-semibold rounded-apple transition-all"
            >
              <Plus className="w-5 h-5" />
              Add First Service
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="apple-card hover:scale-[1.01] transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                {/* Service Info */}
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-apple bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <Wrench className="w-8 h-8 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-semibold mb-1">{service.name.en}</h3>
                          <p className="text-sm text-text-secondary line-clamp-2">
                            {service.description.en}
                          </p>
                        </div>
                        {!service.active && (
                          <span className="px-3 py-1 bg-error/20 text-error text-xs font-medium rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-6 mt-4">
                        <div>
                          <p className="text-2xl font-bold text-secondary">
                            {formatCurrency(service.price, service.currency)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{service.duration}h</span>
                        </div>
                        <div>
                          <span className="px-3 py-1 bg-surface-elevated rounded text-sm">
                            {service.category}
                          </span>
                        </div>
                      </div>

                      {service.includes && service.includes.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs text-text-tertiary mb-2">Includes:</p>
                          <div className="flex flex-wrap gap-2">
                            {service.includes.slice(0, 3).map((item, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-surface-elevated text-xs rounded"
                              >
                                {item}
                              </span>
                            ))}
                            {service.includes.length > 3 && (
                              <span className="px-2 py-1 text-xs text-text-tertiary">
                                +{service.includes.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  <Link
                    href={`/admin/services/${service.id}`}
                    className="p-2 bg-surface-elevated hover:bg-surface-secondary rounded-apple transition-all"
                  >
                    <Edit className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={() => handleDelete(service.id, service.name.en)}
                    className="p-2 bg-surface-elevated hover:bg-error/20 hover:text-error rounded-apple transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {filteredServices.length > 0 && (
        <div className="text-center text-sm text-text-tertiary">
          Showing {filteredServices.length} of {services.length} services
        </div>
      )}
    </div>
  );
}

