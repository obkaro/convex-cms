import { useState, useCallback } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { TaxonomyEditor } from '../components/TaxonomyEditor';
import { TermTree } from '../components/TermTree';

export const Route = createFileRoute('/taxonomies')({
  component: TaxonomiesPage,
});

interface Taxonomy {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  isHierarchical: boolean;
  allowInlineCreation: boolean;
  isActive: boolean;
  icon?: string;
  sortOrder?: number;
  termCount?: number;
}

function TaxonomiesPage() {
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<Taxonomy | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTaxonomy, setEditingTaxonomy] = useState<Taxonomy | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const taxonomiesQuery = useQuery(api.taxonomies.list, {
    isActive: undefined,
    includeDeleted: false,
  });

  const deleteTaxonomy = useMutation(api.taxonomies.deleteTaxonomy);

  const taxonomies = (taxonomiesQuery?.page ?? []) as Taxonomy[];
  const isLoading = taxonomiesQuery === undefined;

  const handleCreate = useCallback(() => {
    setEditingTaxonomy(null);
    setShowCreateModal(true);
  }, []);

  const handleEdit = useCallback((taxonomy: Taxonomy) => {
    setEditingTaxonomy(taxonomy);
    setShowCreateModal(true);
  }, []);

  const handleDelete = useCallback(async (taxonomyId: string) => {
    setDeleteError(null);
    try {
      await deleteTaxonomy({ id: taxonomyId });
      setShowDeleteConfirm(null);
      if (selectedTaxonomy?._id === taxonomyId) {
        setSelectedTaxonomy(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete taxonomy';
      setDeleteError(message);
    }
  }, [deleteTaxonomy, selectedTaxonomy]);

  const handleSaveComplete = useCallback(() => {
    setShowCreateModal(false);
    setEditingTaxonomy(null);
  }, []);

  const getTypeIcon = (taxonomy: Taxonomy) => {
    if (taxonomy.icon) return taxonomy.icon;
    return taxonomy.isHierarchical ? '📂' : '🏷️';
  };

  return (
    <div className="taxonomies-page">
      <div className="taxonomies-header">
        <div className="taxonomies-title">
          <h1>Taxonomies</h1>
          <p className="taxonomies-subtitle">
            Manage tags, categories, and other classification systems
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleCreate}>
          Create Taxonomy
        </button>
      </div>

      <div className="taxonomies-layout">
        <div className="taxonomies-list-panel">
          {isLoading ? (
            <div className="taxonomies-loading">Loading taxonomies...</div>
          ) : taxonomies.length === 0 ? (
            <div className="taxonomies-empty">
              <p>No taxonomies created yet.</p>
              <button type="button" className="btn btn-secondary" onClick={handleCreate}>
                Create your first taxonomy
              </button>
            </div>
          ) : (
            <ul className="taxonomies-list">
              {taxonomies.map((taxonomy) => (
                <li
                  key={taxonomy._id}
                  className={`taxonomy-item ${selectedTaxonomy?._id === taxonomy._id ? 'taxonomy-item--selected' : ''} ${!taxonomy.isActive ? 'taxonomy-item--inactive' : ''}`}
                  onClick={() => setSelectedTaxonomy(taxonomy)}
                >
                  <div className="taxonomy-item-icon">{getTypeIcon(taxonomy)}</div>
                  <div className="taxonomy-item-info">
                    <span className="taxonomy-item-name">{taxonomy.displayName}</span>
                    <span className="taxonomy-item-slug">{taxonomy.name}</span>
                  </div>
                  <div className="taxonomy-item-meta">
                    <span className="taxonomy-item-type">
                      {taxonomy.isHierarchical ? 'Hierarchical' : 'Flat'}
                    </span>
                    {!taxonomy.isActive && (
                      <span className="taxonomy-item-status">Inactive</span>
                    )}
                  </div>
                  <div className="taxonomy-item-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(taxonomy);
                      }}
                      title="Edit taxonomy"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(taxonomy._id);
                      }}
                      title="Delete taxonomy"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="taxonomies-detail-panel">
          {selectedTaxonomy ? (
            <div className="taxonomy-detail">
              <div className="taxonomy-detail-header">
                <div className="taxonomy-detail-title">
                  <span className="taxonomy-detail-icon">
                    {getTypeIcon(selectedTaxonomy)}
                  </span>
                  <div>
                    <h2>{selectedTaxonomy.displayName}</h2>
                    {selectedTaxonomy.description && (
                      <p className="taxonomy-detail-description">
                        {selectedTaxonomy.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="taxonomy-detail-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleEdit(selectedTaxonomy)}
                  >
                    Edit Taxonomy
                  </button>
                </div>
              </div>

              <TermTree
                taxonomyId={selectedTaxonomy._id}
                isHierarchical={selectedTaxonomy.isHierarchical}
                allowInlineCreation={selectedTaxonomy.allowInlineCreation}
              />
            </div>
          ) : (
            <div className="taxonomy-detail-empty">
              <p>Select a taxonomy to view and manage its terms</p>
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <TaxonomyEditor
          taxonomy={editingTaxonomy}
          onSave={handleSaveComplete}
          onCancel={() => {
            setShowCreateModal(false);
            setEditingTaxonomy(null);
          }}
        />
      )}

      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowDeleteConfirm(null);
            setDeleteError(null);
          }}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Taxonomy</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setShowDeleteConfirm(null);
                  setDeleteError(null);
                }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete this taxonomy? All associated terms
                will also be deleted.
              </p>
              {deleteError && (
                <div className="modal-error" role="alert">
                  {deleteError}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowDeleteConfirm(null);
                  setDeleteError(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleDelete(showDeleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
